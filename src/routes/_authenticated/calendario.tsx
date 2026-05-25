import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalIcon } from "lucide-react";

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
  const events = useQuery({
    queryKey: ["calendar-all"],
    queryFn: async () => (await supabase.from("calendar_events").select("*").order("start_at")).data ?? [],
  });

  const grouped = (events.data ?? []).reduce<Record<string, typeof events.data>>((acc, e) => {
    const k = new Date(e.start_at).toLocaleDateString("pt-BR");
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendário corporativo</h1>
        <p className="text-sm text-muted-foreground">Prazos fiscais, reuniões e treinamentos.</p>
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
