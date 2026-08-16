-- Shared updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create trigger set_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- Admin check used throughout RLS policies. security definer + a fixed
-- search_path lets it read profiles.role without recursing back through the
-- profiles RLS policy that itself calls is_admin().
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row from the signup fields passed in
-- supabase.auth.signUp({ options: { data: { ... } } }) (Section 15).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, user_type, experience, interested_courses)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'user_type', 'other'),
    new.raw_user_meta_data ->> 'experience',
    coalesce(
      (
        select array_agg(value::text)
        from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'interested_courses', '[]'::jsonb))
      ),
      '{}'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A user could otherwise grant themselves admin via a normal profile update
-- (Section 21: normal users must never reach admin data). Only an existing
-- admin may change the role column.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change role.';
  end if;
  return new;
end;
$$;

create trigger guard_profiles_role
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Keep downloads.download_count in sync with download_logs regardless of
-- which client path recorded the download.
create or replace function public.increment_download_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.downloads
  set download_count = download_count + 1
  where id = new.download_id;
  return new;
end;
$$;

create trigger on_download_logged
  after insert on public.download_logs
  for each row execute function public.increment_download_count();
