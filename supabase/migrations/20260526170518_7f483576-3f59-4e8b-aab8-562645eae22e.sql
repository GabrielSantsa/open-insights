-- Create employee status enum
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
