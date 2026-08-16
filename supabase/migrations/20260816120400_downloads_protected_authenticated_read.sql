-- Lets any signed-in user mint a short-lived signed URL for a
-- downloads-protected object directly from the client. This is the actual
-- enforcement of Section 12's "require login before download" — the login
-- check happens at the storage layer via RLS, not just in app code. The
-- admin-write policy from the previous migration is untouched; this only
-- adds read access for the authenticated role.
create policy "downloads_protected_bucket_authenticated_read"
  on storage.objects for select
  using (bucket_id = 'downloads-protected' and auth.role() = 'authenticated');
