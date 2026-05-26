import { useState, useMemo } from "react";
import { Search, UserPlus, LayoutGrid, List, FilterX, Building2, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/permissions";
import { toast } from "sonner";
import { Link, createFileRoute } from "@tanstack/react-router";
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

export function ColaboradoresPage() {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select(`
          *,
          gestor:gestor_id(nome_completo)
        `)
        .order("nome_completo");
      
      if (error) throw error;
      return data;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">
            Encontre rapidamente contatos internos e estrutura da equipe.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo colaborador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, e-mail, cargo ou setor..." 
            className="pl-9 bg-card" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={setorFilter} onValueChange={setSetorFilter}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-card">
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
            <Card key={i} className="overflow-hidden">
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
        <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-xl bg-muted/20 p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">Nenhum colaborador encontrado</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Não encontramos nenhum registro com os filtros atuais. Tente ajustar sua busca.
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>Limpar tudo</Button>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <Link key={emp.id} to={`/colaboradores/${emp.id}`}>
              <Card className="hover:shadow-md transition-all group cursor-pointer border-border/60 bg-card overflow-hidden h-full">
                <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                  <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
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
                      <Badge 
                        variant="secondary" 
                        className={`
                          text-[10px] font-medium h-5 px-1.5
                          ${emp.status === "ativo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : ""}
                          ${emp.status === "ferias" ? "bg-amber-50 text-amber-700 border-amber-100" : ""}
                          ${emp.status === "afastado" ? "bg-blue-50 text-blue-700 border-blue-100" : ""}
                          ${emp.status === "desligado" ? "bg-rose-50 text-rose-700 border-rose-100" : ""}
                        `}
                      >
                        {EMPLOYEE_STATUS_LABELS[emp.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{emp.cargo}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{emp.setor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{emp.email_corporativo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="truncate">Ramal: {emp.ramal || "-"}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Gestor:</span>
                      <span className="font-medium text-foreground">
                        {emp.gestor ? emp.gestor.nome_completo : "Não definido"}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[300px]">Colaborador</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Ramal</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="cursor-pointer group hover:bg-muted/50" onClick={() => window.location.href=`/colaboradores/${emp.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={emp.foto_url || ""} />
                        <AvatarFallback className="text-xs">
                          {emp.nome_completo.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">
                          {emp.nome_completo}
                        </span>
                        <span className="text-xs text-muted-foreground">{emp.cargo}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{emp.setor}</TableCell>
                  <TableCell className="text-sm">{emp.email_corporativo}</TableCell>
                  <TableCell className="text-sm">{emp.ramal || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {emp.gestor ? emp.gestor.nome_completo : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-normal text-[10px]">
                      {EMPLOYEE_STATUS_LABELS[emp.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  component: ColaboradoresPage,
});