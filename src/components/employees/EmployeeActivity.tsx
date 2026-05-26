import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LogIn, 
  BookOpen, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmployeeActivityProps {
  employeeId: string;
}

const actionIcons: Record<string, any> = {
  login: LogIn,
  leitura_procedimento: BookOpen,
  conclusao_tarefa: CheckCircle2,
  download_documento: Download,
  atualizacao: RefreshCw,
  default: Clock,
};

const actionLabels: Record<string, string> = {
  login: "Login no sistema",
  leitura_procedimento: "Leitura de procedimento",
  conclusao_tarefa: "Tarefa concluída",
  download_documento: "Download de documento",
  atualizacao: "Atualização realizada",
};

export function EmployeeActivity({ employeeId }: EmployeeActivityProps) {
  const { data: activities, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-activity", employeeId],
    queryFn: async () => {
      // We need to find the user_id for this employee_profile
      const { data: profile } = await supabase
        .from("employee_profiles")
        .select("user_id")
        .eq("id", employeeId)
        .single();

      if (!profile?.user_id) return [];

      const { data, error } = await supabase
        .from("employee_activity")
        .select("*")
        .eq("usuario_id", profile.user_id)
        .order("data", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-destructive font-medium mb-4">Erro ao carregar histórico de atividades.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma atividade registrada recentemente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Linha do Tempo</h3>
        <Badge variant="outline" className="font-normal">{activities.length} ações recentes</Badge>
      </div>

      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/60 before:via-border/40 before:to-transparent">
        {activities.map((activity) => {
          const Icon = actionIcons[activity.acao] || actionIcons.default;
          const label = actionLabels[activity.acao] || activity.acao;
          const date = new Date(activity.data);

          return (
            <div key={activity.id} className="relative flex items-start gap-4 group">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm group-hover:border-primary/50 transition-colors z-10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              
              <Card className="flex-1 border-border/40 hover:border-border transition-all shadow-none bg-background/50 group-hover:bg-background">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {typeof activity.detalhes === 'string' 
                        ? activity.detalhes 
                        : (activity.detalhes as any)?.descricao || "Nenhum detalhe adicional disponível."}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-foreground">
                        {format(date, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(date, "HH:mm")}
                      </p>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
