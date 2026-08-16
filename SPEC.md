# Build CADseekho — Complete Engineering Training Website

You are a senior full-stack web developer and UI/UX designer.

Build a production-ready website/web application for **CADseekho.com**, an online engineering CAD/CAE education platform.

The goal is NOT to build a full LMS. Do NOT add live classes, recorded lectures, video streaming, quizzes, assignments, or unnecessary LMS functionality.

The initial purpose of the website is:

1. Present CAD/engineering courses professionally.
2. Provide a dedicated information page for every course.
3. Allow users to create an account and log in.
4. Collect useful user information.
5. Provide a Free Downloads section.
6. Require login before downloading protected/free resources.
7. Provide a professional blog.
8. Provide a simple user dashboard.
9. Provide an admin area to manage courses, downloads, blog posts, and users.
10. Make the architecture expandable for future paid courses and additional features.

---

# 1. TECHNOLOGY STACK

Use the following technology stack:

### Frontend

* React
* Vite
* TypeScript
* React Router
* Modern CSS
* Responsive design
* Component-based architecture

### Backend / Database

Use Supabase:

* Supabase Authentication
* PostgreSQL database
* Supabase Storage
* Row Level Security
* Supabase JavaScript client

Do NOT create a custom authentication system.

Do NOT store passwords manually.

### Deployment

The application should be structured so it can eventually be deployed to:

`cadseekho.com`

The current domain is registered/hosted on Hostinger. The React/Vite app itself will be deployed as a static build to Vercel or Netlify, with the domain's DNS pointed there from Hostinger. Keep deployment requirements simple and documented in the README.

---

# 2. BRAND

Website name:

**CADseekho**

Domain:

**cadseekho.com**

Use the brand consistently throughout the website.

CADseekho is an engineering education platform focused on:

* CAD
* 3D modeling
* Engineering design
* Simulation
* Manufacturing
* PLM
* Practical engineering skills

Target audience:

* Engineering students
* Mechanical engineers
* Civil engineers
* Designers
* Working professionals
* Teachers
* CAD learners
* Manufacturing/design professionals

---

# 3. DESIGN DIRECTION — "DRAFTING TABLE"

Create a professional engineering/technology website that feels like a real drafting table and engineering drawing sheet — not a generic SaaS template.

Do NOT make it look like:

* A generic business template
* A generic university website
* A flashy marketing website
* A pink/purple AI-generated template
* A traditional WordPress template
* A generic blue/navy corporate SaaS template

## Color tokens

Use this exact palette throughout the site:

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#FAFAF7` | Primary background (page, cards) |
| `--ink` | `#1B2A4A` | Headings, primary text, dark sections, borders/frames |
| `--line` | `#C7D0DC` | Hairline rules, grid lines, dividers |
| `--line-strong` | `#9AA8BC` | Secondary borders, disabled/muted UI |
| `--accent` | `#E8622C` | CTA buttons, links, active states, highlight details (CAD-orange) |
| `--slate` | `#5B6B7F` | Body copy, secondary text |
| `--white` | `#FFFFFF` | Cards/panels sitting on paper background |

Do not substitute the corporate blue (`#1769E0`) or navy-heavy palette from earlier drafts. The orange accent (`--accent`) is the only saturated color in the system — use it sparingly and deliberately (primary buttons, active nav state, key highlights), never as a background fill for large areas.

## Typography

* Display/headings: **Space Grotesk** (technical, geometric character)
* Body: **Inter**
* Labels/data/metadata (file names, stats, course codes, timestamps): **IBM Plex Mono**

## Signature visual language

This is what makes the site recognizable — apply consistently, not just on the homepage:

* **Corner ticks / drafting frame**: key cards and hero visuals get a thin 1px border (`--line`) with small 2px corner brackets in `--ink` at two opposite corners, evoking a technical drawing sheet's border marks.
* **Dimension lines**: thin dashed or solid rule lines with small perpendicular end-ticks, used as dividers or under key stats (like a CAD dimension callout).
* **Blueprint grid**: a faint (opacity ~0.3–0.4) graph-paper grid (`--line` on `--paper`), used behind hero sections and section backgrounds, faded out via a mask/gradient rather than covering a full area edge-to-edge.
* **Mono labels**: small uppercase monospace tags for metadata (e.g. `SCALE 1:2`, `FILE — BRACKET_MOUNT.SLDPRT`, `CERT-ID · CS-2026-04471`) used as decorative/informational chrome on cards.
* **Numbered section markers**: use `01 —`, `02 —` style mono labels ahead of major section headings, since the site content genuinely is organized as a sequence (tracks, steps, process).

Use:

* Large clean typography with tight, confident tracking on headings
* Sharp/minimal corner radii (0–4px) — this is a drafting-table aesthetic, not a soft rounded SaaS one
* Subtle shadows only where a card needs to lift off the paper background
* Clean, generous spacing
* Technical/engineering imagery and iconography (line-art parts, sketches, dimension callouts) over stock photography
* Orange CTA buttons on the paper/navy backgrounds
* Excellent mobile responsiveness

Avoid excessive gradients and animations. Animations should be subtle and purposeful (e.g. a dimension line drawing itself in on scroll is on-brand; bouncing/parallax effects are not).

A full reference homepage mockup (HTML/CSS) implementing this system has already been built and approved — request it if you need a concrete visual reference before styling components.

---

# 4. WEBSITE STRUCTURE

Create the following main navigation:

Home
Courses
Free Downloads
Blog
About
Contact

Right side:

Login
Sign Up

Courses should have a dropdown/mega menu.

---

# 5. COURSE CATEGORIES

Initially create these categories and courses.

## AutoCAD

### AutoCAD Mastery: Mechanical

Description:

Professional AutoCAD training focused on mechanical drafting, engineering drawings, layouts, detailing, and practical mechanical design.

### AutoCAD Mastery: Civil

Description:

AutoCAD training focused on civil drafting, plans, layouts, construction drawings, and practical civil design workflows.

### AutoCAD Mastery: Interior

Description:

AutoCAD training focused on interior layouts, furniture planning, space planning, detailing, and professional interior drawings.

---

# 6. SOLIDWORKS COURSES

Create a SolidWorks category containing:

### SolidWorks Essentials

Beginner-focused SolidWorks course covering fundamentals, sketching, part modeling, assemblies, drawings, and practical modeling workflows.

### SolidWorks Advanced Part Modeling

Advanced SolidWorks course focused on complex part modeling, advanced features, design intent, complex geometry, and professional modeling techniques.

### SolidWorks Sheet Metal

SolidWorks training focused on sheet-metal design, base flanges, bends, edge flanges, hems, unfold/fold operations, and manufacturing-ready models.

### SolidWorks Weldments

SolidWorks training focused on structural members, weldment profiles, trim/extend, gussets, weldment cut lists, and fabrication-oriented design.

---

# 7. FUTURE COURSE CATEGORIES

Build the database architecture so additional categories can easily be added later.

Potential future categories:

## ANSYS

* ANSYS Workbench
* ANSYS Mechanical
* ANSYS Fluent

## Teamcenter / PLM

* Teamcenter Essentials
* BMIDE
* Teamcenter Administration
* Workflow

Do not necessarily publish all future courses on the homepage yet.

The admin should be able to create them later.

---

# 8. HOMEPAGE

Create a high-quality homepage following the Drafting Table design system (Section 3).

## Hero Section

Main headline:

**Learn CAD. Build Skills. Solve Real Engineering Problems.**

Supporting text:

**Practical CAD and engineering training designed for students, engineers, designers, and working professionals.**

Buttons:

**Explore Courses** (primary, orange)

**Free Downloads** (secondary, outline)

Use a technical/line-art engineering visual on the right side — e.g. a framed "drawing sheet" card with a part sketch, mono file-name label, and dimension callouts, consistent with Section 3's signature visual language.

The hero should immediately communicate what CADseekho does.

---

# 9. HOMEPAGE COURSE SECTION

Create:

## Explore Our Courses

Show course categories as cards, styled per Section 3 (paper background, hairline borders, corner ticks on hover/active).

Example:

AutoCAD
3 specialized courses

SolidWorks
4 specialized courses

ANSYS
Coming Soon

Teamcenter
Coming Soon

Each category should have:

* Icon/image
* Category name
* Short description
* Number of courses
* View Courses button

---

# 10. FEATURED COURSES

Create a section:

## Featured Courses

Show selected courses as professional cards.

Each card should contain:

* Course image
* Category
* Course title
* Short description
* Level
* View Course button

Do not show fake ratings or fake student counts.

Do not invent testimonials.

Do not invent statistics.

---

# 11. WHY CADSEEKHO

Create a section:

## Why Learn With CADseekho?

Use cards such as:

### Practical Learning

Focus on real engineering applications rather than only software commands.

### Industry-Oriented Skills

Learn workflows and techniques useful in professional engineering environments.

### Scenario-Based Problems

Include practical engineering problems and exercises.

### Structured Learning

Courses are organized from fundamentals to advanced concepts.

### Engineering Focus

Training is designed around real CAD, design, manufacturing, and simulation workflows.

---

# 12. FREE DOWNLOADS

Create a major website section:

## Free Engineering Resources

Users should be able to browse free resources.

Possible resources:

* CAD practice drawings
* SolidWorks practice files
* AutoCAD drawings
* Engineering PDFs
* GD&T reference material
* Design checklists
* Engineering guides
* Practice exercises
* CAD models

Each resource should have:

* Title
* Description
* Category
* File type
* File size
* Preview image where applicable
* Download button

Important:

Some resources should require login before download.

Flow:

User clicks Download
→ If not logged in
→ Show login/signup
→ After authentication
→ Allow download

Track downloads in the database.

Do not expose protected storage files through permanent public URLs.

Use Supabase Storage and appropriate access policies/signed URLs.

---

# 13. BLOG

Create:

`/blog`

The blog should be SEO-friendly.

Categories can include:

* SolidWorks
* AutoCAD
* ANSYS
* GD&T
* DFM
* CAD Tips
* Engineering
* Career
* Tutorials

Blog listing should contain:

* Featured image
* Title
* Category
* Short excerpt
* Publication date
* Read More

Individual article:

`/blog/article-slug`

Include:

* SEO-friendly title
* Featured image
* Author
* Date
* Article content
* Related courses
* Related articles
* CTA

Create an admin interface so blog posts can be created without modifying source code.

---

# 14. COURSE PAGES

Every course must have a dedicated page.

Example:

`/courses/solidworks-essentials`

Course page structure:

## Hero

Course title

Short description

Course category

Level

CTA

## Course Overview

Detailed explanation of the course.

## Who Is This Course For?

Examples:

* Students
* Beginners
* Mechanical engineers
* Designers
* Working professionals

## Prerequisites

Clearly explain required knowledge.

## What You Will Learn

Use a structured list.

## Course Syllabus

Organize into modules.

Example:

Module 1 — SolidWorks Interface
Module 2 — Sketching
Module 3 — Part Modeling
Module 4 — Features
Module 5 — Assemblies
Module 6 — Engineering Drawings
Module 7 — Practical Projects

Make the syllabus database-driven.

## Skills You Will Gain

Display skills as cards/tags.

## Course Information

Display:

* Level
* Software
* Category
* Format
* Projects
* Prerequisites

Do NOT add live classes.

Do NOT add recorded lectures.

Do NOT add a video player.

Do NOT add fake pricing unless pricing is provided later.

Add:

**Register / Get Access**

button.

---

# 15. USER REGISTRATION

Create a proper signup system using Supabase Auth.

Signup fields:

* Full Name
* Email
* Mobile Number
* Password
* User type
* Experience
* Interested courses

User type:

* Student
* Engineer
* Working Professional
* Teacher
* Other

Experience:

* Fresher
* 1–2 years
* 3–5 years
* 5+ years

Interested courses:

* AutoCAD
* SolidWorks
* ANSYS
* Teamcenter

Store profile information in a `profiles` table.

Never store plaintext passwords.

---

# 16. LOGIN

Create:

`/login`

Fields:

Email
Password

Features:

* Login
* Forgot password
* Remember session
* Logout

Use Supabase Auth.

---

# 17. USER DASHBOARD

Create:

`/dashboard`

After login:

Display:

**Welcome, [User Name]**

Sections:

### My Profile

Show/edit:

* Name
* Email
* Mobile
* User type
* Experience
* Course interests

### My Courses

Initially this can be simple and show courses the user has registered for.

### Free Downloads

Show previously downloaded resources.

### Account Settings

Allow password/account management.

Keep this dashboard simple.

Do not build an LMS.

---

# 18. COURSE REGISTRATION

When the user clicks:

**Register / Get Access**

If logged out:

→ Login/signup

If logged in:

→ Save registration in database.

Create a `course_registrations` table.

Store:

* User ID
* Course ID
* Registration date
* Status

This will allow CADseekho to understand which courses users are interested in.

---

# 19. DATABASE DESIGN

Create a clean relational PostgreSQL schema in Supabase.

Suggested tables:

### profiles

* id
* full_name
* email
* phone
* user_type
* experience
* created_at
* updated_at

### categories

* id
* name
* slug
* description
* image
* is_active
* created_at

### courses

* id
* category_id
* title
* slug
* short_description
* description
* level
* software
* prerequisites
* image
* is_featured
* is_published
* created_at
* updated_at

### course_modules

* id
* course_id
* title
* description
* order_number

### course_skills

* id
* course_id
* skill_name

### course_registrations

* id
* user_id
* course_id
* status
* created_at

### downloads

* id
* title
* slug
* description
* category
* file_path
* file_type
* file_size
* thumbnail
* requires_login
* is_published
* download_count
* created_at

### download_logs

* id
* user_id
* download_id
* downloaded_at

### blog_posts

* id
* title
* slug
* excerpt
* content
* featured_image
* category
* author_id
* is_published
* published_at
* created_at
* updated_at

### contact_messages

* id
* name
* email
* phone
* subject
* message
* created_at

---

# 20. ADMIN DASHBOARD

Create a protected admin area:

`/admin`

Only users with an admin role can access it.

Admin dashboard should show:

* Total users
* Course registrations
* Total downloads
* Blog posts
* Published courses

Create management sections:

### Users

View users and their information.

### Categories

Create/edit/delete categories.

### Courses

Create/edit/delete/publish courses.

### Course Modules

Add/reorder modules.

### Downloads

Upload and manage:

* PDF
* ZIP
* DWG
* DOCX
* XLSX
* Images

### Blog

Create/edit/delete/publish blog posts.

### Contact Messages

View contact form submissions.

---

# 21. ADMIN SECURITY

Do NOT rely only on hiding the `/admin` URL.

Use proper authorization.

Implement:

* Supabase Auth
* User roles
* Row Level Security
* Admin-only database operations

Normal users must never be able to:

* Modify courses
* Modify blog posts
* Upload arbitrary files
* Access other users' profiles
* Access admin data

---

# 22. CONTACT PAGE

Create a simple contact page.

Fields:

* Name
* Email
* Phone
* Subject
* Message

Store submissions in Supabase.

Do not require users to log in to contact CADseekho.

---

# 23. ABOUT PAGE

Create a professional About page explaining:

* What CADseekho is
* Who it is for
* Training philosophy
* CAD/engineering focus
* Practical learning approach

Do not invent company history, awards, partnerships, statistics, or certifications.

Use placeholders where information has not yet been provided.

---

# 24. HEADER

Create a responsive header styled per Section 3 (paper/white background, ink text, orange active/CTA states).

Desktop:

CADseekho logo/name

Home
Courses
Free Downloads
Blog
About
Contact

Right:

Login
Sign Up

Mobile:

Hamburger menu.

Courses should have a dropdown.

---

# 25. FOOTER

Create a professional footer styled per Section 3.

Columns:

### CADseekho

Short description.

### Courses

AutoCAD
SolidWorks
ANSYS
Teamcenter

### Resources

Free Downloads
Blog

### Company

About
Contact

### Social

Create placeholders for:

Facebook
Instagram
YouTube
LinkedIn

Do not invent social media URLs.

Footer copyright:

**© CADseekho. All rights reserved.**

---

# 26. SEO

Implement good SEO fundamentals.

Every page should have:

* SEO-friendly title
* Meta description
* Canonical URL
* Clean URL slug
* Open Graph metadata
* Proper heading hierarchy

Course URLs:

`/courses/solidworks-essentials`

Blog URLs:

`/blog/how-to-use-sweep-in-solidworks`

Category URLs where appropriate.

Create sitemap support.

Use semantic HTML.

Optimize images.

---

# 27. RESPONSIVE DESIGN

The website must work properly on:

* Desktop
* Laptop
* Tablet
* Mobile

Do not simply shrink desktop layouts.

Design mobile layouts deliberately.

Test:

* Navigation
* Course cards
* Course pages
* Forms
* Login
* Dashboard
* Downloads
* Blog

---

# 28. PERFORMANCE

Keep the website fast.

Use:

* Lazy-loaded images
* Optimized assets
* Code splitting where appropriate
* Efficient React components
* Minimal dependencies
* Proper caching where appropriate

Do not install unnecessary libraries.

---

# 29. ACCESSIBILITY

Use:

* Semantic HTML
* Accessible buttons
* Proper labels
* Keyboard navigation
* Sufficient contrast
* Alt text
* Focus states

Note: verify the orange accent (`#E8622C`) against the paper background (`#FAFAF7`) and white cards meets WCAG AA contrast for text use; use it primarily on buttons/large elements where contrast requirements are more lenient, and pair with `--ink` for any small accent text.

---

# 30. ERROR HANDLING

Every important action should have proper:

* Loading state
* Success state
* Error state
* Empty state

Examples:

Signup failed
Login failed
Download unavailable
Course not found
Blog post not found
Network error
Unauthorized access

Do not expose sensitive backend errors to users.

---

# 31. PROJECT STRUCTURE

Use a clean scalable architecture.

Suggested structure:

```text
cadseekho/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── Home/
│   │   ├── Courses/
│   │   ├── CourseDetails/
│   │   ├── Downloads/
│   │   ├── Blog/
│   │   ├── Login/
│   │   ├── Signup/
│   │   ├── Dashboard/
│   │   ├── About/
│   │   └── Contact/
│   │
│   ├── admin/
│   │   ├── Dashboard/
│   │   ├── Users/
│   │   ├── Courses/
│   │   ├── Downloads/
│   │   └── Blog/
│   │
│   ├── styles/
│   │   └── tokens.css        # Section 3 color/type tokens as CSS variables
│   │
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── lib/
│   ├── types/
│   ├── utils/
│   └── routes/
│
├── public/
│
├── supabase/
│   ├── migrations/
│   └── seed/
│
├── .env.example
├── package.json
└── README.md
```

Adjust the structure if a better architecture is appropriate.

---

# 32. IMPORTANT: DO NOT USE FAKE DATA IN PRODUCTION UI

You may use clearly marked seed/demo data during development.

Do NOT create fake:

* Student testimonials
* Student numbers
* Ratings
* Reviews
* Certifications
* Company partnerships
* Revenue
* Success statistics
* Instructor credentials

If information is not provided, use a neutral placeholder or omit it.

---

# 33. INITIAL SEED DATA

Create seed data for the currently defined courses:

## AutoCAD

1. AutoCAD Mastery: Mechanical
2. AutoCAD Mastery: Civil
3. AutoCAD Mastery: Interior

## SolidWorks

4. SolidWorks Essentials
5. SolidWorks Advanced Part Modeling
6. SolidWorks Sheet Metal
7. SolidWorks Weldments

Do not create fake syllabus details beyond reasonable placeholder modules.

Make all seed content easy to modify from the admin dashboard.

---

# 34. COURSE IMAGE SYSTEM

Each course should support a featured image.

Use image paths/URLs from the database rather than hardcoding images inside React components.

Create attractive placeholder images for development if necessary — line-art/technical-sketch style placeholders fit the Drafting Table system better than generic stock photos.

The design should allow CADseekho-specific course images to be replaced later without changing code.

---

# 35. FREE DOWNLOAD SECURITY

This is important.

Do NOT simply put protected files in:

`/public`

and expose them.

Use Supabase Storage.

For protected downloads:

1. Check authentication.
2. Check resource permissions if applicable.
3. Generate a temporary signed URL.
4. Record the download.
5. Return/download the file.

Public resources can remain public if intentionally configured that way.

---

# 36. FUTURE EXPANSION

Do not build these features now:

* Live classes
* Recorded lectures
* Video streaming
* Quizzes
* Exams
* Assignments
* Discussion forums
* Certificates
* Payment gateway
* Subscription system

But design the database and application architecture so these can be added later.

Potential future features:

* Paid courses
* Razorpay/Stripe
* Course access
* Learning progress
* Certificates
* Video lessons
* Quizzes
* Instructor accounts
* Email marketing
* Course completion tracking

---

# 37. DEVELOPMENT APPROACH

Do NOT generate the entire project as one giant unstructured code dump.

Build it systematically.

First:

1. Create project
2. Configure React/Vite
3. Configure Supabase
4. Create database schema
5. Create authentication
6. Create global layout (including Section 3 design tokens/system)
7. Create homepage
8. Create course system
9. Create downloads
10. Create blog
11. Create dashboard
12. Create admin dashboard
13. Test security
14. Optimize
15. Prepare deployment

After each major phase, ensure the application still runs (`npm run dev`) before moving to the next phase.

---

# 38. ENVIRONMENT VARIABLES

Use environment variables.

Create:

`.env.example`

Never hardcode Supabase keys or secrets into source code.

Use appropriate public Supabase client configuration for the frontend and never expose service-role keys.

---

# 39. README

Create a complete README containing:

* Project overview
* Technology stack
* Installation
* Environment variables
* Supabase setup
* Database migration
* Seed data
* Running locally
* Creating admin user
* Uploading files
* Deployment (Vercel/Netlify + connecting cadseekho.com via Hostinger DNS)
* Troubleshooting

Assume the developer may be a beginner/intermediate developer, so explain important steps clearly.

---

# 40. FINAL QUALITY REQUIREMENT

The final result should feel like a **professional engineering education platform** with a distinctive drafting-table visual identity — not a demo project, and not a generic template.

Prioritize:

1. Clean UI consistent with Section 3's design system
2. Excellent course presentation
3. Easy navigation
4. Fast loading
5. Mobile responsiveness
6. Secure authentication
7. Secure file downloads
8. SEO
9. Maintainable code
10. Easy content management

Do not over-engineer the application.

The initial CADseekho website should remain simple:

**Courses + Course Information + Free Downloads + Blog + Login/Signup + User Dashboard + Admin Management**

That is the core product.

---

# START NOW

Before writing large amounts of code:

1. Analyze the requirements.
2. Propose the final architecture briefly.
3. Create the project structure.
4. Implement the application phase-by-phase.
5. Keep the UI visually consistent with the CADseekho "Drafting Table" design system defined in Section 3.
6. Make all important content database-driven.
7. Ensure the application can eventually be deployed to `cadseekho.com`.

Do not ask unnecessary questions.

Where information is not provided, make a sensible implementation decision and clearly identify what can be changed later.

Build the website as a real production-ready application, not merely a visual prototype.
