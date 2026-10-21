
CREATE POLICY "Super admin manages db-exports"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'db-exports'
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = 'amsterntechhub@gmail.com'
  )
)
WITH CHECK (
  bucket_id = 'db-exports'
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = 'amsterntechhub@gmail.com'
  )
);
