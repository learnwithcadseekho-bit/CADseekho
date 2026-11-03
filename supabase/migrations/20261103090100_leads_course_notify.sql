-- "Notify me" leads from /courses/solidworks-simulation, stored in the same
-- leads table as the ANSYS demo bookings (same Edge Function, Turnstile,
-- rate limit, Sheet sync and admin alert — see submit-lead/lead.ts).
--
--   source   'sw-sim-notify' for these (demo bookings stay 'website')
--   interest which offer they want: level1 | level2 | combo | team
--   role     not asked on this form, so it may now be null
--
-- Dedupe is now per (phone, source): someone who booked the ANSYS demo and
-- then asks to be notified about SOLIDWORKS Simulation gets two leads, not
-- one overwritten lead.

alter table public.leads alter column role drop not null;
alter table public.leads
  add column interest text check (interest is null or interest in ('level1', 'level2', 'combo', 'team'));

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
  v_source text := coalesce(nullif(p_lead->>'source', ''), 'website');
  v_demo boolean := coalesce((p_lead->>'demo_booked')::boolean, true);
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

  -- Same phone + form twice at once → one lead, not two.
  perform pg_advisory_xact_lock(hashtext('lead_phone:' || v_source || ':' || v_phone));
  select id into v_id
  from public.leads
  where phone = v_phone and source = v_source and created_at > now() - interval '7 days'
  order by created_at desc
  limit 1
  for update;

  if found then
    -- Newer answers win; an optional field left blank this time keeps the old value.
    update public.leads set
      name = p_lead->>'name',
      email = coalesce(nullif(p_lead->>'email', ''), email),
      role = coalesce(nullif(p_lead->>'role', ''), role),
      interest = coalesce(nullif(p_lead->>'interest', ''), interest),
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
      demo_booked = demo_booked or v_demo,
      submissions = submissions + 1
    where id = v_id;
    return jsonb_build_object('result', 'updated', 'id', v_id);
  end if;

  insert into public.leads (
    name, phone, email, role, interest, org, city, cad, consent, consent_text,
    source, utm, gclid, fbclid, page, user_agent, demo_booked
  ) values (
    p_lead->>'name', v_phone, nullif(p_lead->>'email', ''), nullif(p_lead->>'role', ''), nullif(p_lead->>'interest', ''),
    nullif(p_lead->>'org', ''), nullif(p_lead->>'city', ''), v_cad, true, p_lead->>'consent_text',
    v_source, coalesce(p_lead->'utm', '{}'::jsonb),
    nullif(p_lead->>'gclid', ''), nullif(p_lead->>'fbclid', ''), p_lead->>'page', p_lead->>'user_agent', v_demo
  )
  returning id into v_id;
  return jsonb_build_object('result', 'created', 'id', v_id);
end;
$$;

revoke all on function public.submit_lead(jsonb, text, integer, interval) from public, anon, authenticated;
