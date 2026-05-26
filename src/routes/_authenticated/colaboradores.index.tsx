import { useState, useMemo } from "react";
import { Search, UserPlus, LayoutGrid, List, FilterX, Building2, MapPin, Mail, Phone, ExternalLink, Users, Save, X, MoreHorizontal, Edit, Trash, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_STATUS_LABELS, isAdmin, type EmployeeStatus } from "@/lib/permissions";
import { EmployeeStatusBadge } from "@/components/employees/EmployeeStatusBadge";
import { ModuleEmptyState } from "@/components/employees/ModuleEmptyState";
import { toast } from "sonner";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


export function ColaboradoresPage() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isUserAdmin = isAdmin(roles);


  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select(`
          *,
          gestor:employee_profiles!employee_profiles_gestor_id_fkey(nome_completo),
          coordenador:employee_profiles!employee_profiles_coordenador_id_fkey(nome_completo)
        `)
        .order("nome_completo");
      
      if (error) throw error;
      return data;
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (newData: any) => {
      const { error } = await supabase
        .from("employee_profiles")
        .insert([newData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Colaborador criado com sucesso!");
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar colaborador: ${err.message}`);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("employee_profiles")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Colaborador atualizado com sucesso!");
      setIsDrawerOpen(false);
      setEditingEmployee(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar colaborador: ${err.message}`);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Colaborador removido com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingEmployee(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover colaborador: ${err.message}`);
    },
  });


  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const matchesSearch = 
        emp.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
        emp.email_corporativo.toLowerCase().includes(search.toLowerCase()) ||
        emp.cargo.toLowerCase().includes(search.toLowerCase()) ||
        emp.setor.toLowerCase().includes(search.toLowerCase());
      
      const matchesSetor = setorFilter === "all" || emp.setor === setorFilter;
      const matchesStatus = statusFilter === "all" || emp.status === statusFilter;

      return matchesSearch && matchesSetor && matchesStatus;
    });
  }, [employees, search, setorFilter, statusFilter]);

  const setores = useMemo(() => {
    if (!employees) return [];
    return Array.from(new Set(employees.map(e => e.setor))).sort();
  }, [employees]);

  const clearFilters = () => {
    setSearch("");
    setSetorFilter("all");
    setStatusFilter("all");
  };

  const handleSave = (data: any) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleEditClick = (emp: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmployee(emp);
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = (emp: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingEmployee(emp);
    setIsDeleteDialogOpen(true);
  };


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-destructive font-medium mb-4">Erro ao carregar colaboradores</p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encontre rapidamente contatos internos e estrutura da equipe.
          </p>
        </div>
        {isUserAdmin && (
          <Sheet open={isDrawerOpen} onOpenChange={(open) => {
            setIsDrawerOpen(open);
            if (!open) setEditingEmployee(null);
          }}>
            <SheetTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={() => setEditingEmployee(null)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Novo colaborador
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-6 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <SheetTitle>{editingEmployee ? "Editar Colaborador" : "Novo Colaborador"}</SheetTitle>
                    <SheetDescription>
                      {editingEmployee 
                        ? `Altere as informações de ${editingEmployee.nome_completo}.` 
                        : "Cadastre um novo membro na equipe interna."}
                    </SheetDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      const form = document.querySelector('form');
                      if (form) form.requestSubmit();
                    }}
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                    size="sm"
                    className="gap-2"
                  >
                    {createEmployeeMutation.isPending || updateEmployeeMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </SheetHeader>
              <EmployeeForm 
                initialData={editingEmployee}
                onSubmit={handleSave} 
                onCancel={() => setIsDrawerOpen(false)} 
                isSubmitting={createEmployeeMutation.isPending || updateEmployeeMutation.isPending} 
              />

            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, e-mail, cargo ou setor..." 
            className="pl-9 bg-card border-border/40 focus:border-primary/50" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={setorFilter} onValueChange={setSetorFilter}>
          <SelectTrigger className="bg-card border-border/40">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-card border-border/40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="ferias">Férias</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="desligado">Desligado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando <strong>{filteredEmployees.length}</strong> colaboradores
          </p>
          {(search || setorFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 px-2">
              <FilterX className="w-3 h-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
          <Button 
            variant={view === "cards" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant={view === "table" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => setView("table")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-border/40 shadow-none">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <ModuleEmptyState 
          title="Nenhum colaborador encontrado"
          description="Não encontramos nenhum registro com os filtros atuais. Tente ajustar sua busca ou limpar os filtros."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredEmployees.map((emp) => (
            <Link key={emp.id} to="/colaboradores/$id" params={{ id: emp.id }}>

              <Card className={cn(
                "hover:shadow-lg hover:border-primary/20 transition-all group cursor-pointer border-border/60 bg-card overflow-hidden h-full flex flex-col",
                emp.status === "desligado" && "opacity-60 grayscale-[0.5]"
              )}>
                <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                  <Avatar className="h-14 w-14 border-2 border-background shadow-sm ring-1 ring-border/20 group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={emp.foto_url || ""} />
                    <AvatarFallback className="bg-primary/5 text-primary text-lg font-medium">
                      {emp.nome_completo.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                        {emp.nome_completo}
                      </h3>
                      <div className="flex items-center gap-1">
                        <EmployeeStatusBadge status={emp.status as EmployeeStatus} />
                        {isUserAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEditClick(emp, e)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => handleDeleteClick(emp, e)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{emp.cargo}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{emp.setor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{emp.email_corporativo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">Ramal: {emp.ramal || "-"}</span>
                  </div>
                </CardContent>
                <div className="mt-auto px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Gestor:</span>
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {emp.gestor ? emp.gestor.nome_completo : "Não definido"}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card overflow-x-auto shadow-sm animate-in fade-in duration-500">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="min-w-[200px] text-[10px] font-bold uppercase tracking-widest py-4">Colaborador</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Setor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">E-mail</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Ramal</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Gestor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Status</TableHead>
                {isUserAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow 
                  key={emp.id} 
                  className={cn(
                    "cursor-pointer group hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0",
                    emp.status === "desligado" && "opacity-60 grayscale-[0.5]"
                  )} 
                  onClick={() => navigate({ to: "/colaboradores/$id", params: { id: emp.id } })}
                >

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-border/10">
                        <AvatarImage src={emp.foto_url || ""} />
                        <AvatarFallback className="text-xs">
                          {emp.nome_completo.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {emp.nome_completo}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{emp.cargo}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{emp.setor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.email_corporativo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.ramal || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emp.gestor ? emp.gestor.nome_completo : "-"}
                  </TableCell>
                  <TableCell>
                    <EmployeeStatusBadge status={emp.status as EmployeeStatus} variant="outline" />
                  </TableCell>
                  {isUserAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEditClick(emp, e)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(emp, e)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de <strong>{deletingEmployee?.nome_completo}</strong> e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingEmployee(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingEmployee && deleteEmployeeMutation.mutate(deletingEmployee.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Colaborador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  component: ColaboradoresPage,
});
