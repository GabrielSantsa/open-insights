DROP POLICY IF EXISTS procedure_steps_read ON public.procedure_steps;
CREATE POLICY procedure_steps_read ON public.procedure_steps
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.procedures p
    WHERE p.id = procedure_steps.procedure_id
      AND (
        p.workflow = 'publicado'
        OR p.author_id = auth.uid()
        OR p.responsible_id = auth.uid()
        OR can_approve(auth.uid())
        OR has_sector_access(auth.uid(), p.sector_id)
      )
  )
);