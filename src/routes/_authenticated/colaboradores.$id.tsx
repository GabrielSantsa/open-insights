import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  Edit2,
  Save,
  Copy,
  CheckCircle2,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEE_STATUS_LABELS, isAdmin, type EmployeeStatus } from "@/lib/permissions";
import { EmployeeStatusBadge } from "@/components/employees/EmployeeStatusBadge";
import { ModuleEmptyState } from "@/components/employees/ModuleEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeActivity } from "@/components/employees/EmployeeActivity";
import { EmployeeSkills } from "@/components/employees/EmployeeSkills";
import { EmployeeSignature } from "@/components/employees/EmployeeSignature";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  component: ColaboradorDetail,
});

function ColaboradorDetail() {
  const { id } = Route.useParams();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

      const [gestorRes, coordenadorRes, subordinadosRes] = await Promise.all([
        data.gestor_id
          ? supabase
              .from("employee_profiles")
              .select("id, nome_completo, cargo, foto_url")
              .eq("id", data.gestor_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        data.coordenador_id
          ? supabase
              .from("employee_profiles")
              .select("id, nome_completo, cargo, foto_url")
              .eq("id", data.coordenador_id)
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
        coordenador: coordenadorRes.data,
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

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employee_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Colaborador removido com sucesso!");
      navigate({ to: "/colaboradores" });
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover colaborador: ${err.message}`);
    },
  });

  const handleUpdate = (data: any) => {
    updateEmployeeMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteEmployeeMutation.mutate();
  };


  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/colaboradores" className="hover:text-primary transition-colors">Colaboradores</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{employee.nome_completo}</span>
        </nav>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2 h-9" onClick={() => {
            navigator.clipboard.writeText(employee.email_corporativo);
            toast.success("E-mail copiado!");
          }}>
            <Copy className="w-4 h-4" />
            Copiar E-mail
          </Button>
          
          {isUserAdmin && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9 border-destructive/20 text-destructive hover:bg-destructive/5 flex-1 sm:flex-none">
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de <strong>{employee.nome_completo}</strong> e removerá seus dados de nossos servidores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir Colaborador
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={() => setIsEditDrawerOpen(true)} variant="outline" className="gap-2 h-9 border-primary/20 text-primary hover:bg-primary/5 flex-1 sm:flex-none">
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </Button>
            </div>
          )}
        </div>
      </div>


      <div className="flex flex-col gap-8">
        {/* Topo - Perfil Resumo */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Lado Esquerdo - Perfil Resumo */}
          <div className="lg:w-1/3 space-y-6">
            <Card className="border-border/40 overflow-hidden shadow-sm h-full">
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
                  <EmployeeStatusBadge status={employee.status as EmployeeStatus} variant="outline" className="h-6 px-3" />
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
          </div>

          {/* Estrutura de Reporte - Agora ao lado do perfil, mantendo a responsividade */}
          <div className="lg:w-2/3 space-y-6">
            <Card className="border-border/40 shadow-sm h-full">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Estrutura de Reporte
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {employee.gestor && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border shadow-sm">
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage src={employee.gestor.foto_url || ""} />
                          <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                            {employee.gestor.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer group" 
                        onClick={() => employee.gestor && navigate({ to: "/colaboradores/$id", params: { id: employee.gestor.id } })}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Gestor Direto</p>
                        <p className="font-medium truncate group-hover:text-primary transition-colors">{employee.gestor.nome_completo}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{employee.gestor.cargo}</p>
                      </div>
                    </div>
                  )}
                  {employee.coordenador && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border shadow-sm">
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage src={employee.coordenador.foto_url || ""} />
                          <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                            {employee.coordenador.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer group" 
                        onClick={() => employee.coordenador && navigate({ to: "/colaboradores/$id", params: { id: employee.coordenador.id } })}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Coordenador</p>
                        <p className="font-medium truncate group-hover:text-primary transition-colors">{employee.coordenador.nome_completo}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{employee.coordenador.cargo}</p>
                      </div>
                    </div>
                  )}
                  {!employee.gestor && !employee.coordenador && (
                    <p className="text-xs text-muted-foreground italic col-span-full py-4">Nenhuma estrutura de reporte atribuída.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Conteúdo Principal em Abas - Agora abaixo de tudo */}
        <div className="w-full space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="w-max sm:w-full justify-start bg-muted/50 p-1 h-12 gap-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="hierarquia" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Hierarquia
              </TabsTrigger>
              <TabsTrigger value="demandas" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Briefcase className="w-4 h-4 mr-2" />
                Demandas
              </TabsTrigger>
              <TabsTrigger value="competencias" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Competências
              </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
                      <span className="font-medium">
                        {(() => {
                          const start = new Date(employee.data_admissao);
                          const now = new Date();
                          const diffTime = Math.abs(now.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const years = Math.floor(diffDays / 365);
                          const months = Math.floor((diffDays % 365) / 30);
                          return `${years} ano(s) e ${months} mês(es)`;
                        })()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="hierarquia" className="mt-6">
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Organograma Interno</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest border-b pb-2">Coordenação</h4>
                      {employee.coordenador ? (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/30 transition-all group">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-background">
                              <AvatarImage src={employee.coordenador.foto_url || ""} />
                              <AvatarFallback className="bg-primary/5 text-primary">{employee.coordenador.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors">{employee.coordenador.nome_completo}</p>
                              <p className="text-xs text-muted-foreground font-medium">{employee.coordenador.cargo}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8">
                            <Link to="/colaboradores/$id" params={{ id: employee.coordenador.id }}>
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic pl-2">Nenhum coordenador vinculado.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest border-b pb-2">Gestão Direta</h4>
                      {employee.gestor ? (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/30 transition-all group">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-background">
                              <AvatarImage src={employee.gestor.foto_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary">{employee.gestor.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors">{employee.gestor.nome_completo}</p>
                              <p className="text-xs text-muted-foreground font-medium">{employee.gestor.cargo}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8">
                            <Link to="/colaboradores/$id" params={{ id: employee.gestor.id }}>
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <ModuleEmptyState 
                          title="Sem gestão"
                          description="Este colaborador não possui um gestor direto vinculado."
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Equipe Direta</h4>
                      <Badge variant="secondary" className="rounded-full">{employee.subordinados?.length || 0} Membros</Badge>
                    </div>
                    {employee.subordinados && employee.subordinados.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {employee.subordinados.map((sub: any) => (
                          <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background hover:border-primary/40 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={sub.foto_url || ""} />
                                <AvatarFallback>{sub.nome_completo.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{sub.nome_completo}</p>
                                <p className="text-[11px] text-muted-foreground font-medium truncate">{sub.cargo}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8">
                              <Link to="/colaboradores/$id" params={{ id: sub.id }}>
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-xl text-center text-sm text-muted-foreground bg-muted/20 italic">
                        Este colaborador não possui equipe vinculada.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="demandas" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Em andamento', count: 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Pendentes', count: 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Concluídas', count: 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Atrasadas', count: 0, color: 'text-rose-600', bg: 'bg-rose-50' }
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
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lista de Tarefas Recentes</CardTitle>
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 font-bold uppercase text-primary">Ver Todas</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ModuleEmptyState 
                    icon={History}
                    title="Nenhuma demanda vinculada"
                    description="As demandas operacionais serão listadas aqui conforme forem criadas e atribuídas."
                  />
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="competencias" className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-sm font-semibold">Competências & Responsabilidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmployeeSkills employeeId={id} />
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
