-- Profile icons: a copy of each user's Google picture in the public `directory-profile-icons` bucket,
-- shown next to their handle in the directory. The object name is the Supabase Auth user id.
ALTER TABLE "public"."User" ADD COLUMN "avatarUrl" text;

CREATE POLICY "profile_icons_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);

CREATE POLICY "profile_icons_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);

-- Upsert reads the existing row first; the bucket is public anyway.
CREATE POLICY "profile_icons_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'directory-profile-icons' AND name = (select auth.uid())::text);
