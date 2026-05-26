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
