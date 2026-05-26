
-- 1. Fix has_sector_access: NULL sector_id now denied except for admin/diretoria
CREATE OR REPLACE FUNCTION public.has_sector_access(_user_id uuid, _sector_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','diretoria'))
    OR (_sector_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id
    ));
$$;

-- 2. Profiles: restrict broad read
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'diretoria')
    OR EXISTS (
      SELECT 1
      FROM public.user_sectors us1
      JOIN public.user_sectors us2 ON us1.sector_id = us2.sector_id
      WHERE us1.user_id = auth.uid() AND us2.user_id = profiles.id
    )
  );

-- 3. Notifications: restrict insert
DROP POLICY IF EXISTS notif_insert_any ON public.notifications;
CREATE POLICY notif_insert_self ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'diretoria')
  );

-- 4. Storage: tighten docs_insert and docs_read
DROP POLICY IF EXISTS docs_insert ON storage.objects;
CREATE POLICY docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['documents','procedures','news'])
    AND public.can_approve(auth.uid())
  );

DROP POLICY IF EXISTS docs_read ON storage.objects;
CREATE POLICY docs_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = ANY (ARRAY['documents','procedures','news'])
    AND (
      owner = auth.uid()
      OR public.is_admin(auth.uid())
      OR (
        bucket_id = 'documents' AND EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.storage_path = storage.objects.name
            AND public.has_sector_access(auth.uid(), d.sector_id)
        )
      )
      OR (bucket_id = 'news')
      OR (
        bucket_id = 'procedures' AND public.can_approve(auth.uid())
      )
    )
  );

-- 5. Realtime: lock down realtime.messages so users can't subscribe to arbitrary topics.
-- Only allow if the user is authenticated AND the topic matches their own user id
-- (for personal channels like notifications) OR is an admin.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_authenticated_read ON realtime.messages;
CREATE POLICY realtime_authenticated_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  );

DROP POLICY IF EXISTS realtime_authenticated_write ON realtime.messages;
CREATE POLICY realtime_authenticated_write ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  );
