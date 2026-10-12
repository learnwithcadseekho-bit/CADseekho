-- ANSYS Workbench Foundation launch: the batch starts Mon 19 Oct 2026
-- (17 Oct is the free demo class, not the batch start).
update public.courses
set next_batch_date = '2026-10-19'
where slug = 'ansys-workbench-level-1';
