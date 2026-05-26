import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  UserCircle,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  History,
  GraduationCap,
  LayoutDashboard,
  Edit2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEE_STATUS_LABELS, isAdmin } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  component: ColaboradorDetail,
});

function ColaboradorDetail() {
  const { id } = Route.useParams();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const isUserAdmin = isAdmin(roles);


  const { data: employee, isLoading, error } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*, skills:employee_skills(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [gestorRes, subordinadosRes] = await Promise.all([
        data.gestor_id
          ? supabase
              .from("employee_profiles")
              .select("id, nome_completo, cargo, foto_url")
              .eq("id", data.gestor_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("employee_profiles")
          .select("id, nome_completo, cargo, foto_url")
          .eq("gestor_id", id),
      ]);

      return {
        ...data,
        gestor: gestorRes.data,
        subordinados: subordinadosRes.data ?? [],
      };
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { error } = await supabase
        .from("employee_profiles")
        .update(updatedData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Perfil atualizado com sucesso!");
      setIsEditDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar perfil: ${err.message}`);
    },
  });

  const handleUpdate = (data: any) => {
    updateEmployeeMutation.mutate(data);
  };


  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-1" />
          <Skeleton className="h-[400px] md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-destructive font-medium mb-4">Colaborador não encontrado</p>
        <Button asChild>
          <Link to="/colaboradores">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/colaboradores" className="hover:text-primary transition-colors">Colaboradores</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{employee.nome_completo}</span>
        </nav>
        
        {isUserAdmin && (
          <Button onClick={() => setIsEditDrawerOpen(true)} variant="outline" className="gap-2">
            <Edit2 className="w-4 h-4" />
            Editar Perfil
          </Button>
        )}
      </div>


      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lado Esquerdo - Perfil Resumo */}
        <div className="lg:w-1/3 space-y-6">
          <Card className="border-border/40 overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5" />
            <CardContent className="pt-0 -mt-12 text-center">
              <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-md">
                <AvatarImage src={employee.foto_url || ""} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {employee.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className="mt-4 text-xl font-bold">{employee.nome_completo}</h1>
              <p className="text-muted-foreground text-sm font-medium">{employee.cargo}</p>
              <div className="mt-3 flex justify-center">
                <Badge variant="outline" className={`
                  font-normal px-2.5 py-0.5
                  ${employee.status === "ativo" ? "border-emerald-200 text-emerald-700 bg-emerald-50/50" : ""}
                `}>
                  {EMPLOYEE_STATUS_LABELS[employee.status]}
                </Badge>
              </div>

              <div className="mt-8 space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Setor</p>
                    <p className="font-medium">{employee.setor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">E-mail</p>
                    <p className="font-medium truncate">{employee.email_corporativo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Telefone/Ramal</p>
                    <p className="font-medium">{employee.telefone || "-"} (Ramal: {employee.ramal || "-"})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Localização</p>
                    <p className="font-medium">{employee.localizacao || "Sede Principal"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gestor Direto */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Estrutura de Reporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.gestor ? (
                <div className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-border/60 hover:bg-muted/30 transition-all cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.gestor.foto_url || ""} />
                    <AvatarFallback className="text-xs">
                      {employee.gestor.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Gestor Direto</p>
                    <p className="text-sm font-semibold truncate">{employee.gestor.nome_completo}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{employee.gestor.cargo}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum gestor atribuído.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito - Conteúdo Principal */}
        <div className="lg:w-2/3 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 p-1 h-12 gap-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="skills" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <GraduationCap className="w-4 h-4 mr-2" />
                Competências
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <History className="w-4 h-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Informações de Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Data de Admissão</span>
                      <span className="font-medium">
                        {new Date(employee.data_admissao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Tempo de Empresa</span>
                      <span className="font-medium">Calculando...</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Cargo Padronizado</span>
                      <span className="font-medium text-primary bg-primary/5 px-2 py-0.5 rounded text-xs uppercase tracking-wide">
                        {employee.cargo_padronizado || employee.cargo}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <UserCircle className="w-4 h-4 text-primary" />
                      Status Institucional
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      {employee.informacoes_institucionais || "Nenhuma informação institucional adicional cadastrada."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Equipe Direta</CardTitle>
                </CardHeader>
                <CardContent>
                  {employee.subordinados && employee.subordinados.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {employee.subordinados.map((sub: any) => (
                        <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={sub.foto_url || ""} />
                            <AvatarFallback className="text-xs">
                              {sub.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{sub.nome_completo}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{sub.cargo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                      Este colaborador não possui liderados diretos.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Responsabilidades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {employee.skills?.filter((s: any) => s.tipo === 'responsabilidade').map((skill: any) => (
                      <div key={skill.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/30 border border-emerald-100/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm text-emerald-950">{skill.competencia}</span>
                      </div>
                    )) || <p className="text-sm text-muted-foreground italic">Nenhuma responsabilidade listada.</p>}
                  </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Conhecimentos</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {employee.skills?.filter((s: any) => s.tipo === 'conhecimento').map((skill: any) => (
                      <Badge key={skill.id} variant="secondary" className="px-2 py-1 font-normal">
                        {skill.competencia}
                      </Badge>
                    )) || <p className="text-sm text-muted-foreground italic">Nenhum conhecimento listado.</p>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-0">
                  <div className="p-8 text-center">
                    <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">O histórico de atividades internas será habilitado em breve.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Sheet open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SheetTitle>Editar Colaborador</SheetTitle>
                <SheetDescription>Altere as informações de {employee.nome_completo}.</SheetDescription>
              </div>
              <Button 
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
                disabled={updateEmployeeMutation.isPending}
                size="sm"
                className="gap-2"
              >
                {updateEmployeeMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </Button>
            </div>
          </SheetHeader>
          <EmployeeForm 
            initialData={employee} 
            onSubmit={handleUpdate} 
            onCancel={() => setIsEditDrawerOpen(false)}
            isSubmitting={updateEmployeeMutation.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
