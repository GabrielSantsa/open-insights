import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Plus, CheckCircle2, Trash2, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ModuleEmptyState } from "./ModuleEmptyState";
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, isApprover, isAdmin,
  type TaskPriority, type TaskStatus,
} from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface EmployeeTasksTabProps {
  userId: string | null;
}

const STATUS_TONE: Record<TaskStatus, string> = {
  nova: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-primary/15 text-primary",
  aguardando: "bg-warning/20 text-warning-foreground",
  concluida: "bg-success/20 text-success",
  cancelada: "bg-muted text-muted-foreground",
};

export function EmployeeTasksTab({ userId }: EmployeeTasksTabProps) {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const canCreate = isApprover(roles);
  const canDelete = isAdmin(roles);
  const canApproveOrSelf = canCreate || user?.id === userId;

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "todas">("todas");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", sector_id: "",
    priority: "media" as TaskPriority, due_date: "",
  });

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

  const sectors = useQuery({
    queryKey: ["sectors-all"],
    queryFn: async () => (await supabase.from("sectors").select("id, name").order("name")).data ?? [],
    enabled: !!userId && canCreate,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-tasks", userId] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-tasks", userId] });
      toast.success("Demanda apagada");
    },
    onError: (e: any) => toast.error("Erro ao apagar: " + e.message),
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        creator_id: user!.id,
        assignee_id: userId,
        sector_id: form.sector_id || null,
        priority: form.priority,
        due_date: form.due_date || null,
      };
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-tasks", userId] });
      setOpen(false);
      setForm({ title: "", description: "", sector_id: "", priority: "media", due_date: "" });
      toast.success("Demanda criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!userId) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Colaborador sem conta de usuário</p>
            <p className="text-sm text-muted-foreground mt-1">
              Este colaborador ainda não possui uma conta vinculada. Vincule um usuário no perfil
              para registrar e acompanhar demandas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingTasks) return <Skeleton className="h-[300px] w-full" />;

  const counts = {
    andamento: employeeTasks?.filter((t) => t.status === "em_andamento").length || 0,
    pendentes: employeeTasks?.filter((t) => t.status === "nova" || t.status === "aguardando").length || 0,
    concluidas: employeeTasks?.filter((t) => t.status === "concluida").length || 0,
    atrasadas:
      employeeTasks?.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "concluida").length || 0,
  };

  const filtered = (employeeTasks ?? []).filter((t) =>
    statusFilter === "todas" ? true : t.status === statusFilter,
  );

  return (
    <div className="space-y-6">
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Demandas do colaborador
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos status</SelectItem>
                  {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" />Nova demanda</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nova demanda para este colaborador</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                      <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Setor</Label>
                          <Select value={form.sector_id} onValueChange={(v) => setForm({ ...form, sector_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {(sectors.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Prioridade</Label>
                          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2"><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                      <Button onClick={() => createTask.mutate()} disabled={!form.title || createTask.isPending}>Criar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {isAdmin(roles) && (
                <Button variant="ghost" size="sm" asChild className="text-[10px] h-8 px-2 font-bold uppercase text-primary">
                  <Link to="/demandas">Ver Todas</Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.title}
                      {t.description && <p className="text-xs text-muted-foreground font-normal line-clamp-1">{t.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{TASK_PRIORITY_LABELS[t.priority as TaskPriority]}</Badge></TableCell>
                    <TableCell className="text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_TONE[t.status as TaskStatus]}>{TASK_STATUS_LABELS[t.status as TaskStatus]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.creator?.full_name || "Sistema"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canApproveOrSelf && t.status !== "concluida" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: t.id, status: "concluida" })}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />Concluir
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Apagar demanda</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja apagar esta demanda? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTask.mutate(t.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Apagar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ModuleEmptyState
              icon={History}
              title="Nenhuma demanda encontrada"
              description="Nenhuma demanda corresponde aos filtros selecionados."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
