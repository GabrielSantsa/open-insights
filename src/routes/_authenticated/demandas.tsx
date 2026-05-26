import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, User, LayoutGrid, List } from "lucide-react";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, isApprover, ROLE_LABELS } from "@/lib/permissions";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/demandas")({
  component: DemandasPage,
  head: () => ({ meta: [{ title: "Demandas — União Contadores" }] }),
});

const STATUS_TONE: Record<TaskStatus, string> = {
  nova: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-primary/15 text-primary",
  aguardando: "bg-warning/20 text-warning-foreground",
  concluida: "bg-success/20 text-success",
  cancelada: "bg-muted text-muted-foreground",
};

function DemandasPage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const canCreate = isApprover(roles);

  const [filter, setFilter] = useState<TaskStatus | "todas">("todas");
  const [employeeFilter, setEmployeeFilter] = useState<string | "todos">("todos");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);

  const tasks = useQuery({
    queryKey: ["tasks", filter, employeeFilter],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, profiles!tasks_assignee_id_fkey(full_name), creator:profiles!tasks_creator_id_fkey(full_name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      
      if (filter !== "todas") q = q.eq("status", filter);
      if (employeeFilter !== "todos") q = q.eq("assignee_id", employeeFilter);
      
      const { data } = await q;
      return data ?? [];
    },
  });

  const sectors = useQuery({
    queryKey: ["sectors-all"],
    queryFn: async () => (await supabase.from("sectors").select("id, name").order("name")).data ?? [],
  });

  const profiles = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").order("full_name")).data ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Status atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    title: "", description: "", assignee_id: "", sector_id: "",
    priority: "media" as TaskPriority, due_date: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        creator_id: user!.id,
        assignee_id: form.assignee_id || null,
        sector_id: form.sector_id || null,
        priority: form.priority,
        due_date: form.due_date || null,
      };
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      setForm({ title: "", description: "", assignee_id: "", sector_id: "", priority: "media", due_date: "" });
      toast.success("Demanda criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe e gerencie tarefas operacionais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground ml-1">Funcionário</Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Funcionário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Funcionários</SelectItem>
                {(profiles.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground ml-1">Status</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos Status</SelectItem>
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none h-10 w-10"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none h-10 w-10"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-1" />Nova demanda</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova demanda</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Responsável</Label>
                      <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{(profiles.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Setor</Label>
                      <Select value={form.sector_id} onValueChange={(v) => setForm({ ...form, sector_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{(sectors.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks.data ?? []).map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.title}
                      {t.description && <p className="text-xs text-muted-foreground font-normal line-clamp-1">{t.description}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{t.profiles?.full_name || "Não atribuído"}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{TASK_PRIORITY_LABELS[t.priority as TaskPriority]}</Badge></TableCell>
                    <TableCell className="text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_TONE[t.status as TaskStatus]}>{TASK_STATUS_LABELS[t.status as TaskStatus]}</Badge></TableCell>
                    <TableCell className="text-right">
                      {t.status !== "concluida" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: t.id, status: "concluida" })}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Concluir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!tasks.data?.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma demanda encontrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(tasks.data ?? []).map((t: any) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="p-4 flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Badge variant="outline">{TASK_PRIORITY_LABELS[t.priority as TaskPriority]}</Badge>
                  <Badge className={STATUS_TONE[t.status as TaskStatus]}>{TASK_STATUS_LABELS[t.status as TaskStatus]}</Badge>
                </div>
                <h3 className="font-bold text-lg mb-1">{t.title}</h3>
                {t.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{t.description}</p>}
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Responsável:</span>
                    <span>{t.profiles?.full_name || "Não atribuído"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Criado por:</span>
                    <span>{t.creator?.full_name || "Sistema"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Prazo:</span>
                    <span>{t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t flex justify-end">
                {t.status !== "concluida" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, status: "concluida" })}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />Concluir
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {!tasks.data?.length && (
            <div className="col-span-full text-center text-muted-foreground py-12 bg-card rounded-lg border border-dashed">
              Nenhuma demanda encontrada para os filtros selecionados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
