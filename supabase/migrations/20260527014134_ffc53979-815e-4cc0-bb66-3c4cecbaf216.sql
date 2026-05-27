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
GRANT EXECUTE ON FUNCTION public.reset_monthly_tasks() TO authenticated;