DO $$ BEGIN
  CREATE TYPE public.procedure_workflow AS ENUM ('rascunho','em_revisao','publicado','arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS workflow public.procedure_workflow NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.procedures
SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS procedures_slug_unique ON public.procedures(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.procedure_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  version text NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  change_note text,
  is_major boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS procedure_versions_proc_idx ON public.procedure_versions(procedure_id, created_at DESC);
ALTER TABLE public.procedure_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY proc_versions_read ON public.procedure_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = procedure_versions.procedure_id AND public.has_sector_access(auth.uid(), p.sector_id)));
CREATE POLICY proc_versions_write ON public.procedure_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_approve(auth.uid()) AND (created_by = auth.uid()));
CREATE POLICY proc_versions_admin ON public.procedure_versions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.procedure_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS procedure_files_proc_idx ON public.procedure_files(procedure_id);
ALTER TABLE public.procedure_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY proc_files_read ON public.procedure_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = procedure_files.procedure_id AND public.has_sector_access(auth.uid(), p.sector_id)));
CREATE POLICY proc_files_write ON public.procedure_files FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY proc_files_admin ON public.procedure_files FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.procedure_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proc_access_proc_idx ON public.procedure_access_logs(procedure_id, created_at DESC);
ALTER TABLE public.procedure_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY proc_access_insert ON public.procedure_access_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY proc_access_read ON public.procedure_access_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS procedures_read ON public.procedures;
CREATE POLICY procedures_read ON public.procedures FOR SELECT TO authenticated
  USING (
    public.has_sector_access(auth.uid(), sector_id)
    AND (
      workflow = 'publicado'
      OR author_id = auth.uid()
      OR responsible_id = auth.uid()
      OR public.can_approve(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.increment_procedure_access(_procedure_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.procedures SET access_count = access_count + 1 WHERE id = _procedure_id;
  INSERT INTO public.procedure_access_logs (procedure_id, user_id, action)
  VALUES (_procedure_id, auth.uid(), 'view');
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('procedures', 'procedures', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proc_files_storage_read" ON storage.objects;
CREATE POLICY "proc_files_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'procedures');
DROP POLICY IF EXISTS "proc_files_storage_upload" ON storage.objects;
CREATE POLICY "proc_files_storage_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'procedures' AND public.can_approve(auth.uid()));
DROP POLICY IF EXISTS "proc_files_storage_delete" ON storage.objects;
CREATE POLICY "proc_files_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'procedures' AND public.can_approve(auth.uid()));
