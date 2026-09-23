-- Per-chapter media on the course syllabus. Both are optional and
-- independent of each other:
--   image     — static picture (stress/deformation/mesh plot, CAD part). Also
--               used as the 3D viewer's poster while the model loads.
--   model3d   — .glb file for an interactive, rotatable 3D model.
--   media_alt — what the image/model shows, for screen readers and as the
--               fallback text if neither can load.
alter table public.course_modules
  add column image text,
  add column model3d text,
  add column media_alt text;

-- Storage: public bucket for .glb models, admin-write only — same pattern as
-- course-images/testimonial-photos. Capped at 20 MB; anything near that
-- should be Draco/meshopt compressed before upload anyway.
insert into storage.buckets (id, name, public, file_size_limit)
values ('course-models', 'course-models', true, 20971520)
on conflict (id) do nothing;

create policy "course_models_public_read"
  on storage.objects for select
  using (bucket_id = 'course-models');

create policy "course_models_admin_write"
  on storage.objects for all
  using (bucket_id = 'course-models' and public.is_admin())
  with check (bucket_id = 'course-models' and public.is_admin());
