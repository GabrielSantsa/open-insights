UPDATE storage.buckets SET public = true WHERE id = 'news';

DROP POLICY IF EXISTS "news_images_read" ON storage.objects;
DROP POLICY IF EXISTS "news_images_write" ON storage.objects;
DROP POLICY IF EXISTS "news_images_delete" ON storage.objects;

CREATE POLICY "news_images_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'news');

CREATE POLICY "news_images_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'news' AND public.can_approve(auth.uid()));

CREATE POLICY "news_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'news' AND public.can_approve(auth.uid()));