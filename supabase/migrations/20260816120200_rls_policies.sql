-- Row Level Security (SPEC.md Section 21). New tables created in the public
-- schema already inherit Supabase's default grants to anon/authenticated —
-- RLS below is the actual access-control layer.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_skills enable row level security;
alter table public.course_registrations enable row level security;
alter table public.downloads enable row level security;
alter table public.download_logs enable row level security;
alter table public.blog_posts enable row level security;
alter table public.contact_messages enable row level security;

-- profiles: users see/edit only their own row; admins see/edit all.
-- No insert policy — rows are created solely by the on_auth_user_created
-- trigger (security definer, bypasses RLS). No delete policy — profiles are
-- never deleted directly by clients.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- categories: public reads active categories; only admins write.
create policy "categories_select_active_or_admin"
  on public.categories for select
  using (is_active = true or public.is_admin());

create policy "categories_admin_insert"
  on public.categories for insert
  with check (public.is_admin());

create policy "categories_admin_update"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_admin_delete"
  on public.categories for delete
  using (public.is_admin());

-- courses: public reads published courses; only admins write.
create policy "courses_select_published_or_admin"
  on public.courses for select
  using (is_published = true or public.is_admin());

create policy "courses_admin_insert"
  on public.courses for insert
  with check (public.is_admin());

create policy "courses_admin_update"
  on public.courses for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "courses_admin_delete"
  on public.courses for delete
  using (public.is_admin());

-- course_modules: visible when the parent course is published; admin-only writes.
create policy "course_modules_select_published_or_admin"
  on public.course_modules for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.is_published = true
    )
  );

create policy "course_modules_admin_insert"
  on public.course_modules for insert
  with check (public.is_admin());

create policy "course_modules_admin_update"
  on public.course_modules for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_modules_admin_delete"
  on public.course_modules for delete
  using (public.is_admin());

-- course_skills: same visibility rule as course_modules.
create policy "course_skills_select_published_or_admin"
  on public.course_skills for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_skills.course_id and c.is_published = true
    )
  );

create policy "course_skills_admin_insert"
  on public.course_skills for insert
  with check (public.is_admin());

create policy "course_skills_admin_update"
  on public.course_skills for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_skills_admin_delete"
  on public.course_skills for delete
  using (public.is_admin());

-- course_registrations: users register themselves and see only their own
-- registrations; only admins change status or remove a registration.
create policy "course_registrations_select_own_or_admin"
  on public.course_registrations for select
  using (user_id = auth.uid() or public.is_admin());

create policy "course_registrations_insert_own"
  on public.course_registrations for insert
  with check (user_id = auth.uid());

create policy "course_registrations_admin_update"
  on public.course_registrations for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_registrations_admin_delete"
  on public.course_registrations for delete
  using (public.is_admin());

-- downloads: public reads published resources' metadata (login is only
-- required at actual file-fetch time, per Section 12); only admins write.
create policy "downloads_select_published_or_admin"
  on public.downloads for select
  using (is_published = true or public.is_admin());

create policy "downloads_admin_insert"
  on public.downloads for insert
  with check (public.is_admin());

create policy "downloads_admin_update"
  on public.downloads for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "downloads_admin_delete"
  on public.downloads for delete
  using (public.is_admin());

-- download_logs: users log/view only their own downloads; logs are
-- immutable (no update/delete policy).
create policy "download_logs_select_own_or_admin"
  on public.download_logs for select
  using (user_id = auth.uid() or public.is_admin());

create policy "download_logs_insert_own"
  on public.download_logs for insert
  with check (user_id = auth.uid());

-- blog_posts: public reads published posts; only admins write.
create policy "blog_posts_select_published_or_admin"
  on public.blog_posts for select
  using (is_published = true or public.is_admin());

create policy "blog_posts_admin_insert"
  on public.blog_posts for insert
  with check (public.is_admin());

create policy "blog_posts_admin_update"
  on public.blog_posts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "blog_posts_admin_delete"
  on public.blog_posts for delete
  using (public.is_admin());

-- contact_messages: anyone (including anonymous visitors, Section 22) can
-- submit; only admins can read or clear them.
create policy "contact_messages_insert_anyone"
  on public.contact_messages for insert
  with check (true);

create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (public.is_admin());

create policy "contact_messages_admin_delete"
  on public.contact_messages for delete
  using (public.is_admin());
