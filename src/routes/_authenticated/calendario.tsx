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
    queryKey: ["calendar-events", selectedSector],
    queryFn: async () => {
      let query = supabase.from("calendar_events").select("*, sectors(name)");
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário corporativo</h1>
          <p className="text-sm text-muted-foreground">Prazos fiscais, reuniões e treinamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
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
                <Button><Plus className="w-4 h-4 mr-1" />Novo evento</Button>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-medium capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-t bg-muted/30">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[120px]">
            {calendarDays.map((day, i) => {
              const dayEvents = (events.data ?? []).filter((e) => isSameDay(parseISO(e.start_at), day));
              const isSelectedMonth = isSameMonth(day, monthStart);
              
              return (
                <div
                  key={i}
                  className={cn(
                    "relative border-r border-b p-2 overflow-hidden transition-colors hover:bg-muted/10 group",
                    !isSelectedMonth && "bg-muted/5 text-muted-foreground/50"
                  )}
                  onClick={() => canPublish && isSelectedMonth && openWithDate(day)}
                >
                  <span className={cn(
                    "text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full",
                    isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((e) => (
                      <Dialog key={e.id}>
                        <DialogTrigger asChild>
                          <div 
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity font-medium",
                              TYPE_COLORS[e.event_type] || "bg-secondary border-border"
                            )}
                            onClick={(evt) => evt.stopPropagation()}
                          >
                            {e.title}
                          </div>
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
                  
                  {canPublish && isSelectedMonth && (
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" /> Adicionar
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

