-- Lets a blog post render from a self-contained, admin-uploaded HTML file
-- (stored in the blog-html bucket) instead of the sanitized rich-content
-- pipeline, so its own custom design survives untouched.
alter table public.blog_posts add column if not exists custom_html_url text;

insert into storage.buckets (id, name, public)
values ('blog-html', 'blog-html', true)
on conflict (id) do nothing;

create policy "blog_html_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-html');

create policy "blog_html_admin_write"
  on storage.objects for all
  using (bucket_id = 'blog-html' and public.is_admin())
  with check (bucket_id = 'blog-html' and public.is_admin());
