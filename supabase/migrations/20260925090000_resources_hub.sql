-- Resources hub: a searchable, filterable catalogue of calculators, cheat
-- sheets, tutorials, solved problems, etc. across every CAD/CAE tool.
--
-- Every resource is one row in public.resources; pages are rendered from
-- rows by one template, never hand-built per resource.
--
-- Access model:
--   free     — everything is public.
--   partial  — resources.body (free part) is public; the locked part lives
--              in public.resource_premium.
--   paid     — only the summary is public; everything else lives in
--              public.resource_premium.
-- resource_premium is readable only when has_entitlement() passes, so locked
-- content never reaches a non-entitled browser — it isn't in the JS bundle
-- and RLS refuses the row. The resource-premium Edge Function wraps that
-- read to return a clean 403 + CTA.
--
-- Entitlement keys (resources.required_entitlement):
--   'member'         — the user has at least one course in 'enrolled' status
--                      (Razorpay-paid or admin-confirmed). Default for all
--                      partial/paid resources.
--   'course:<slug>'  — enrolled in that specific course.
--   anything else    — an explicit row in public.user_entitlements (e.g. a
--                      future 'pack:scf-calculators' purchase).
-- A user_entitlements row with the same key also grants any of the above,
-- so an admin can hand out membership manually.

create extension if not exists pg_trgm with schema extensions;

create type public.resource_type as enum
  ('calculator', 'cheat_sheet', 'tutorial', 'solved_problem', 'practice_model', 'interview_qa', 'guide');
create type public.resource_level as enum ('beginner', 'intermediate', 'advanced');
create type public.resource_access as enum ('free', 'partial', 'paid');
create type public.resource_status as enum ('draft', 'published');
create type public.resource_relation as enum ('same_topic_other_software', 'next_level', 'prerequisite');
create type public.resource_event_type as enum ('view', 'calculate', 'unlock_click', 'download');

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

create table public.software (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- Compact label for card badges ("SW", "ANSYS") — text, not vendor logos.
  short_name text not null,
  description text,
  -- The matching paid course/category, linked from the software landing page.
  course_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Which tools a topic applies to. A topic is one row shared by every tool,
-- never duplicated per tool.
create table public.topic_software (
  topic_id uuid not null references public.topics (id) on delete cascade,
  software_id uuid not null references public.software (id) on delete cascade,
  primary key (topic_id, software_id)
);

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  -- Flat, permanent URL: /resources/<slug>. Never change it once published.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  -- Free content, sanitized HTML (same pipeline as blog_posts.content).
  body text not null default '',
  type public.resource_type not null,
  level public.resource_level not null default 'beginner',
  access public.resource_access not null default 'free',
  required_entitlement text,
  -- Frontend component to mount for interactive resources (src/calculators/registry.ts).
  component_key text,
  -- Free, non-secret config handed to that component (e.g. teaser text).
  component_props jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  -- Storage path in the private resource-files bucket. Never a public URL:
  -- files are handed out only as short-lived signed URLs.
  file_path text,
  course_cta jsonb check (course_cta is null or (course_cta ? 'label' and course_cta ? 'url')),
  status public.resource_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Denormalized software/topic names + type label, kept current by
  -- triggers below, so tag names are searchable from the generated vector.
  tag_text text not null default '',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(tag_text, '')), 'B') ||
    setweight(to_tsvector('english', regexp_replace(coalesce(body, ''), '<[^>]+>', ' ', 'g')), 'D')
  ) stored,
  constraint resources_locked_needs_entitlement
    check (access = 'free' or required_entitlement is not null)
);

create index resources_status_published_at_idx on public.resources (status, published_at desc);
create index resources_search_vector_idx on public.resources using gin (search_vector);
create index resources_title_trgm_idx on public.resources using gin (title extensions.gin_trgm_ops);

create table public.resource_software (
  resource_id uuid not null references public.resources (id) on delete cascade,
  software_id uuid not null references public.software (id) on delete cascade,
  primary key (resource_id, software_id)
);
create index resource_software_software_id_idx on public.resource_software (software_id);

create table public.resource_topics (
  resource_id uuid not null references public.resources (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (resource_id, topic_id)
);
create index resource_topics_topic_id_idx on public.resource_topics (topic_id);

-- Directed edges, read as "<resource> —relation→ <related>":
--   same_topic_other_software  shown on both ends (e.g. hand calc ↔ ANSYS tutorial)
--   next_level                 related is the next step up from resource
--   prerequisite               related should be done before resource
create table public.resource_related (
  resource_id uuid not null references public.resources (id) on delete cascade,
  related_id uuid not null references public.resources (id) on delete cascade,
  relation public.resource_relation not null,
  primary key (resource_id, related_id, relation),
  check (resource_id <> related_id)
);
create index resource_related_related_id_idx on public.resource_related (related_id);

-- Locked content. One row per partial/paid resource; payload shape is up to
-- the resource (calculators: hand-calc step templates, chart specs,
-- validation guide; articles: { "html": "..." }).
create table public.resource_premium (
  resource_id uuid primary key references public.resources (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Learning paths ("Start here" tiles)
-- ---------------------------------------------------------------------------

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  software_id uuid references public.software (id) on delete set null,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.learning_path_items (
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  position int not null,
  primary key (path_id, resource_id),
  unique (path_id, position)
);

-- ---------------------------------------------------------------------------
-- Entitlements, analytics, search synonyms
-- ---------------------------------------------------------------------------

create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null,
  source text not null default 'admin',
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, entitlement)
);

create table public.resource_events (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event public.resource_event_type not null,
  created_at timestamptz not null default now()
);
create index resource_events_resource_created_idx on public.resource_events (resource_id, created_at desc);
create index resource_events_created_idx on public.resource_events (created_at desc);

-- Each row is one group of interchangeable terms. A query containing any
-- term matches resources containing any term in its group.
create table public.search_synonym_groups (
  id uuid primary key default gen_random_uuid(),
  terms text[] not null check (cardinality(terms) >= 2)
);

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

create trigger set_resources_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

create trigger set_resource_premium_updated_at
  before update on public.resource_premium
  for each row execute function public.set_updated_at();

-- Does the *calling* user hold this entitlement? Deliberately takes no user
-- id, so nobody can probe another user's purchases through it.
create or replace function public.has_entitlement(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null
    and p_key is not null
    and (
      exists (
        select 1 from public.user_entitlements ue
        where ue.user_id = auth.uid()
          and ue.entitlement = p_key
          and (ue.expires_at is null or ue.expires_at > now())
      )
      or (p_key = 'member' and exists (
        select 1 from public.course_registrations cr
        where cr.user_id = auth.uid() and cr.status = 'enrolled'
      ))
      or (p_key like 'course:%' and exists (
        select 1 from public.course_registrations cr
        join public.courses c on c.id = cr.course_id
        where cr.user_id = auth.uid() and cr.status = 'enrolled'
          and c.slug = substr(p_key, 8)
      ))
    );
$$;

create or replace function public.resource_tag_text(p_resource_id uuid, p_type public.resource_type)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select concat_ws(' ',
    replace(p_type::text, '_', ' '),
    (select string_agg(s.name || ' ' || s.short_name, ' ')
       from public.resource_software rs join public.software s on s.id = rs.software_id
       where rs.resource_id = p_resource_id),
    (select string_agg(t.name, ' ')
       from public.resource_topics rt join public.topics t on t.id = rt.topic_id
       where rt.resource_id = p_resource_id)
  );
$$;

create or replace function public.resources_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tag_text := public.resource_tag_text(new.id, new.type);
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger resources_before_write
  before insert or update on public.resources
  for each row execute function public.resources_before_write();

-- Tag links changed → recompute that resource's tag_text (the before-write
-- trigger does the actual work).
create or replace function public.touch_resource_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.resources set tag_text = ''
  where id = coalesce(new.resource_id, old.resource_id);
  return null;
end;
$$;

create trigger resource_software_touch_tags
  after insert or delete on public.resource_software
  for each row execute function public.touch_resource_tags();

create trigger resource_topics_touch_tags
  after insert or delete on public.resource_topics
  for each row execute function public.touch_resource_tags();

-- A renamed software/topic → recompute every resource tagged with it.
create or replace function public.touch_resources_for_tag_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'software' then
    update public.resources set tag_text = ''
    where id in (select resource_id from public.resource_software where software_id = new.id);
  else
    update public.resources set tag_text = ''
    where id in (select resource_id from public.resource_topics where topic_id = new.id);
  end if;
  return null;
end;
$$;

create trigger software_rename_touch_resources
  after update of name, short_name on public.software
  for each row execute function public.touch_resources_for_tag_rename();

create trigger topics_rename_touch_resources
  after update of name on public.topics
  for each row execute function public.touch_resources_for_tag_rename();

-- ---------------------------------------------------------------------------
-- Read model: one card row per resource
-- ---------------------------------------------------------------------------

-- security_invoker: RLS on resources applies, so anon only sees published.
create view public.resource_cards with (security_invoker = true) as
select
  r.id, r.slug, r.title, r.summary, r.type, r.level, r.access, r.status,
  r.component_key, r.thumbnail_url, r.published_at, r.updated_at,
  coalesce((
    select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'short_name', s.short_name)
                     order by s.sort_order, s.name)
    from public.resource_software rs join public.software s on s.id = rs.software_id
    where rs.resource_id = r.id
  ), '[]'::jsonb) as software,
  coalesce((
    select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) order by t.sort_order, t.name)
    from public.resource_topics rt join public.topics t on t.id = rt.topic_id
    where rt.resource_id = r.id
  ), '[]'::jsonb) as topics
from public.resources r;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- Turns a free-text query into a tsquery:
--   * synonym groups: any term found in the query is replaced by an OR of
--     every term in its group ("scf" → scf | stress<->concentration | kt …)
--   * remaining words become prefix matches ANDed together ("buck" → buck:*)
create or replace function public.resource_search_query(p_q text)
returns tsquery
language plpgsql
stable
set search_path = public
as $$
declare
  v_rest text := ' ' || lower(coalesce(p_q, '')) || ' ';
  v_query tsquery := ''::tsquery;
  v_group_query tsquery;
  v_group record;
  v_term text;
  v_pattern text;
  v_hit boolean;
  v_word text;
begin
  for v_group in select terms from public.search_synonym_groups loop
    v_hit := false;
    -- Longest terms first so "stress concentration factor" is consumed
    -- before "stress concentration".
    for v_term in select t from unnest(v_group.terms) t order by length(t) desc loop
      v_pattern := '(^|[^a-z0-9&])'
        || regexp_replace(lower(v_term), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g')
        || '(?=$|[^a-z0-9&])';
      if v_rest ~ v_pattern then
        v_hit := true;
        v_rest := regexp_replace(v_rest, v_pattern, '\1 ', 'g');
      end if;
    end loop;

    if v_hit then
      v_group_query := ''::tsquery;
      foreach v_term in array v_group.terms loop
        if lower(v_term) ~ '^[a-z0-9]+$' then
          v_group_query := v_group_query || to_tsquery('english', lower(v_term) || ':*');
        else
          v_group_query := v_group_query || phraseto_tsquery('english', v_term);
        end if;
      end loop;
      v_query := v_query && v_group_query;
    end if;
  end loop;

  foreach v_word in array regexp_split_to_array(trim(regexp_replace(v_rest, '[^a-z0-9]+', ' ', 'g')), ' ') loop
    if v_word <> '' then
      v_query := v_query && to_tsquery('english', v_word || ':*');
    end if;
  end loop;

  return v_query;
end;
$$;

-- Hub/landing/topic/type search. Filters AND across dimensions and OR
-- within one; null or empty arrays mean "no filter". Only published rows.
-- Ranked by full-text relevance, with a trigram fallback so typos
-- ("bukling") still find something.
create or replace function public.search_resources(
  p_q text default null,
  p_software text[] default null,
  p_topics text[] default null,
  p_types text[] default null,
  p_levels text[] default null,
  p_access text[] default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, summary text,
  type public.resource_type, level public.resource_level, access public.resource_access,
  component_key text, thumbnail_url text, published_at timestamptz,
  software jsonb, topics jsonb,
  rank real, total_count bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select
      lower(trim(coalesce(p_q, ''))) as raw,
      public.resource_search_query(p_q) as tsq
  ),
  matched as (
    select
      c.*,
      (case when numnode(q.tsq) > 0 then ts_rank_cd(r.search_vector, q.tsq) else 0 end
        + case when length(q.raw) >= 4
            then 0.3 * extensions.word_similarity(q.raw, r.title || ' ' || r.tag_text) else 0 end
      )::real as rank
    from public.resources r
    join public.resource_cards c on c.id = r.id
    cross join q
    where r.status = 'published'
      and (
        q.raw = ''
        or (numnode(q.tsq) > 0 and r.search_vector @@ q.tsq)
        or (length(q.raw) >= 4 and extensions.word_similarity(q.raw, r.title || ' ' || r.tag_text) >= 0.5)
      )
      and (coalesce(cardinality(p_software), 0) = 0 or exists (
        select 1 from public.resource_software rs join public.software s on s.id = rs.software_id
        where rs.resource_id = r.id and s.slug = any (p_software)))
      and (coalesce(cardinality(p_topics), 0) = 0 or exists (
        select 1 from public.resource_topics rt join public.topics t on t.id = rt.topic_id
        where rt.resource_id = r.id and t.slug = any (p_topics)))
      and (coalesce(cardinality(p_types), 0) = 0 or r.type::text = any (p_types))
      and (coalesce(cardinality(p_levels), 0) = 0 or r.level::text = any (p_levels))
      and (coalesce(cardinality(p_access), 0) = 0 or r.access::text = any (p_access))
  )
  select
    m.id, m.slug, m.title, m.summary, m.type, m.level, m.access,
    m.component_key, m.thumbnail_url, m.published_at, m.software, m.topics,
    m.rank, count(*) over () as total_count
  from matched m
  order by m.rank desc, m.published_at desc nulls last, m.title
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- "Most used" row: view + calculate events over the last p_days.
-- security definer because resource_events isn't publicly readable; it
-- only ever exposes aggregate counts for published resources.
create or replace function public.most_used_resources(
  p_software text default null,
  p_days int default 30,
  p_limit int default 8
)
returns table (
  id uuid, slug text, title text, summary text,
  type public.resource_type, level public.resource_level, access public.resource_access,
  component_key text, thumbnail_url text, published_at timestamptz,
  software jsonb, topics jsonb, uses bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.slug, c.title, c.summary, c.type, c.level, c.access,
    c.component_key, c.thumbnail_url, c.published_at, c.software, c.topics, u.uses
  from (
    select e.resource_id, count(*) as uses
    from public.resource_events e
    where e.event in ('view', 'calculate')
      and e.created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    group by e.resource_id
  ) u
  join public.resource_cards c on c.id = u.resource_id
  where c.status = 'published'
    and (p_software is null or exists (
      select 1 from public.resource_software rs join public.software s on s.id = rs.software_id
      where rs.resource_id = c.id and s.slug = p_software))
  order by u.uses desc, c.title
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.software enable row level security;
alter table public.topics enable row level security;
alter table public.topic_software enable row level security;
alter table public.resources enable row level security;
alter table public.resource_software enable row level security;
alter table public.resource_topics enable row level security;
alter table public.resource_related enable row level security;
alter table public.resource_premium enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_items enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.resource_events enable row level security;
alter table public.search_synonym_groups enable row level security;

-- Taxonomy + synonyms: public read, admin write.
create policy "software_select_all" on public.software for select using (true);
create policy "software_admin_write" on public.software for all
  using (public.is_admin()) with check (public.is_admin());

create policy "topics_select_all" on public.topics for select using (true);
create policy "topics_admin_write" on public.topics for all
  using (public.is_admin()) with check (public.is_admin());

create policy "topic_software_select_all" on public.topic_software for select using (true);
create policy "topic_software_admin_write" on public.topic_software for all
  using (public.is_admin()) with check (public.is_admin());

create policy "search_synonym_groups_select_all" on public.search_synonym_groups for select using (true);
create policy "search_synonym_groups_admin_write" on public.search_synonym_groups for all
  using (public.is_admin()) with check (public.is_admin());

-- resources: public reads published; admins read/write everything.
create policy "resources_select_published_or_admin" on public.resources for select
  using (status = 'published' or public.is_admin());
create policy "resources_admin_write" on public.resources for all
  using (public.is_admin()) with check (public.is_admin());

-- Link tables: visible when the linked resource(s) are visible. The
-- subqueries go through resources' own RLS, so drafts stay hidden.
create policy "resource_software_select_visible" on public.resource_software for select
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "resource_software_admin_write" on public.resource_software for all
  using (public.is_admin()) with check (public.is_admin());

create policy "resource_topics_select_visible" on public.resource_topics for select
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "resource_topics_admin_write" on public.resource_topics for all
  using (public.is_admin()) with check (public.is_admin());

create policy "resource_related_select_visible" on public.resource_related for select
  using (
    exists (select 1 from public.resources r where r.id = resource_id)
    and exists (select 1 from public.resources r where r.id = related_id)
  );
create policy "resource_related_admin_write" on public.resource_related for all
  using (public.is_admin()) with check (public.is_admin());

-- resource_premium: the locked content. Readable only by entitled users
-- (or admins). No anon/authenticated write policy at all.
create policy "resource_premium_select_entitled_or_admin" on public.resource_premium for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.resources r
      where r.id = resource_id
        and r.status = 'published'
        and (r.access = 'free' or public.has_entitlement(r.required_entitlement))
    )
  );
create policy "resource_premium_admin_write" on public.resource_premium for all
  using (public.is_admin()) with check (public.is_admin());

create policy "learning_paths_select_published_or_admin" on public.learning_paths for select
  using (is_published = true or public.is_admin());
create policy "learning_paths_admin_write" on public.learning_paths for all
  using (public.is_admin()) with check (public.is_admin());

create policy "learning_path_items_select_visible" on public.learning_path_items for select
  using (
    exists (select 1 from public.learning_paths p where p.id = path_id)
    and exists (select 1 from public.resources r where r.id = resource_id)
  );
create policy "learning_path_items_admin_write" on public.learning_path_items for all
  using (public.is_admin()) with check (public.is_admin());

-- user_entitlements: users see their own; only admins grant/revoke.
create policy "user_entitlements_select_own_or_admin" on public.user_entitlements for select
  using (user_id = auth.uid() or public.is_admin());
create policy "user_entitlements_admin_write" on public.user_entitlements for all
  using (public.is_admin()) with check (public.is_admin());

-- resource_events: anyone may log an event against a published resource,
-- anonymously or as themselves (never as someone else). Only admins read.
create policy "resource_events_insert_anyone" on public.resource_events for insert
  with check (
    (user_id is null or user_id = auth.uid())
    and exists (select 1 from public.resources r where r.id = resource_id and r.status = 'published')
  );
create policy "resource_events_admin_select" on public.resource_events for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
--   resource-thumbnails — public, admin-write (card/OG images).
--   resource-files      — private. Like downloads-protected, there is no
--     select policy: files are handed out only as short-lived signed URLs
--     minted server-side after an entitlement check.

insert into storage.buckets (id, name, public)
values
  ('resource-thumbnails', 'resource-thumbnails', true),
  ('resource-files', 'resource-files', false)
on conflict (id) do nothing;

create policy "resource_thumbnails_public_read"
  on storage.objects for select
  using (bucket_id = 'resource-thumbnails');

create policy "resource_thumbnails_admin_write"
  on storage.objects for all
  using (bucket_id = 'resource-thumbnails' and public.is_admin())
  with check (bucket_id = 'resource-thumbnails' and public.is_admin());

create policy "resource_files_admin_write"
  on storage.objects for all
  using (bucket_id = 'resource-files' and public.is_admin())
  with check (bucket_id = 'resource-files' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: taxonomy + synonyms (reference data the app needs in every env)
-- ---------------------------------------------------------------------------

insert into public.software (slug, name, short_name, description, course_url, sort_order)
values
  ('solidworks', 'SolidWorks', 'SW', 'Part modeling, assemblies, drawings and sheet metal in SolidWorks.', '/courses/category/solidworks', 10),
  ('creo', 'Creo', 'Creo', 'Parametric modeling and mechanisms in PTC Creo.', '/courses/category/creo', 20),
  ('catia', 'CATIA', 'CATIA', 'Part design, surfacing and assemblies in CATIA V5.', null, 30),
  ('nx', 'NX', 'NX', 'Modeling and drafting in Siemens NX.', null, 40),
  ('ansys', 'ANSYS', 'ANSYS', 'Structural and thermal simulation in ANSYS Workbench.', '/courses/category/ansys', 50),
  ('solidworks-simulation', 'SolidWorks Simulation', 'SW Sim', 'FEA inside SolidWorks: static, buckling, thermal and fatigue studies.', '/courses/category/solidworks', 60),
  ('hypermesh', 'HyperMesh', 'HM', 'Pre-processing and meshing in Altair HyperMesh.', null, 70),
  ('creo-simulation', 'Creo Simulation', 'Creo Sim', 'Structural and thermal simulation in Creo Simulate.', '/courses/category/creo', 80),
  ('general', 'General', 'General', 'Hand calculations and engineering fundamentals — no software needed.', null, 90)
on conflict (slug) do nothing;

insert into public.topics (slug, name, sort_order)
values
  ('part-modeling', 'Part modeling', 10),
  ('assembly', 'Assembly', 20),
  ('drawings-gdt', 'Drawings & GD&T', 30),
  ('sheet-metal', 'Sheet metal', 40),
  ('surfacing', 'Surfacing', 50),
  ('meshing', 'Meshing', 60),
  ('stress-concentration', 'Stress concentration', 70),
  ('beams', 'Beams', 80),
  ('buckling', 'Buckling', 90),
  ('thermal', 'Thermal', 100),
  ('fatigue', 'Fatigue', 110),
  ('contact', 'Contact', 120),
  ('units-setup', 'Units & setup', 130),
  ('dfm', 'DFM', 140),
  ('fits-tolerances', 'Fits & tolerances', 150),
  ('materials', 'Materials', 160)
on conflict (slug) do nothing;

insert into public.topic_software (topic_id, software_id)
select t.id, s.id
from (values
  -- CAD tools
  ('solidworks', array['part-modeling','assembly','drawings-gdt','sheet-metal','surfacing','dfm','fits-tolerances','materials','units-setup']),
  ('creo',       array['part-modeling','assembly','drawings-gdt','sheet-metal','surfacing','dfm','fits-tolerances','materials','units-setup']),
  ('catia',      array['part-modeling','assembly','drawings-gdt','sheet-metal','surfacing','dfm','fits-tolerances','materials','units-setup']),
  ('nx',         array['part-modeling','assembly','drawings-gdt','sheet-metal','surfacing','dfm','fits-tolerances','materials','units-setup']),
  -- Simulation tools
  ('ansys',                 array['meshing','stress-concentration','beams','buckling','thermal','fatigue','contact','units-setup','materials']),
  ('solidworks-simulation', array['meshing','stress-concentration','beams','buckling','thermal','fatigue','contact','units-setup','materials']),
  ('hypermesh',             array['meshing','contact','units-setup','materials']),
  ('creo-simulation',       array['meshing','stress-concentration','beams','buckling','thermal','fatigue','contact','units-setup','materials']),
  -- Hand calcs / fundamentals
  ('general', array['stress-concentration','beams','buckling','thermal','fatigue','materials','fits-tolerances','drawings-gdt','dfm','units-setup'])
) as m (software_slug, topic_slugs)
join public.software s on s.slug = m.software_slug
cross join lateral unnest(m.topic_slugs) as ts (topic_slug)
join public.topics t on t.slug = ts.topic_slug
on conflict do nothing;

insert into public.search_synonym_groups (terms)
values
  (array['sw', 'solidworks']),
  (array['scf', 'kt', 'stress concentration', 'stress concentration factor']),
  (array['fea', 'fem', 'simulation', 'finite element']),
  (array['gd&t', 'gdt', 'geometric tolerancing', 'geometric dimensioning']),
  (array['hm', 'hypermesh']),
  (array['cheat sheet', 'cheatsheet']),
  (array['fos', 'factor of safety', 'safety factor']);
