import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/noticias")({
  component: NewsPage,
  head: () => ({ meta: [{ title: "Notícias — União Contadores" }] }),
});

function NewsPage() {
  const news = useQuery({
    queryKey: ["news-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("*")
        .eq("status", "publicado")
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mural de notícias</h1>
        <p className="text-sm text-muted-foreground">Comunicados, eventos e atualizações da empresa.</p>
      </div>

      <div className="space-y-4">
        {(news.data ?? []).map((n) => (
          <Card key={n.id}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                {n.category && <Badge variant="secondary">{n.category}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {n.published_at && formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <CardTitle>{n.title}</CardTitle>
              {n.summary && <CardDescription>{n.summary}</CardDescription>}
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{n.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
