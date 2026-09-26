-- Card/OG thumbnails for the two Kt calculators: the same plate sketches the
-- calculator pages show (public/resources/sketches). Only fills an empty
-- thumbnail, so one uploaded in the admin is left alone.

update public.resources
set thumbnail_url = '/resources/sketches/plate-center-hole.webp'
where component_key = 'kt-plate-center-hole' and thumbnail_url is null;

update public.resources
set thumbnail_url = '/resources/sketches/plate-hole-near-edge.webp'
where component_key = 'kt-hole-near-edge' and thumbnail_url is null;
