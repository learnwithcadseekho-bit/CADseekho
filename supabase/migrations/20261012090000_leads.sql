-- Demo-class leads from the /ansys-foundation launch page.
--
-- Flow: the browser posts the demo form to the submit-lead Edge Function,
-- which checks Turnstile, the honeypot and every field, then calls
-- submit_lead() below with the service role. submit_lead() rate-limits per
-- IP and de-duplicates by phone (a repeat booking within 7 days updates the
-- existing lead instead of adding a row), atomically. The function then
-- syncs the row to the Google Sheet and alerts the admin.
--
-- Nothing but the service role writes new leads; admins read and update them
-- from /admin/leads.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  -- Normalised Indian mobile, +91 then 10 digits starting 6–9.
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('student', 'working_engineer', 'other')),
  org text,
  city text,
  cad text[] not null default '{}',
  consent boolean not null check (consent),
  -- The exact checkbox wording the person agreed to, and when (DPDP Act 2023).
  consent_text text not null,
  consent_at timestamptz not null default now(),
  source text not null default 'website',
  utm jsonb not null default '{}',
  gclid text,
  fbclid text,
  page text,
  user_agent text,
  -- How many times this phone has booked within the dedupe window.
  submissions integer not null default 1,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'interested', 'not_interested', 'paid')),
  demo_booked boolean not null default true,
  attended boolean not null default false,
  paid boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_phone_created_idx on public.leads (phone, created_at desc);
create index leads_created_idx on public.leads (created_at desc);
create index leads_email_idx on public.leads (lower(email)) where email is not null;

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

create policy "leads_admin_select" on public.leads for select using (public.is_admin());
create policy "leads_admin_update" on public.leads for update using (public.is_admin()) with check (public.is_admin());
create policy "leads_admin_delete" on public.leads for delete using (public.is_admin());

-- Rate-limit log: one row per accepted-for-processing submission, by a
-- salted hash of the IP (the raw IP is never stored). RLS on, no policies:
-- only the service role (through submit_lead) touches it.
create table public.lead_submissions (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index lead_submissions_ip_idx on public.lead_submissions (ip_hash, created_at desc);
alter table public.lead_submissions enable row level security;

-- Returns {"result": "created"|"updated"|"rate_limited", "id": uuid}.
-- p_lead holds already-validated fields (the Edge Function validates; the
-- table constraints are the backstop).
create or replace function public.submit_lead(
  p_lead jsonb,
  p_ip_hash text,
  p_max_per_window integer default 5,
  p_window interval default interval '10 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
  v_id uuid;
  v_phone text := p_lead->>'phone';
  v_cad text[] := coalesce(array(select jsonb_array_elements_text(p_lead->'cad')), '{}');
begin
  -- Serialise submissions from the same IP so the count can't be raced.
  perform pg_advisory_xact_lock(hashtext('lead_ip:' || p_ip_hash));
  select count(*) into v_recent
  from public.lead_submissions
  where ip_hash = p_ip_hash and created_at > now() - p_window;
  if v_recent >= p_max_per_window then
    return jsonb_build_object('result', 'rate_limited');
  end if;
  insert into public.lead_submissions (ip_hash) values (p_ip_hash);
  -- Keep the log small: nothing older than a day matters.
  delete from public.lead_submissions where created_at < now() - interval '1 day';

  -- Same phone twice at once → one lead, not two.
  perform pg_advisory_xact_lock(hashtext('lead_phone:' || v_phone));
  select id into v_id
  from public.leads
  where phone = v_phone and created_at > now() - interval '7 days'
  order by created_at desc
  limit 1
  for update;

  if found then
    -- Newer answers win; an optional field left blank this time keeps the old value.
    update public.leads set
      name = p_lead->>'name',
      email = coalesce(nullif(p_lead->>'email', ''), email),
      role = p_lead->>'role',
      org = coalesce(nullif(p_lead->>'org', ''), org),
      city = coalesce(nullif(p_lead->>'city', ''), city),
      cad = case when cardinality(v_cad) > 0 then v_cad else cad end,
      consent = true,
      consent_text = p_lead->>'consent_text',
      consent_at = now(),
      utm = case when p_lead->'utm' <> '{}'::jsonb then p_lead->'utm' else utm end,
      gclid = coalesce(nullif(p_lead->>'gclid', ''), gclid),
      fbclid = coalesce(nullif(p_lead->>'fbclid', ''), fbclid),
      page = p_lead->>'page',
      user_agent = p_lead->>'user_agent',
      demo_booked = true,
      submissions = submissions + 1
    where id = v_id;
    return jsonb_build_object('result', 'updated', 'id', v_id);
  end if;

  insert into public.leads (
    name, phone, email, role, org, city, cad, consent, consent_text,
    source, utm, gclid, fbclid, page, user_agent
  ) values (
    p_lead->>'name', v_phone, nullif(p_lead->>'email', ''), p_lead->>'role',
    nullif(p_lead->>'org', ''), nullif(p_lead->>'city', ''), v_cad, true, p_lead->>'consent_text',
    coalesce(nullif(p_lead->>'source', ''), 'website'), coalesce(p_lead->'utm', '{}'::jsonb),
    nullif(p_lead->>'gclid', ''), nullif(p_lead->>'fbclid', ''), p_lead->>'page', p_lead->>'user_agent'
  )
  returning id into v_id;
  return jsonb_build_object('result', 'created', 'id', v_id);
end;
$$;

-- Service role only.
revoke all on function public.submit_lead(jsonb, text, integer, interval) from public, anon, authenticated;

-- Razorpay link-up: when a payment becomes 'paid' (mark_payment_paid, from
-- the webhook or the checkout verify), mark the buyer's leads paid — matched
-- by the account's email, or by the last 10 digits of its phone.
create or replace function public.mark_leads_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone10 text;
begin
  select lower(email), nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10), '')
  into v_email, v_phone10
  from public.profiles
  where id = new.user_id;

  update public.leads
  set paid = true, status = 'paid'
  where not paid
    and ((v_email is not null and lower(email) = v_email)
      or (length(v_phone10) = 10 and right(phone, 10) = v_phone10));
  return new;
end;
$$;

create trigger on_payment_paid_mark_leads
  after update of status on public.payments
  for each row
  when (new.status = 'paid' and old.status is distinct from 'paid')
  execute function public.mark_leads_paid();
