-- Fires the notify-registration Edge Function whenever a row is inserted
-- into course_registrations, so the admin + student get an email without
-- anyone checking the admin panel. Uses pg_net (Supabase's built-in async
-- HTTP extension) instead of the dashboard's Database Webhooks UI, so the
-- whole setup stays in version control like every other trigger here.
--
-- The bearer token below is the public anon key (already shipped in the
-- client bundle via VITE_SUPABASE_ANON_KEY) — safe to embed here since it
-- carries no privilege beyond what RLS already allows.

create extension if not exists pg_net;

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
      'type', 'INSERT',
      'table', 'course_registrations',
      'record', jsonb_build_object(
        'id', new.id,
        'user_id', new.user_id,
        'course_id', new.course_id
      )
    )
  );
  return new;
end;
$$;

create trigger on_course_registration_notify
  after insert on public.course_registrations
  for each row execute function public.notify_course_registration();
