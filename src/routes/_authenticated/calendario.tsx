import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
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
  const [currentDate, setCurrentDate] = useState(new Date());
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
    queryKey: ["calendar-events", selectedSector, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();
      
      let query = supabase
        .from("calendar_events")
        .select("*, sectors(name)")
        .gte("start_at", start)
        .lte("start_at", end);
        
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
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const openWithDate = (date: Date) => {
    // Format to YYYY-MM-DDTHH:mm
    const isoString = format(date, "yyyy-MM-dd'T'HH:mm");
    setForm({ ...form, start_at: isoString });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Calendário corporativo</h1>
            <Badge variant="outline" className="capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Prazos fiscais, reuniões e treinamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2 bg-muted/50 p-1 rounded-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} title="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} title="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
          </div>
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
                <Button size="sm" className="h-9"><Plus className="w-4 h-4 mr-1" />Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Publicar evento na agenda</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
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
                      <Label>Setor (opcional)</Label>
                      <Select value={form.sector_id} onValueChange={(v) => setForm({ ...form, sector_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                      <Label>Início</Label>
                      <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fim (opcional)</Label>
                      <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                    {publish.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {events.isLoading ? (
          <div className="text-center py-12 text-muted-foreground italic">Carregando eventos...</div>
        ) : events.data?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>Nenhum evento encontrado para os filtros selecionados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.data?.map((e) => (
              <Dialog key={e.id}>
                <DialogTrigger asChild>
                  <Card className={cn(
                    "cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all border-l-4",
                    e.event_type === "prazo_fiscal" ? "border-l-red-500" :
                    e.event_type === "reuniao" ? "border-l-blue-500" :
                    e.event_type === "treinamento" ? "border-l-green-500" :
                    "border-l-amber-500"
                  )}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="secondary" className={cn("text-[10px] uppercase", TYPE_COLORS[e.event_type])}>
                          {TYPE_LABEL[e.event_type]}
                        </Badge>
                        {e.sectors?.name && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {e.sectors.name}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base line-clamp-1">{e.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">Início:</span>
                          {format(parseISO(e.start_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                        {e.end_at && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">Fim:</span>
                            {format(parseISO(e.end_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{e.description}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{TYPE_LABEL[e.event_type]}</Badge>
                      {e.sectors?.name && <Badge variant="outline">{e.sectors.name}</Badge>}
                    </div>
                    <DialogTitle>{e.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Início</Label>
                        <div className="font-medium">{format(parseISO(e.start_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      </div>
                      {e.end_at && (
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase">Fim</Label>
                          <div className="font-medium">{format(parseISO(e.end_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                        </div>
                      )}
                    </div>
                    {e.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Descrição</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{e.description}</p>
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

