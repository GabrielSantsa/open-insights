-- Drop the existing constraint
ALTER TABLE public.employee_profiles 
DROP CONSTRAINT IF EXISTS employee_profiles_gestor_id_fkey;

-- Re-add it with ON DELETE SET NULL
ALTER TABLE public.employee_profiles 
ADD CONSTRAINT employee_profiles_gestor_id_fkey 
FOREIGN KEY (gestor_id) 
REFERENCES public.employee_profiles(id) 
ON DELETE SET NULL;
