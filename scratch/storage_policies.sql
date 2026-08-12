DROP POLICY IF EXISTS "Allow select objects for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert objects for authenticated users" ON storage.objects;

CREATE POLICY "Allow select objects for authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lectores-fotos');

CREATE POLICY "Allow insert objects for authenticated users"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lectores-fotos' AND auth.uid() IS NOT NULL);
