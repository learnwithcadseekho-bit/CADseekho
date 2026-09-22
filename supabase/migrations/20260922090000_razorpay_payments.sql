-- Razorpay checkout for priced courses. The flow is:
--   1. create-razorpay-order (Edge Function) reads courses.price server-side,
--      creates a Razorpay order and inserts a 'created' row here.
--   2. The browser opens Razorpay Checkout for that order_id — it never
--      chooses the amount.
--   3. razorpay-webhook (signature-verified) and verify-razorpay-payment
--      (checkout handler signature, for instant UX) both call
--      mark_payment_paid(), which is idempotent: whichever arrives second is
--      a no-op.
--
-- Payments are written only by the service role (Edge Functions). Users can
-- read their own rows; there are deliberately no insert/update policies.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  -- In paise, copied from courses.price at order time so a later price
  -- change can't make an in-flight order look mismatched.
  amount integer not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payments_user_id_idx on public.payments (user_id);
create index payments_course_id_idx on public.payments (course_id);

alter table public.payments enable row level security;

create policy "payments_select_own_or_admin"
  on public.payments for select
  using (user_id = auth.uid() or public.is_admin());

-- Marks an order paid and enrolls the buyer, exactly once. The row lock
-- serializes a webhook and a checkout-handler verify racing on the same
-- order; a repeat call returns 'already_paid' without touching anything.
-- p_amount (paise) is checked when the caller knows it (the webhook does).
create or replace function public.mark_payment_paid(
  p_order_id text,
  p_payment_id text,
  p_amount integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment
  from public.payments
  where razorpay_order_id = p_order_id
  for update;

  if not found then
    return 'unknown_order';
  end if;

  if v_payment.status = 'paid' then
    return 'already_paid';
  end if;

  if p_amount is not null and p_amount <> v_payment.amount then
    return 'amount_mismatch';
  end if;

  update public.payments
  set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
  where id = v_payment.id;

  insert into public.course_registrations (user_id, course_id, status)
  values (v_payment.user_id, v_payment.course_id, 'enrolled')
  on conflict (user_id, course_id) do update set status = 'enrolled';

  return 'paid';
end;
$$;

-- Service role only — a signed-in user calling this over PostgREST could
-- otherwise enroll themselves against any unpaid order they created.
revoke all on function public.mark_payment_paid(text, text, integer) from public, anon, authenticated;

-- Notification emails now also fire when a registration becomes 'enrolled'
-- (a paid checkout converting an existing registration, or an admin
-- confirming one), and pass the status so notify-registration can send
-- "you're enrolled" instead of "we'll contact you about payment".
create or replace function public.notify_course_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://ylxeohdekloednkmlygv.supabase.co/functions/v1/notify-registration',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlseGVvaGRla2xvZWRua21seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTMzMDAsImV4cCI6MjEwMjM4OTMwMH0.9LSMGvNZHToKM6CnuOvyP6URhsUsu7kLoVSyHu3GsiQ'
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', 'course_registrations',
      'record', jsonb_build_object(
        'id', new.id,
        'user_id', new.user_id,
        'course_id', new.course_id,
        'status', new.status
      )
    )
  );
  return new;
end;
$$;

create trigger on_course_registration_enrolled_notify
  after update of status on public.course_registrations
  for each row
  when (new.status = 'enrolled' and old.status is distinct from 'enrolled')
  execute function public.notify_course_registration();
