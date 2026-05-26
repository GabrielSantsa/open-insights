DROP POLICY IF EXISTS procedures_read ON public.procedures;
CREATE POLICY procedures_read ON public.procedures FOR SELECT TO authenticated
  USING (
    workflow = 'publicado'
    OR author_id = auth.uid()
    OR responsible_id = auth.uid()
    OR can_approve(auth.uid())
    OR has_sector_access(auth.uid(), sector_id)
  );