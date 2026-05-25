import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/procedimentos/$id")({
  component: ProcedureDetail,
});

function ProcedureDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const proc = useQuery({
    queryKey: ["proc", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("*, sectors(name)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const steps = useQuery({
    queryKey: ["proc-steps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedure_steps")
        .select("*")
        .eq("procedure_id", id)
        .order("order_index");
      return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ["proc-progress", id, user?.id],
    queryFn: async () => {
      const stepIds = (steps.data ?? []).map((s) => s.id);
      if (!stepIds.length || !user) return new Map<string, boolean>();
      const { data } = await supabase
        .from("procedure_user_progress")
        .select("step_id, completed")
        .eq("user_id", user.id)
        .in("step_id", stepIds);
      return new Map<string, boolean>((data ?? []).map((p) => [p.step_id, p.completed]));
    },
    enabled: !!steps.data && !!user,
  });

  const toggle = useMutation({
    mutationFn: async ({ stepId, value }: { stepId: string; value: boolean }) => {
      const { error } = await supabase
        .from("procedure_user_progress")
        .upsert(
          { user_id: user!.id, step_id: stepId, completed: value, completed_at: value ? new Date().toISOString() : null },
          { onConflict: "user_id,step_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proc-progress", id] }),
  });

  if (!proc.data) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const done = (steps.data ?? []).filter((s) => progress.data?.get(s.id)).length;
  const total = steps.data?.length ?? 0;

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/procedimentos"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Link>
      </Button>

      <header>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{proc.data.title}</h1>
          <Badge variant="outline">v{proc.data.version}</Badge>
          {proc.data.sectors && <Badge variant="secondary">{(proc.data.sectors as any).name}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{proc.data.description}</p>
        <div className="text-xs text-muted-foreground mt-2">
          Última revisão: {proc.data.last_revision ? new Date(proc.data.last_revision).toLocaleDateString("pt-BR") : "—"}
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Checklist pessoal</span>
            <Badge variant="secondary">{done}/{total} concluídas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(steps.data ?? []).map((s) => {
              const checked = progress.data?.get(s.id) ?? false;
              return (
                <li key={s.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggle.mutate({ stepId: s.id, value: !!v })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
                      <span className="text-muted-foreground mr-2">{s.order_index}.</span>{s.description}
                    </div>
                    {s.required && <span className="text-[10px] text-destructive uppercase tracking-wide">Obrigatório</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            ✓ Seu progresso é individual e não altera o procedimento para os demais usuários.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
