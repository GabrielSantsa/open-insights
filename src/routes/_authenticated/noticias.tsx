import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/noticias")({
  component: NewsPage,
  head: () => ({ meta: [{ title: "Notícias — União Contadores" }] }),
});

function NewsPage() {
  const { user, roles } = useAuth();
  const canPublish = isApprover(roles);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", category: "", content: "" });

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

  const publish = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.content.trim()) throw new Error("Título e conteúdo são obrigatórios");
      const { error } = await supabase.from("news_posts").insert({
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        category: form.category.trim() || null,
        content: form.content.trim(),
        author_id: user!.id,
        status: "publicado",
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notícia publicada");
      setForm({ title: "", summary: "", category: "", content: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["news-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mural de notícias</h1>
          <p className="text-sm text-muted-foreground">Comunicados, eventos e atualizações da empresa.</p>
        </div>
        {canPublish && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" />Publicar notícia</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Publicar notícia</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Input placeholder="Ex: Comunicado" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Resumo</Label>
                    <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Conteúdo</Label>
                  <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
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
