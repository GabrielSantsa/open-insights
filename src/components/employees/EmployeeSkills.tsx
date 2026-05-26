import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Award, 
  CheckCircle2, 
  Wrench,
  ChevronRight,
  Plus,
  Target,
  Search,
  BookOpen
} from "lucide-react";
import { ModuleEmptyState } from "@/components/employees/ModuleEmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface EmployeeSkillsProps {
  employeeId: string;
  employeeData?: any;
}

export function EmployeeSkills({ employeeId, employeeData }: EmployeeSkillsProps) {
  const { data: employeeProfile } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("id", employeeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !employeeData,
  });

  const employee = employeeData || employeeProfile;

  const { data: skills, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-skills", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_skills")
        .select("*")
        .eq("colaborador_id", employeeId);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-destructive font-medium mb-4">Erro ao carregar competências.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  const responsabilidadesDb = skills?.filter(s => s.tipo === 'responsabilidade') || [];
  const conhecimentosDb = skills?.filter(s => s.tipo === 'conhecimento') || [];

  // Parse textarea content into individual items (split by newlines, semicolons, or bullets)
  const parseTextToItems = (text?: string | null): string[] => {
    if (!text) return [];
    return text
      .split(/\r?\n|;|•|·/)
      .map(s => s.replace(/^[\s\-\*\d\.\)]+/, "").trim())
      .filter(Boolean);
  };

  const responsabilidadesFromText = parseTextToItems(employee?.competencias_responsabilidades).map((c, i) => ({
    id: `resp-text-${i}`,
    competencia: c,
  }));
  const conhecimentosFromText = parseTextToItems(employee?.conhecimento_tecnico).map((c, i) => ({
    id: `conh-text-${i}`,
    competencia: c,
    nivel: null as number | null,
  }));

  const responsabilidades = responsabilidadesDb.length > 0
    ? responsabilidadesDb
    : responsabilidadesFromText;
  const conhecimentos = conhecimentosDb.length > 0
    ? conhecimentosDb
    : conhecimentosFromText;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Responsabilidades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Responsabilidades
            </h3>
            <Badge variant="secondary" className="rounded-full">{responsabilidades.length}</Badge>
          </div>

          <div className="grid gap-3">
            {responsabilidades.length > 0 ? (
              responsabilidades.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.competencia}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-tight font-medium">Rotina Operacional</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <ModuleEmptyState 
                icon={Target}
                title="Sem responsabilidades"
                description="Nenhuma responsabilidade operacional foi vinculada a este perfil."
              />
            )}
          </div>
        </div>

        {/* Conhecimentos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Conhecimentos Técnicos
            </h3>
            <Badge variant="secondary" className="rounded-full">{conhecimentos.length}</Badge>
          </div>

          <div className="grid gap-4">
            {conhecimentos.length > 0 ? (
              conhecimentos.map((item: any) => (
                item.nivel !== null && item.nivel !== undefined ? (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm font-semibold">{item.competencia}</span>
                      <span className="text-xs font-bold text-primary">{item.nivel || 0}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={item.nivel || 0} className="h-2 rounded-full" />
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-full -z-10" />
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="p-4 rounded-xl border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.competencia}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-tight font-medium">Conhecimento Técnico</p>
                      </div>
                    </div>
                  </div>
                )
              ))
            ) : (
              <ModuleEmptyState 
                icon={Award}
                title="Sem conhecimentos"
                description="Nenhum conhecimento técnico ou competência foi listada ainda."
              />
            )}
          </div>
        </div>
      </div>

      
      {/* Cards de resumo de Especialidade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Foco</p>
              <p className="text-sm font-semibold">{employee?.foco || "Não definido"}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Perfil</p>
              <p className="text-sm font-semibold">{employee?.perfil || "Não definido"}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Atuação</p>
              <p className="text-sm font-semibold">{employee?.atuacao || "Não definido"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
