import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CheckSquare, Newspaper, BookOpen, AppWindow, Calendar, User as UserIcon, AlertCircle } from "lucide-react";
import { ROLE_LABELS, TASK_STATUS_LABELS } from "@/lib/permissions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — União Contadores" }] }),
});

function DashboardPage() {
  const { user, profile, roles } = useAuth();

  const myTasks = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, priority")
        .eq("assignee_id", user!.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const news = useQuery({
    queryKey: ["dashboard-news"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("id, title, summary, published_at")
        .eq("status", "publicado")
        .order("published_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const favProcs = useQuery({
    queryKey: ["fav-procs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedure_favorites")
        .select("procedures(id, title, version)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.procedures).filter(Boolean) as any[];
    },
    enabled: !!user,
  });

  const apps = useQuery({
    queryKey: ["dashboard-apps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("apps")
        .select("id, name, icon, url")
        .eq("active", true)
        .limit(8);
      return data ?? [];
    },
  });

  const events = useQuery({
    queryKey: ["dashboard-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, start_at, event_type")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const tasks = myTasks.data ?? [];
  const today = new Date();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== "concluida" && t.status !== "cancelada");
  const open = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const done = tasks.filter((t) => t.status === "concluida");

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0] ?? "Colaborador"} 👋</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo à central de operações da União Contadores.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pendências */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" />Minhas pendências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Abertas" value={open.length} />
              <Stat label="Atrasadas" value={overdue.length} tone="destructive" />
              <Stat label="Concluídas" value={done.length} tone="success" />
            </div>
            <Link to="/demandas" className="text-xs text-primary hover:underline block pt-2">Ver todas →</Link>
          </CardContent>
        </Card>

        {/* Comunicados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Newspaper className="w-4 h-4 text-primary" />Comunicados recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(news.data ?? []).map((n) => (
                <li key={n.id} className="flex flex-col border-b last:border-0 pb-2 last:pb-0">
                  <Link to="/noticias" className="font-medium hover:text-primary transition-colors">{n.title}</Link>
                  <span className="text-xs text-muted-foreground">
                    {n.published_at && formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </li>
              ))}
              {!news.data?.length && <li className="text-xs text-muted-foreground">Nada por enquanto.</li>}
            </ul>
            <Link to="/noticias" className="text-xs text-primary hover:underline block pt-2">Ver mural →</Link>
          </CardContent>
        </Card>

        {/* Favoritos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Procedimentos favoritos</CardTitle>
          </CardHeader>
          <CardContent>
            {favProcs.data?.length ? (
              <ul className="space-y-1 text-sm">
                {favProcs.data.map((p) => (
                  <li key={p.id}><Link to="/procedimentos/$id" params={{ id: p.id }} className="hover:underline">{p.title} <span className="text-xs text-muted-foreground">v{p.version}</span></Link></li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Marque procedimentos como favoritos para acessá-los rapidamente.</p>
            )}
          </CardContent>
        </Card>

        {/* Apps */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AppWindow className="w-4 h-4 text-primary" />Apps & ferramentas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(apps.data ?? []).length > 0 ? (
                (apps.data ?? []).map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md border bg-card hover:bg-accent/20 text-sm truncate transition-colors flex items-center gap-2">
                    {a.name}
                  </a>
                ))
              ) : (
                <p className="text-xs text-muted-foreground col-span-full">Nenhum app disponível.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Eventos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">{e.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(e.start_at).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
              {!events.data?.length && <li className="text-xs text-muted-foreground">Sem eventos programados.</li>}
            </ul>
          </CardContent>
        </Card>

        {/* Meu Perfil */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary" />Meu perfil</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <Info label="Nome" value={profile?.full_name} />
            <Info label="Cargo" value={profile?.position ?? "—"} />
            <Info label="Setor" value={profile?.primary_sector_id ? "Vinculado" : "—"} />
            <Info label="Ramal" value={profile?.ramal ?? "—"} />
            <Info label="Perfil" value={roles[0] ? ROLE_LABELS[roles[0]] : "—"} />
          </CardContent>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Você tem {overdue.length} demanda{overdue.length > 1 ? "s" : ""} atrasada{overdue.length > 1 ? "s" : ""}.</p>
              <Link to="/demandas" className="text-xs text-primary hover:underline">Revisar agora →</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "success" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="bg-muted/50 rounded-md py-2">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
