-- Rename "ANSYS Workbench Level 1" to the launch name, "ANSYS Workbench Foundation".
-- The slug stays ansys-workbench-level-1 so existing links, ads and checkout keep working.
update public.courses
set title = 'ANSYS Workbench Foundation',
    description = replace(description, '<h2>ANSYS Workbench Level 1</h2>', '<h2>ANSYS Workbench Foundation</h2>')
where slug = 'ansys-workbench-level-1';
