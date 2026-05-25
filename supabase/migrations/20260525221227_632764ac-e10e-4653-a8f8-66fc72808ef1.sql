
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
