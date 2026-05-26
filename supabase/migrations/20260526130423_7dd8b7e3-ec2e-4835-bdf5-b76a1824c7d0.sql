DROP POLICY IF EXISTS apps_read ON public.apps;
CREATE POLICY apps_read ON public.apps
FOR SELECT TO authenticated
USING (
  active AND (
    sector_id IS NULL
    OR has_sector_access(auth.uid(), sector_id)
  )
);