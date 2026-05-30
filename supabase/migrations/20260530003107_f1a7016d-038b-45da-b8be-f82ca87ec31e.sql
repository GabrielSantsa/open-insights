-- Add columns for better sector management
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
