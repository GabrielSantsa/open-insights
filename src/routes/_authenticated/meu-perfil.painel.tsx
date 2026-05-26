import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleEmptyState } from "@/components/employees/ModuleEmptyState";
import { 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Calendar,
  History,
  TrendingUp,
  Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/meu-perfil/painel")({
  component: MeuPainel,
});

function MeuPainel() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["my-dashboard-data", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [tasks, procedures, activities, trainings, deadlines, profile] = await Promise.all([
        supabase.from("tasks").select("*").eq("assignee_id", user.id),
        supabase.from("procedure_favorites").select("*, procedures(*)").eq("user_id", user.id).limit(3),
        supabase.from("employee_activity").select("*").eq("usuario_id", user.id).order("data", { ascending: false }).limit(5),
        supabase.from("trainings").select("*").eq("colaborador_id", user.id).gte("data", new Date().toISOString()).limit(3),
        supabase.from("deadlines").select("*").eq("colaborador_id", user.id).gte("data_limite", new Date().toISOString()).limit(3),
        supabase.from("employee_profiles").select("id").eq("user_id", user.id).single()
      ]);

      return {
        tasks: tasks.data || [],
        favorites: procedures.data || [],
        activities: activities.data || [],
        trainings: trainings.data || [],
        deadlines: deadlines.data || [],
        profileId: profile.data?.id
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const pendingTasks = dashboardData?.tasks.filter(t => t.status !== 'concluida') || [];
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Painel</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu resumo operacional diário.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Link to="/colaboradores/$id" params={{ id: dashboardData?.profileId || '' }}>
            Ver Perfil Público
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 shadow-sm bg-gradient-to-br from-background to-amber-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100/50 text-amber-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tarefas Ativas</p>
              <p className="text-2xl font-black">{pendingTasks.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm bg-gradient-to-br from-background to-rose-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-100/50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Em Atraso</p>
              <p className="text-2xl font-black">{overdueTasks.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm bg-gradient-to-br from-background to-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Favoritos</p>
              <p className="text-2xl font-black">{dashboardData?.favorites.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm bg-gradient-to-br from-background to-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100/50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Prazos Próximos</p>
              <p className="text-2xl font-black">{dashboardData?.deadlines.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demandas */}
        <Card className="border-border/40 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Minhas Demandas</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
              <Link to="/demandas">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {pendingTasks.length > 0 ? (
              <div className="space-y-3">
                {pendingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Prazo: {task.due_date ? format(new Date(task.due_date), "dd/MM/yyyy") : 'S/P'}</p>
                    </div>
                    <Badge variant={task.priority === 'alta' || task.priority === 'urgente' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <ModuleEmptyState 
                icon={CheckSquare}
                title="Tudo em dia!"
                description="Você não possui demandas pendentes no momento. Aproveite para atualizar seus conhecimentos."
              />
            )}
          </CardContent>
        </Card>

        {/* Procedimentos Favoritos */}
        <Card className="border-border/40 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Procedimentos Favoritos</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
              <Link to="/procedimentos">Abrir Biblioteca</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {dashboardData?.favorites && dashboardData.favorites.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.favorites.map((fav: any) => (
                  <div key={fav.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-semibold truncate">{fav.procedures?.titulo || 'Procedimento'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <ModuleEmptyState 
                icon={Star}
                title="Sem favoritos"
                description="Favorite os procedimentos que você mais utiliza para acessá-los rapidamente aqui."
              />
            )}
          </CardContent>
        </Card>

        {/* Histórico Recente */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Atividade Recente</CardTitle>
            <History className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData?.activities && dashboardData.activities.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.activities.map((act: any) => (
                  <div key={act.id} className="flex gap-3 relative before:absolute before:left-[15px] before:top-[30px] before:bottom-[-10px] before:w-[1px] before:bg-border last:before:hidden">
                    <div className="h-8 w-8 rounded-full border bg-background flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <Clock className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{act.acao.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(act.data), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma atividade registrada hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prazos e Treinamentos */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Próximos Compromissos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData?.trainings.length === 0 && dashboardData?.deadlines.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  <p className="text-sm">Nenhum compromisso agendado para os próximos dias.</p>
                </div>
              ) : (
                <>
                  {dashboardData?.trainings.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                        <span className="text-[10px] font-bold leading-none">{format(new Date(t.data), "MMM", { locale: ptBR })}</span>
                        <span className="text-sm font-black leading-none">{format(new Date(t.data), "dd")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-tighter text-primary">Treinamento</p>
                        <p className="text-sm font-bold truncate">{t.titulo}</p>
                      </div>
                    </div>
                  ))}
                  {dashboardData?.deadlines.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                      <div className="h-10 w-10 rounded-lg bg-blue-100/50 flex flex-col items-center justify-center text-blue-600 shrink-0">
                        <span className="text-[10px] font-bold leading-none">{format(new Date(d.data_limite), "MMM", { locale: ptBR })}</span>
                        <span className="text-sm font-black leading-none">{format(new Date(d.data_limite), "dd")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-tighter text-blue-600">Prazo Fiscal</p>
                        <p className="text-sm font-bold truncate">{d.titulo}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
