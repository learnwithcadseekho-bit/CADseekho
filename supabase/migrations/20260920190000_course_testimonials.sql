-- Per-course testimonials (student name, optional photo, quote), admin-
-- managed. Same visibility rule as course_modules/course_skills/course_faqs.

create table public.course_testimonials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_name text not null,
  student_photo text,
  testimonial text not null,
  order_number int not null,
  unique (course_id, order_number)
);

create index course_testimonials_course_id_idx on public.course_testimonials (course_id);

alter table public.course_testimonials enable row level security;

create policy "course_testimonials_select_published_or_admin"
  on public.course_testimonials for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_testimonials.course_id and c.is_published = true
    )
  );

create policy "course_testimonials_admin_insert"
  on public.course_testimonials for insert
  with check (public.is_admin());

create policy "course_testimonials_admin_update"
  on public.course_testimonials for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_testimonials_admin_delete"
  on public.course_testimonials for delete
  using (public.is_admin());

-- Storage: public bucket for testimonial photos, admin-write only — same
-- pattern as course-images/category-images/blog-images.
insert into storage.buckets (id, name, public)
values ('testimonial-photos', 'testimonial-photos', true)
on conflict (id) do nothing;

create policy "testimonial_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'testimonial-photos');

create policy "testimonial_photos_admin_write"
  on storage.objects for all
  using (bucket_id = 'testimonial-photos' and public.is_admin())
  with check (bucket_id = 'testimonial-photos' and public.is_admin());
