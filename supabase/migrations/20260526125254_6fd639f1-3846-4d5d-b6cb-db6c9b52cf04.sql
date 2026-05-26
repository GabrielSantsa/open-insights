DROP POLICY IF EXISTS companies_read ON public.companies;
CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated
  USING (true);