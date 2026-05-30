import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Star, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const SECTORS = ["fiscal", "contabil", "comercial", "departamento pessoal"] as const;

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsPage,
  head: () => ({ meta: [{ title: "Apps & Ferramentas — União Contadores" }] }),
});

function AppsPage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("geral");
  const isCoordenador = roles.includes("coordenador");
  const isAdmin = roles.includes("admin");

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

  const filteredApps = (sector?: string) => {
    const all = apps.data ?? [];
    if (!sector || sector === "geral") return all.filter(a => !a.sector_name);
    return all.filter(a => a.sector_name === sector);
  };

  const renderAppCard = (a: any) => {
    const isFav = favs.data?.has(a.id) ?? false;
    return (
      <Card key={a.id} className="group hover:border-primary/40 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{a.name}</CardTitle>
            <div className="flex gap-1">
              {(isAdmin || (isCoordenador && a.coordenador_id === user?.id)) && (
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle.mutate({ id: a.id, isFav })}>
                <Star className={`w-4 h-4 ${isFav ? "fill-accent text-accent" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.description || "Nenhuma descrição disponível."}</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => open(a)}>
            Abrir <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apps & ferramentas</h1>
          <p className="text-sm text-muted-foreground">Acesso rápido aos sistemas usados pela equipe.</p>
        </div>
        {(isAdmin || isCoordenador) && (
          <Button className="w-fit" onClick={() => toast.info("Funcionalidade de adição em breve!")}>
            <Plus className="w-4 h-4 mr-2" /> Novo App
          </Button>
        )}
      </div>

      <Tabs defaultValue="geral" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
          <TabsTrigger value="geral" className="capitalize">Geral</TabsTrigger>
          {SECTORS.map(s => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps(activeTab).length > 0 ? (
              filteredApps(activeTab).map(renderAppCard)
            ) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">Nenhum aplicativo encontrado para o setor {activeTab}.</p>
                {(isAdmin || isCoordenador) && (
                  <Button variant="link" className="mt-2" onClick={() => toast.info("Funcionalidade de adição em breve!")}>
                    Adicionar o primeiro app
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

