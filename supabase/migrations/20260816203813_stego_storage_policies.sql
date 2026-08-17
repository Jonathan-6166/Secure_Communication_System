/*
# Storage policies for stego-assets bucket

1. Purpose
Allow authenticated users to upload, read, and manage their own files in the `stego-assets` bucket.
Files are organized by path prefix: `avatars/<user_id>/...` and `stego/<user_id>/...`.
The bucket is public for reads (so recipients can view stego images), but writes are owner-scoped.

2. Security
- SELECT (read): public — anyone can view images (needed for message recipients to see stego images).
- INSERT/UPDATE/DELETE: owner only — authenticated users can only manage files under their own user_id path prefix.
*/

-- Allow public read access to stego-assets
DROP POLICY IF EXISTS "Public read stego-assets" ON storage.objects;
CREATE POLICY "Public read stego-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stego-assets');

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Auth upload own stego-assets" ON storage.objects;
CREATE POLICY "Auth upload own stego-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stego-assets'
  AND (storage.foldername(name))[1] IN ('avatars', 'stego')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow owners to update their own files
DROP POLICY IF EXISTS "Auth update own stego-assets" ON storage.objects;
CREATE POLICY "Auth update own stego-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stego-assets'
  AND (storage.foldername(name))[1] IN ('avatars', 'stego')
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'stego-assets'
  AND (storage.foldername(name))[1] IN ('avatars', 'stego')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow owners to delete their own files
DROP POLICY IF EXISTS "Auth delete own stego-assets" ON storage.objects;
CREATE POLICY "Auth delete own stego-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stego-assets'
  AND (storage.foldername(name))[1] IN ('avatars', 'stego')
  AND (storage.foldername(name))[2] = auth.uid()::text
);
