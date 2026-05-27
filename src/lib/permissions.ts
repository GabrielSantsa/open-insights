import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type NewsStatus = Database["public"]["Enums"]["news_status"];
export type ProcedureStatus = Database["public"]["Enums"]["procedure_status"];
export type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  ferias: "Férias",
  desligado: "Desligado",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  diretoria: "Diretoria",
  gerente: "Gerente",
  coordenador: "Coordenador",
  colaborador: "Colaborador",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  nova: "Nova",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function isApprover(roles: AppRole[]): boolean {
  return roles.some((r) =>
    ["admin", "diretoria", "gerente", "coordenador"].includes(r),
  );
}

export function isAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("gerente");
}

export function hasGlobalSectorAccess(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("diretoria");
}
