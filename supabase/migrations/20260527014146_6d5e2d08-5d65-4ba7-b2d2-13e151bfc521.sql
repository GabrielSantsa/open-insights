-- Ajustar função com search_path seguro e restringir acesso público
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
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO service_role;