-- Sample blog content (Section 32: clearly marked seed/demo data, safe to
-- edit or delete from /admin later). Genuine short technical write-ups, not
-- fabricated stats/testimonials. Safe to re-run: guarded by on conflict.

insert into public.blog_posts (title, slug, excerpt, content, category, is_published, published_at)
values
  (
    'GD&T Basics: Understanding Datums',
    'gdt-basics-understanding-datums',
    'Datums are the foundation of every GD&T callout. Here''s a practical introduction to how they work and why they matter.',
    'Geometric Dimensioning and Tolerancing (GD&T) can look intimidating on a drawing, but almost everything on it traces back to one idea: datums.

A datum is a reference — a theoretically exact point, axis, or plane — that other features on a part are measured against. Instead of dimensioning every feature relative to every other feature, GD&T lets you pick a small set of datums and control everything else relative to them, which is closer to how the part is actually held and measured in manufacturing and inspection.

Datums are usually labeled with a letter in a small box on the drawing, and referenced inside feature control frames using that letter. A typical part will have a primary, secondary, and tertiary datum, forming what''s often called a datum reference frame — together they lock down all six degrees of freedom.

Picking good datums usually means thinking about how the part will actually be fixtured during machining and inspection, not just what''s easiest to dimension on paper. Get the datum scheme right early, and the rest of the tolerancing tends to fall into place.',
    'GD&T',
    true,
    now() - interval '14 days'
  ),
  (
    '5 AutoCAD Layer Management Habits Worth Building',
    'autocad-layer-management-habits',
    'Good layer discipline is the difference between a drawing you can hand off and one only you can navigate. A few habits that pay off fast.',
    'Layers are one of the first things you learn in AutoCAD and one of the last things most people actually get disciplined about. A few habits make a real difference once drawings get complex.

First, name layers by what they represent, not by color or line weight — something like MECH-DIM or CIVIL-GRADE reads far better six months later than a layer literally called "Layer 3". Second, keep a consistent naming convention across every drawing and template you produce, so anyone opening your file already knows where to look.

Third, use layer states to save and restore common views instead of manually toggling visibility every time. Fourth, lock reference layers you're not actively editing — it prevents a huge share of accidental edits. And fifth, purge unused layers before you hand off or archive a drawing; a clean layer list is a strong signal the rest of the file is clean too.

None of this is complicated, but it compounds. A drawing built with layer discipline from the start is dramatically easier to detail, revise, and hand off than one where layers were an afterthought.',
    'AutoCAD',
    true,
    now() - interval '7 days'
  ),
  (
    'SolidWorks Sheet Metal: Common Mistakes to Avoid',
    'solidworks-sheet-metal-common-mistakes',
    'Sheet metal parts that look right in the 3D model can still fail to unfold cleanly. Here are the mistakes that cause it most often.',
    'Sheet metal modeling in SolidWorks has its own logic, and a part that looks perfectly reasonable in the folded 3D view can still produce a flat pattern that doesn''t match reality.

One common mistake is ignoring K-factor and bend allowance settings, or using SolidWorks'' defaults without checking them against your actual material and process. Bend allowances vary by material, thickness, and bend radius — get this wrong and your flat pattern dimensions will be off, sometimes just enough to cause real problems in fabrication.

Another frequent issue is adding features in the wrong order relative to the base flange and bends, which can produce unfold errors or distorted flat patterns. It''s usually safer to build the base flange and primary bends first, then add edge flanges, hems, and cosmetic features afterward.

Finally, many designers under-communicate bend direction and relief style to manufacturing, relying on the 3D model alone. A clear flat pattern drawing, with bend lines, direction, and relief style labeled, saves a lot of back-and-forth with the shop floor — and catches problems before metal gets cut.',
    'SolidWorks',
    true,
    now() - interval '2 days'
  )
on conflict (slug) do nothing;
