import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, History } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleEmptyState } from "./ModuleEmptyState";

interface EmployeeTasksTabProps {
  userId: string | null;
}

export function EmployeeTasksTab({ userId }: EmployeeTasksTabProps) {
  const { data: employeeTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ["employee-tasks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_assignee_id_fkey(full_name), creator:profiles!tasks_creator_id_fkey(full_name)")
        .eq("assignee_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (loadingTasks) return <Skeleton className="h-[300px] w-full" />;

  const counts = {
    andamento: employeeTasks?.filter((t) => t.status === "em_andamento").length || 0,
    pendentes: employeeTasks?.filter((t) => t.status === "nova" || t.status === "aguardando").length || 0,
    concluidas: employeeTasks?.filter((t) => t.status === "concluida").length || 0,
    atrasadas:
      employeeTasks?.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "concluida").length || 0,
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Em andamento", count: counts.andamento, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pendentes", count: counts.pendentes, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Concluídas", count: counts.concluidas, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Atrasadas", count: counts.atrasadas, color: "text-rose-600", bg: "bg-rose-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className={`border-none shadow-none ${kpi.bg}`}>
            <CardContent className="p-4 pt-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Lista de Tarefas Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-[10px] h-7 px-2 font-bold uppercase text-primary">
              <Link to="/demandas">Ver Todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {employeeTasks && employeeTasks.length > 0 ? (
            <div className="divide-y">
              {employeeTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] uppercase">{task.priority}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ModuleEmptyState
              icon={History}
              title="Nenhuma demanda vinculada"
              description="As demandas operacionais serão listadas aqui conforme forem criadas e atribuídas."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
