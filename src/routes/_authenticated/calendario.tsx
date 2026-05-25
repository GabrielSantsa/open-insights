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
import { Calendar as CalIcon, Plus } from "lucide-react";
import { toast } from "sonner";

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

function CalendarioPage() {
  const { user, roles } = useAuth();
  const canPublish = isApprover(roles);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "aviso",
    start_at: "",
    end_at: "",
  });

  const events = useQuery({
    queryKey: ["calendar-all"],
    queryFn: async () => (await supabase.from("calendar_events").select("*").order("start_at")).data ?? [],
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.start_at) throw new Error("Título e data de início são obrigatórios");
      const { error } = await supabase.from("calendar_events").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type as "prazo_fiscal" | "reuniao" | "treinamento" | "aviso",
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento publicado");
      setForm({ title: "", description: "", event_type: "aviso", start_at: "", end_at: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["calendar-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = (events.data ?? []).reduce<Record<string, typeof events.data>>((acc, e) => {
    const k = new Date(e.start_at).toLocaleDateString("pt-BR");
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário corporativo</h1>
          <p className="text-sm text-muted-foreground">Prazos fiscais, reuniões e treinamentos.</p>
        </div>
        {canPublish && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" />Publicar evento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Publicar evento na agenda</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
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

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalIcon className="w-4 h-4 text-primary" />Próximos eventos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(grouped).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento cadastrado.</p>
          )}
          {Object.entries(grouped).map(([date, evts]) => (
            <div key={date}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{date}</div>
              <ul className="space-y-1">
                {evts?.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card">
                    <div>
                      <div className="text-sm font-medium">{e.title}</div>
                      {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                    </div>
                    <Badge variant="secondary">{TYPE_LABEL[e.event_type] ?? e.event_type}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
