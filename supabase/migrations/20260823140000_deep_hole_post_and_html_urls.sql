-- Points the existing minimum-hole-diameter post at its uploaded HTML file
-- (superseding the old public/blog-source/ + dedicated-route approach), and
-- adds the new deep-hole-drilling post, both served via the generic
-- custom_html_url renderer.
update public.blog_posts
set custom_html_url = 'https://ylxeohdekloednkmlygv.supabase.co/storage/v1/object/public/blog-html/minimum-hole-diameter-design-guide.html'
where slug = 'minimum-hole-diameter-design-guide';

insert into public.blog_posts (title, slug, excerpt, content, category, custom_html_url, is_published, published_at)
values
  (
    'Deep Hole Drilling: Design Rules, Minimum Diameter & Aspect Ratio Guide for Every Design Engineer',
    'deep-hole-drilling-design-guide',
    'A practical guide to deep hole drilling: depth-to-diameter aspect ratios, why deep holes need a different plan than standard drilling, and the design rules that keep them manufacturable.',
    'A practical guide to deep hole drilling: depth-to-diameter aspect ratios, why deep holes need a different plan than standard drilling, and the design rules that keep them manufacturable.',
    'Design Fundamentals',
    'https://ylxeohdekloednkmlygv.supabase.co/storage/v1/object/public/blog-html/deep-hole-drilling-design-guide.html',
    true,
    now()
  )
on conflict (slug) do nothing;
