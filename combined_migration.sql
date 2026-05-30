
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin','diretoria','gerente','coordenador','colaborador');
CREATE TYPE public.task_status AS ENUM ('nova','em_andamento','aguardando','concluida','cancelada');
CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta','urgente');
CREATE TYPE public.news_status AS ENUM ('rascunho','aguardando_aprovacao','publicado');
CREATE TYPE public.procedure_status AS ENUM ('rascunho','ativo','em_revisao','obsoleto');
CREATE TYPE public.company_status AS ENUM ('ativo','inativo','prospecto');
CREATE TYPE public.event_type AS ENUM ('prazo_fiscal','reuniao','treinamento','aviso');
CREATE TYPE public.notification_type AS ENUM ('nova_demanda','prazo_proximo','evento','nova_noticia','procedimento_atualizado');

-- =========================
-- SECTORS
-- =========================
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  position TEXT,
  ramal TEXT,
  primary_sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =========================
-- USER SECTORS (which sectors a user can view)
-- =========================
CREATE TABLE public.user_sectors (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sector_id)
);

-- =========================
-- SECURITY DEFINER FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Diretoria + Admin têm acesso global. Demais veem apenas setores vinculados.
CREATE OR REPLACE FUNCTION public.has_sector_access(_user_id UUID, _sector_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _sector_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','diretoria'))
    OR EXISTS (SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id);
$$;

CREATE OR REPLACE FUNCTION public.can_approve(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','diretoria','gerente','coordenador')
  )
$$;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- TASKS
-- =========================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET DEFAULT DEFAULT auth.uid(),
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'media',
  due_date DATE,
  status task_status NOT NULL DEFAULT 'nova',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- PROCEDURES
-- =========================
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  last_revision DATE,
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status procedure_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_procedures_updated BEFORE UPDATE ON public.procedures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.procedure_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  description TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proc_steps_proc ON public.procedure_steps(procedure_id, order_index);

CREATE TABLE public.procedure_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.procedure_steps(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, step_id)
);

CREATE TABLE public.procedure_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, procedure_id)
);

-- =========================
-- DOCUMENTS
-- =========================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  sensitive BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- APPS
-- =========================
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  url TEXT NOT NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  allow_iframe BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE public.app_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- COMPANIES
-- =========================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  status company_status NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- CALENDAR EVENTS
-- =========================
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'aviso',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- NEWS POSTS
-- =========================
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status news_status NOT NULL DEFAULT 'rascunho',
  published_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_news_updated BEFORE UPDATE ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user_unread ON public.notifications(user_id, read);

-- =========================
-- AUDIT LOG
-- =========================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  ip TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- =========================
-- ENABLE RLS
-- =========================
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================

-- SECTORS: todos autenticados leem; só admin gerencia
CREATE POLICY sectors_read ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY sectors_admin_all ON public.sectors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PROFILES: todos autenticados leem; usuário edita o próprio; admin edita todos
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- USER_ROLES: usuário vê próprios papéis; admin gerencia tudo
CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_roles_admin_all ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- USER_SECTORS: usuário vê próprios vínculos; admin gerencia
CREATE POLICY user_sectors_read_self ON public.user_sectors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_sectors_admin_all ON public.user_sectors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- TASKS: vê quem é responsável, criador, ou tem acesso ao setor
CREATE POLICY tasks_read ON public.tasks FOR SELECT TO authenticated
  USING (
    assignee_id = auth.uid()
    OR creator_id = auth.uid()
    OR public.has_sector_access(auth.uid(), sector_id)
  );
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (
    assignee_id = auth.uid()
    OR creator_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'diretoria')
    OR (public.has_role(auth.uid(),'gerente') AND public.has_sector_access(auth.uid(), sector_id))
    OR (public.has_role(auth.uid(),'coordenador') AND public.has_sector_access(auth.uid(), sector_id))
  );
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (creator_id = auth.uid() OR public.is_admin(auth.uid()));

-- TASK_COMMENTS
CREATE POLICY task_comments_read ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
    t.assignee_id = auth.uid() OR t.creator_id = auth.uid() OR public.has_sector_access(auth.uid(), t.sector_id)
  )));
CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- PROCEDURES: ler se tem acesso ao setor; gerenciar = aprovadores
CREATE POLICY procedures_read ON public.procedures FOR SELECT TO authenticated
  USING (public.has_sector_access(auth.uid(), sector_id));
CREATE POLICY procedures_write ON public.procedures FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));

CREATE POLICY procedure_steps_read ON public.procedure_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = procedure_id AND public.has_sector_access(auth.uid(), p.sector_id)));
CREATE POLICY procedure_steps_write ON public.procedure_steps FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));

-- Progresso individual
CREATE POLICY proc_progress_self ON public.procedure_user_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Favoritos individuais
CREATE POLICY proc_fav_self ON public.procedure_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DOCUMENTS
CREATE POLICY documents_read ON public.documents FOR SELECT TO authenticated
  USING (public.has_sector_access(auth.uid(), sector_id));
CREATE POLICY documents_write ON public.documents FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));

CREATE POLICY doc_access_log_insert ON public.document_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY doc_access_log_read ON public.document_access_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- APPS: todos leem ativos com acesso ao setor; admin gerencia
CREATE POLICY apps_read ON public.apps FOR SELECT TO authenticated
  USING (active AND public.has_sector_access(auth.uid(), sector_id));
CREATE POLICY apps_admin_all ON public.apps FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY app_fav_self ON public.app_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY app_log_insert ON public.app_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY app_log_read ON public.app_access_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- COMPANIES
CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated
  USING (public.has_sector_access(auth.uid(), sector_id));
CREATE POLICY companies_write ON public.companies FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));

-- CALENDAR
CREATE POLICY calendar_read ON public.calendar_events FOR SELECT TO authenticated
  USING (public.has_sector_access(auth.uid(), sector_id));
CREATE POLICY calendar_write ON public.calendar_events FOR ALL TO authenticated
  USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));

-- NEWS: todos veem publicado; autor vê próprios; aprovadores veem tudo
CREATE POLICY news_read_published ON public.news_posts FOR SELECT TO authenticated
  USING (status = 'publicado' OR author_id = auth.uid() OR public.can_approve(auth.uid()));
CREATE POLICY news_insert ON public.news_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY news_update ON public.news_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.can_approve(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.can_approve(auth.uid()));
CREATE POLICY news_delete ON public.news_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- NOTIFICATIONS
CREATE POLICY notif_read_self ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notif_update_self ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notif_insert_any ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- AUDIT LOG: só admin lê; qualquer autenticado insere via app
CREATE POLICY audit_read_admin ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY audit_insert_self ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;

-- =========================
-- STORAGE BUCKETS
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents','documents', false),
  ('procedures','procedures', false),
  ('news','news', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('documents','procedures','news'));
CREATE POLICY "docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('documents','procedures','news'));
CREATE POLICY "docs_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('documents','procedures','news') AND owner = auth.uid());
CREATE POLICY "docs_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('documents','procedures','news') AND owner = auth.uid());

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS data_situacao date,
  ADD COLUMN IF NOT EXISTS inicio_atividades date,
  ADD COLUMN IF NOT EXISTS natureza_juridica text,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS capital_social numeric,
  ADD COLUMN IF NOT EXISTS simples_nacional text,
  ADD COLUMN IF NOT EXISTS mei text,
  ADD COLUMN IF NOT EXISTS cnae_principal text,
  ADD COLUMN IF NOT EXISTS cnaes_secundarios text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS telefone1 text,
  ADD COLUMN IF NOT EXISTS telefone2 text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS socios text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_cnpj_unique ON public.companies (cnpj) WHERE cnpj IS NOT NULL;
-- Create internal_messages table
CREATE TABLE public.internal_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Policies for internal_messages
CREATE POLICY "Users can view all internal messages"
ON public.internal_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own messages"
ON public.internal_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Add delete policy for companies
-- Check if the user has the required roles
CREATE POLICY "Approvers can delete companies"
ON public.companies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'diretoria', 'gerente', 'coordenador')
  )
);
-- Ensure foreign keys to tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assignee_id_fkey
FOREIGN KEY (assignee_id) REFERENCES public.profiles(id);

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id);

-- Update internal_messages to point to profiles
ALTER TABLE public.internal_messages DROP CONSTRAINT IF EXISTS internal_messages_sender_id_fkey;

ALTER TABLE public.internal_messages
ADD CONSTRAINT internal_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id);

-- Grant full admin access on all tables via blanket admin policies

-- tasks
DROP POLICY IF EXISTS tasks_admin_all ON public.tasks;
CREATE POLICY tasks_admin_all ON public.tasks FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- task_comments
DROP POLICY IF EXISTS task_comments_admin_all ON public.task_comments;
CREATE POLICY task_comments_admin_all ON public.task_comments FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- companies
DROP POLICY IF EXISTS companies_admin_all ON public.companies;
CREATE POLICY companies_admin_all ON public.companies FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- documents
DROP POLICY IF EXISTS documents_admin_all ON public.documents;
CREATE POLICY documents_admin_all ON public.documents FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- procedures
DROP POLICY IF EXISTS procedures_admin_all ON public.procedures;
CREATE POLICY procedures_admin_all ON public.procedures FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- procedure_steps
DROP POLICY IF EXISTS procedure_steps_admin_all ON public.procedure_steps;
CREATE POLICY procedure_steps_admin_all ON public.procedure_steps FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- news_posts
DROP POLICY IF EXISTS news_admin_all ON public.news_posts;
CREATE POLICY news_admin_all ON public.news_posts FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- calendar_events
DROP POLICY IF EXISTS calendar_admin_all ON public.calendar_events;
CREATE POLICY calendar_admin_all ON public.calendar_events FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- internal_messages: allow admin to also delete/update
DROP POLICY IF EXISTS internal_messages_admin_all ON public.internal_messages;
CREATE POLICY internal_messages_admin_all ON public.internal_messages FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- notifications
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- apps already has apps_admin_all (kept)
-- profiles already has profiles_admin_all (kept)
-- sectors already has sectors_admin_all (kept)
-- user_roles already has user_roles_admin_all (kept)
-- user_sectors already has user_sectors_admin_all (kept)
ALTER PUBLICATION supabase_realtime ADD TABLE internal_messages;
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
UPDATE public.apps SET url = 'https://receita.pr.gov.br/login' WHERE id = '533d2e46-861b-4830-881f-2883be1c42b9';
UPDATE public.apps SET name = 'Site da empresa', url = 'https://www.contabilidadeuniao.com.br/', description = 'Acesso ao site institucional da União Contadores.' WHERE id = '6404647c-08fb-4d11-9270-61e364195c70';ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS content text;DO $$ BEGIN
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
DROP POLICY IF EXISTS procedures_read ON public.procedures;
CREATE POLICY procedures_read ON public.procedures FOR SELECT TO authenticated
  USING (
    workflow = 'publicado'
    OR author_id = auth.uid()
    OR responsible_id = auth.uid()
    OR can_approve(auth.uid())
    OR has_sector_access(auth.uid(), sector_id)
  );DROP POLICY IF EXISTS companies_read ON public.companies;
CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated
  USING (true);DROP POLICY IF EXISTS procedure_steps_read ON public.procedure_steps;
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
);DROP POLICY IF EXISTS apps_read ON public.apps;
CREATE POLICY apps_read ON public.apps
FOR SELECT TO authenticated
USING (
  active AND (
    sector_id IS NULL
    OR has_sector_access(auth.uid(), sector_id)
  )
);ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS content_richtext text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;UPDATE storage.buckets SET public = true WHERE id = 'news';

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
USING (bucket_id = 'news' AND public.can_approve(auth.uid()));-- Create employee status enum
DO $$ BEGIN
    CREATE TYPE public.employee_status AS ENUM ('ativo', 'afastado', 'ferias', 'desligado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Employee Profiles table
CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    foto_url TEXT,
    nome_completo TEXT NOT NULL,
    cargo TEXT NOT NULL,
    setor TEXT NOT NULL,
    email_corporativo TEXT UNIQUE NOT NULL,
    telefone TEXT,
    ramal TEXT,
    data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
    gestor_id UUID REFERENCES public.employee_profiles(id),
    localizacao TEXT,
    status public.employee_status NOT NULL DEFAULT 'ativo',
    assinatura_email TEXT,
    cargo_padronizado TEXT,
    informacoes_institucionais TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Skills (Responsibilities and Knowledge)
CREATE TABLE IF NOT EXISTS public.employee_skills (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('responsabilidade', 'conhecimento')),
    nivel INTEGER DEFAULT 1, -- 1 to 5
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Activity Log
CREATE TABLE IF NOT EXISTS public.employee_activity (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    acao TEXT NOT NULL,
    detalhes JSONB,
    data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trainings
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    data DATE NOT NULL,
    formato TEXT NOT NULL, -- Presencial, Online, etc.
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deadlines / Limit Dates
CREATE TABLE IF NOT EXISTS public.deadlines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    data_limite TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.employee_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.employee_profiles TO authenticated;
GRANT ALL ON public.employee_profiles TO service_role;

GRANT SELECT ON public.employee_skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.employee_skills TO authenticated;
GRANT ALL ON public.employee_skills TO service_role;

GRANT SELECT ON public.employee_activity TO authenticated;
GRANT INSERT ON public.employee_activity TO authenticated;
GRANT ALL ON public.employee_activity TO service_role;

GRANT SELECT ON public.trainings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;

GRANT SELECT ON public.deadlines TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT ALL ON public.deadlines TO service_role;

-- Enable RLS
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.employee_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage profiles"
ON public.employee_profiles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- RLS Policies for employee_skills
CREATE POLICY "Everyone can view skills"
ON public.employee_skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage skills"
ON public.employee_skills FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_profiles_updated_at
BEFORE UPDATE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at
BEFORE UPDATE ON public.trainings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deadlines_updated_at
BEFORE UPDATE ON public.deadlines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- RLS Policies for employee_activity
CREATE POLICY "Users can view their own activity"
ON public.employee_activity FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Admins can view all activity"
ON public.employee_activity FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- RLS Policies for trainings
CREATE POLICY "Authenticated users can view all trainings"
ON public.trainings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage trainings"
ON public.trainings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- RLS Policies for deadlines
CREATE POLICY "Authenticated users can view all deadlines"
ON public.deadlines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage deadlines"
ON public.deadlines FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- Secure search path for the update trigger function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
-- Drop the existing constraint
ALTER TABLE public.employee_profiles 
DROP CONSTRAINT IF EXISTS employee_profiles_gestor_id_fkey;

-- Re-add it with ON DELETE SET NULL
ALTER TABLE public.employee_profiles 
ADD CONSTRAINT employee_profiles_gestor_id_fkey 
FOREIGN KEY (gestor_id) 
REFERENCES public.employee_profiles(id) 
ON DELETE SET NULL;
-- Add coordenador_id column if it doesn't exist
ALTER TABLE public.employee_profiles 
ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES public.employee_profiles(id) ON DELETE SET NULL;

-- Ensure constraints are named consistently
ALTER TABLE public.employee_profiles 
DROP CONSTRAINT IF EXISTS employee_profiles_coordenador_id_fkey;

ALTER TABLE public.employee_profiles 
ADD CONSTRAINT employee_profiles_coordenador_id_fkey 
FOREIGN KEY (coordenador_id) 
REFERENCES public.employee_profiles(id) 
ON DELETE SET NULL;
ALTER TABLE public.employee_profiles 
ADD COLUMN foco TEXT,
ADD COLUMN perfil TEXT,
ADD COLUMN atuacao TEXT,
ADD COLUMN competencias_responsabilidades TEXT,
ADD COLUMN conhecimento_tecnico TEXT;-- Adiciona a coluna company_number à tabela companies
ALTER TABLE public.companies ADD COLUMN company_number TEXT;

-- Concede permissões para a nova coluna (embora o GRANT anterior na tabela deva cobrir, é bom garantir se for específico)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
-- Função para resetar as demandas
CREATE OR REPLACE FUNCTION public.reset_monthly_tasks()
RETURNS void AS $$
BEGIN
  -- Cancelar demandas pendentes (que não estão concluídas nem canceladas)
  UPDATE public.tasks
  SET status = 'cancelada',
      updated_at = now()
  WHERE status NOT IN ('concluida', 'cancelada');

  -- Opcional: Remover demandas do mês anterior se necessário para "limpar" a tela
  -- DELETE FROM public.tasks WHERE status IN ('concluida', 'cancelada') AND updated_at < date_trunc('month', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO authenticated;-- Ajustar função com search_path seguro e restringir acesso público
CREATE OR REPLACE FUNCTION public.reset_monthly_tasks()
RETURNS void AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'cancelada',
      updated_at = now()
  WHERE status NOT IN ('concluida', 'cancelada');
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Revogar acesso público (anon) por padrão
REVOKE EXECUTE ON FUNCTION public.reset_monthly_tasks() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_tasks() FROM anon;

-- Permitir apenas usuários logados e o sistema
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO service_role;CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','gerente')
  )
$function$;-- Add columns for better sector management
ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS sector_name TEXT CHECK (sector_name IN ('fiscal', 'contabil', 'comercial', 'departamento pessoal')),
ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Apps are viewable by everyone" ON public.apps;
DROP POLICY IF EXISTS "Admins have full access to apps" ON public.apps;
DROP POLICY IF EXISTS "Coordinators can manage apps in their sector" ON public.apps;

-- Policy: Everyone can view active apps
CREATE POLICY "Apps are viewable by everyone" 
ON public.apps 
FOR SELECT 
USING (active = true);

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to apps" 
ON public.apps 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy: Coordinators can manage apps in their sector
CREATE POLICY "Coordinators can manage apps in their sector" 
ON public.apps 
FOR ALL 
TO authenticated
USING (
  coordenador_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'coordenador'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps TO authenticated;
GRANT ALL ON public.apps TO service_role;
