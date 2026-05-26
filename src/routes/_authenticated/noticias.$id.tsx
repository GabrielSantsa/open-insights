import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, CalendarDays, User as UserIcon, ImageIcon, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/noticias/$id")({
  component: NewsDetail,
});

function NewsDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const news = useQuery({
    queryKey: ["news-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const author = useQuery({
    queryKey: ["news-author", news.data?.author_id],
    enabled: !!news.data?.author_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", news.data!.author_id!)
        .maybeSingle();
      return data?.full_name ?? null;
    },
  });

  if (news.isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-2/3 bg-muted animate-pulse rounded" />
        <div className="aspect-[16/8] bg-muted animate-pulse rounded-xl" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (news.isError || !news.data) {
    return (
      <div className="max-w-3xl">
        <Button variant="ghost" onClick={() => navigate({ to: "/noticias" })}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-destructive font-medium">Notícia não encontrada.</p>
        </div>
      </div>
    );
  }

  const n = news.data;
  const body = n.content_richtext ?? n.content ?? "";

  return (
    <article className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-2">
        <Link to="/noticias">
          <ArrowLeft className="w-4 h-4" /> Voltar para notícias
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          {n.category && <Badge variant="secondary">{n.category}</Badge>}
          {n.published_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {format(new Date(n.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <UserIcon className="w-3 h-3" />
            {author.data ?? "—"}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{n.title}</h1>
        {n.summary && <p className="text-lg text-muted-foreground">{n.summary}</p>}
      </header>

      <div className="aspect-[16/8] rounded-xl overflow-hidden border bg-muted">
        {n.cover_image_url ? (
          <img src={n.cover_image_url} alt={n.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </article>
  );
}
