import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalIcon, Plus, Filter, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { 
  format, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarioPage,
  head: () => ({ meta: [{ title: "Calendário — União Contadores" }] }),
});

const TYPE_LABEL: Record<string, string> = {
  prazo_fiscal: "Prazo Fiscal",
  reuniao: "Reunião",
  treinamento: "Treinamento",
  aviso: "Aviso",
};

const TYPE_COLORS: Record<string, string> = {
  prazo_fiscal: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  reuniao: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  treinamento: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  aviso: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
};

function CalendarioPage() {
  const { user, roles } = useAuth();
  const canPublish = isApprover(roles);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>("all");
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "aviso",
    start_at: "",
    end_at: "",
    sector_id: "",
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => (await supabase.from("sectors").select("*")).data ?? [],
  });

  const events = useQuery({
    queryKey: ["calendar-events-all", selectedSector],
    queryFn: async () => {
      let query = supabase
        .from("calendar_events")
        .select("*, sectors(name)");
        
      if (selectedSector !== "all") {
        query = query.eq("sector_id", selectedSector);
      }
      
      const { data } = await query.order("start_at");
      return data ?? [];
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.start_at) throw new Error("Título e data de início são obrigatórios");
      const { error } = await supabase.from("calendar_events").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type as any,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        sector_id: form.sector_id || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento publicado");
      setForm({ title: "", description: "", event_type: "aviso", start_at: "", end_at: "", sector_id: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["calendar-events-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento excluído com sucesso");
      qc.invalidateQueries({ queryKey: ["calendar-events-all"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir evento: " + e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Agenda Corporativa</h1>
            <Badge variant="outline" className="text-xs uppercase font-semibold text-muted-foreground">
              {events.data?.length ?? 0} {events.data?.length === 1 ? "evento" : "eventos"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Prazos fiscais, reuniões e treinamentos programados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="w-3.5 h-3.5 mr-2" />
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canPublish && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9"><Plus className="w-4 h-4 mr-1" />Novo Evento</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Cadastrar Novo Evento</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label>Título do Evento</Label>
                    <Input placeholder="Ex: Entrega de DCTF, Reunião de Equipe..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tipo de Evento</Label>
                      <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Setor Responsável</Label>
                      <Select value={form.sector_id} onValueChange={(v) => setForm({ ...form, sector_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o setor..." /></SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Início (Data e Hora)</Label>
                      <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fim (Data e Hora - Opcional)</Label>
                      <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição / Observações</Label>
                    <Textarea rows={4} placeholder="Detalhes adicionais sobre o evento..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                    {publish.isPending ? "Cadastrando..." : "Cadastrar Evento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {events.isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="italic">Carregando eventos programados...</p>
          </div>
        ) : events.data?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CalendarDays className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-medium">Nenhum evento agendado</p>
              <p className="text-sm">Não há eventos cadastrados para os critérios selecionados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.data?.map((e) => (
              <Dialog key={e.id}>
                <DialogTrigger asChild>
                  <Card className={cn(
                    "group relative cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all border-l-4 h-full flex flex-col",
                    e.event_type === "prazo_fiscal" ? "border-l-red-500" :
                    e.event_type === "reuniao" ? "border-l-blue-500" :
                    e.event_type === "treinamento" ? "border-l-green-500" :
                    "border-l-amber-500"
                  )}>
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="secondary" className={cn("text-[9px] uppercase tracking-wider font-bold", TYPE_COLORS[e.event_type])}>
                          {TYPE_LABEL[e.event_type]}
                        </Badge>
                        {e.sectors?.name && (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-semibold">
                            {e.sectors.name}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
                        {e.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-8 py-1 rounded bg-muted flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">{format(parseISO(e.start_at), "MMM", { locale: ptBR })}</span>
                            <span className="text-sm font-black">{format(parseISO(e.start_at), "dd")}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">Início</span>
                            <span className="text-muted-foreground">{format(parseISO(e.start_at), "HH:mm", { locale: ptBR })}</span>
                          </div>
                        </div>
                        {e.end_at && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-8 py-1 rounded bg-muted/50 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground/60">{format(parseISO(e.end_at), "MMM", { locale: ptBR })}</span>
                              <span className="text-sm font-black text-muted-foreground/60">{format(parseISO(e.end_at), "dd")}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">Fim</span>
                              <span className="text-muted-foreground">{format(parseISO(e.end_at), "HH:mm", { locale: ptBR })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {e.description && (
                        <div className="pt-2 border-t border-dashed">
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed italic">
                            {e.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className={cn(TYPE_COLORS[e.event_type])}>{TYPE_LABEL[e.event_type]}</Badge>
                      {e.sectors?.name && <Badge variant="outline">{e.sectors.name}</Badge>}
                    </div>
                    <DialogTitle className="text-xl font-black">{e.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 pt-4">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Início</Label>
                        <div className="font-bold text-sm">{format(parseISO(e.start_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</div>
                      </div>
                      {e.end_at && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Fim</Label>
                          <div className="font-bold text-sm">{format(parseISO(e.end_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</div>
                        </div>
                      )}
                    </div>
                    {e.description && (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Detalhes do Evento</Label>
                        <div className="bg-card border rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                          {e.description}
                        </div>
                      </div>
                    )}
                    {canPublish && (
                      <div className="pt-4 flex justify-end border-t border-dashed">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este evento?")) {
                              deleteEvent.mutate(e.id);
                            }
                          }}
                          disabled={deleteEvent.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir Evento
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


