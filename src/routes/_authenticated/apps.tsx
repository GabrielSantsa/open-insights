import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsPage,
  head: () => ({ meta: [{ title: "Apps & Ferramentas — União Contadores" }] }),
});

function AppsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const apps = useQuery({
    queryKey: ["apps-all"],
    queryFn: async () => {
      const { data } = await supabase.from("apps").select("*").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const favs = useQuery({
    queryKey: ["my-fav-apps", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("app_favorites").select("app_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((f) => f.app_id));
    },
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isFav }: { id: string; isFav: boolean }) => {
      if (isFav) await supabase.from("app_favorites").delete().eq("user_id", user!.id).eq("app_id", id);
      else await supabase.from("app_favorites").insert({ user_id: user!.id, app_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-fav-apps"] }),
  });

  const open = async (a: any) => {
    await supabase.from("app_access_log").insert({ app_id: a.id, user_id: user!.id });
    window.open(a.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Apps & ferramentas</h1>
        <p className="text-sm text-muted-foreground">Acesso rápido aos sistemas usados pela equipe.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(apps.data ?? []).map((a) => {
          const isFav = favs.data?.has(a.id) ?? false;
          return (
            <Card key={a.id} className="group hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle.mutate({ id: a.id, isFav })}>
                    <Star className={`w-4 h-4 ${isFav ? "fill-accent text-accent" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => open(a)}>
                  Abrir <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
