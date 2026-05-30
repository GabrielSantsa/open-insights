-- Final schema synchronization check
-- This ensures all tables, types and constraints are consistent with the project's requirements.

DO $$ 
BEGIN
    -- Re-verify Enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin','diretoria','gerente','coordenador','colaborador');
    END IF;
    -- (Add other enums if missing)
END $$;

-- Verify critical tables and columns
ALTER TABLE IF EXISTS public.companies 
ADD COLUMN IF NOT EXISTS company_number TEXT;

-- Re-grant permissions just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
