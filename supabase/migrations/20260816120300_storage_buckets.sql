-- Storage layout (SPEC.md Sections 34 & 35).
--
--   course-images / category-images / blog-images  — public, admin-write.
--     Used for course.image, category.image, blog_posts.featured_image, and
--     downloads.thumbnail, so these paths never need to be hardcoded in React.
--
--   downloads-public     — public bucket for downloads.requires_login = false.
--   downloads-protected  — private bucket for downloads.requires_login = true.
--     No select policy is defined for downloads-protected below, so the
--     anon/authenticated roles cannot read it and cannot mint signed URLs for
--     it themselves. Signed URLs for protected files are issued only by a
--     server-side function using the service-role key, after it verifies
--     auth and records the download (Section 35 steps 1-4) — built in the
--     Downloads phase.

insert into storage.buckets (id, name, public)
values
  ('course-images', 'course-images', true),
  ('category-images', 'category-images', true),
  ('blog-images', 'blog-images', true),
  ('downloads-public', 'downloads-public', true),
  ('downloads-protected', 'downloads-protected', false)
on conflict (id) do nothing;

create policy "course_images_public_read"
  on storage.objects for select
  using (bucket_id = 'course-images');

create policy "course_images_admin_write"
  on storage.objects for all
  using (bucket_id = 'course-images' and public.is_admin())
  with check (bucket_id = 'course-images' and public.is_admin());

create policy "category_images_public_read"
  on storage.objects for select
  using (bucket_id = 'category-images');

create policy "category_images_admin_write"
  on storage.objects for all
  using (bucket_id = 'category-images' and public.is_admin())
  with check (bucket_id = 'category-images' and public.is_admin());

create policy "blog_images_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "blog_images_admin_write"
  on storage.objects for all
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

create policy "downloads_public_bucket_read"
  on storage.objects for select
  using (bucket_id = 'downloads-public');

create policy "downloads_public_bucket_admin_write"
  on storage.objects for all
  using (bucket_id = 'downloads-public' and public.is_admin())
  with check (bucket_id = 'downloads-public' and public.is_admin());

-- downloads-protected: admins can manage files through the dashboard/admin
-- UI; everyone else is only ever handed a short-lived signed URL.
create policy "downloads_protected_bucket_admin_write"
  on storage.objects for all
  using (bucket_id = 'downloads-protected' and public.is_admin())
  with check (bucket_id = 'downloads-protected' and public.is_admin());
