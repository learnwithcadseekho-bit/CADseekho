-- CADseekho initial schema (SPEC.md Section 19), with two deliberate additions:
--   * profiles.role       — needed for admin gating (Sections 20/21), not listed in Section 19
--   * profiles.interested_courses — Section 15 collects this at signup; Section 19's
--     suggested profiles table omitted a column for it, so it's added here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  user_type text not null default 'other'
    check (user_type in ('student', 'engineer', 'working_professional', 'teacher', 'other')),
  experience text
    check (experience in ('fresher', '1-2_years', '3-5_years', '5+_years')),
  interested_courses text[] not null default '{}',
  role text not null default 'user'
    check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  software text,
  prerequisites text,
  image text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_category_id_idx on public.courses (category_id);
create index courses_is_published_idx on public.courses (is_published);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  order_number int not null,
  unique (course_id, order_number)
);

create index course_modules_course_id_idx on public.course_modules (course_id);

create table public.course_skills (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  skill_name text not null,
  unique (course_id, skill_name)
);

create index course_skills_course_id_idx on public.course_skills (course_id);

create table public.course_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'contacted', 'enrolled', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index course_registrations_user_id_idx on public.course_registrations (user_id);
create index course_registrations_course_id_idx on public.course_registrations (course_id);

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  file_path text not null,
  file_type text,
  file_size bigint,
  thumbnail text,
  requires_login boolean not null default true,
  is_published boolean not null default true,
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

create index downloads_is_published_idx on public.downloads (is_published);

create table public.download_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  download_id uuid not null references public.downloads (id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index download_logs_user_id_idx on public.download_logs (user_id);
create index download_logs_download_id_idx on public.download_logs (download_id);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  featured_image text,
  category text,
  author_id uuid references auth.users (id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_is_published_idx on public.blog_posts (is_published);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);
