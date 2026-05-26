-- Adiciona a coluna company_number à tabela companies
ALTER TABLE public.companies ADD COLUMN company_number TEXT;

-- Concede permissões para a nova coluna (embora o GRANT anterior na tabela deva cobrir, é bom garantir se for específico)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
