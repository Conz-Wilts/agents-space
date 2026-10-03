-- Profile icons bucket (`directory-profile-icons`, public): signed-in users write only their own
-- object, named by their Supabase Auth user id. See migration 20261003230000_profile_icons.
CREATE POLICY "profile_icons_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);

CREATE POLICY "profile_icons_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);

CREATE POLICY "profile_icons_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);
