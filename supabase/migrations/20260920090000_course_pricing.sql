-- Add course pricing: a current (offer) price and an original (strike-through)
-- price. Both are nullable so courses without a set price simply hide the
-- price section on the course page.
alter table public.courses
  add column price numeric(10, 2),
  add column original_price numeric(10, 2);

update public.courses set price = 2999, original_price = 5998 where slug = 'autocad-mastery-mechanical';
update public.courses set price = 3999, original_price = 7998 where slug = 'solidworks-essentials';
update public.courses set price = 4999, original_price = 9998 where slug = 'solidworks-advanced-part-modeling';
update public.courses set price = 4999, original_price = 9998 where slug = 'solidworks-sheet-metal';
update public.courses set price = 3999, original_price = 7998 where slug = 'solidworks-weldments';
update public.courses set price = 1999, original_price = 14000 where slug = 'ansys-workbench-level-1';
update public.courses set price = 4999, original_price = 9998 where slug = 'creo-mechanism';
