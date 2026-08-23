-- Adds the "Minimum Hole Diameter in Design" post. Its content field holds
-- a plain-text summary only — the actual post renders from a self-contained
-- HTML file (public/blog-source/) via a dedicated route, not this column.
insert into public.blog_posts (title, slug, excerpt, content, category, is_published, published_at)
values
  (
    'Minimum Hole Diameter in Design: A Senior Engineer''s Guide for Every CAD Fresher',
    'minimum-hole-diameter-design-guide',
    'This guide walks through what actually decides minimum hole diameter, why small holes fail in manufacturing, and how to design holes that survive contact with reality — not just the CAD screen.',
    'This guide walks through what actually decides minimum hole diameter, why small holes fail in manufacturing, and how to design holes that survive contact with reality — not just the CAD screen.',
    'Design Fundamentals',
    true,
    now()
  )
on conflict (slug) do nothing;
