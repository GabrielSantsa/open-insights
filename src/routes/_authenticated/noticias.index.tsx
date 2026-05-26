import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Pencil, Trash2, Upload, ImageIcon, Eye, Star, ArrowRight,
  CalendarDays, User as UserIcon, AlertCircle, Inbox,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/noticias/")({
  component: NewsPage,
  head: () => ({ meta: [{ title: "Notícias — União Contadores" }] }),
});

type NewsRow = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  content_richtext: string | null;
  cover_image_url: string | null;
  category: string | null;
  author_id: string | null;
  status: "rascunho" | "publicado";
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  id: null as string | null,
  title: "",
  summary: "",
  category: "",
  cover_image_url: "",
  content_richtext: "",
  featured: false,
};

function NewsPage() {
  const { user, roles } = useAuth();
  const canManage = isApprover(roles);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"publicas" | "gerenciar">("publicas");

  const published = useQuery({
    queryKey: ["news-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("status", "publicado")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsRow[];
    },
  });

  const allForAdmin = useQuery({
    queryKey: ["news-all-admin"],
    enabled: canManage && tab === "gerenciar",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsRow[];
    },
  });

  // Authors lookup
  const authorIds = useMemo(() => {
    const ids = new Set<string>();
    (published.data ?? []).forEach((n) => n.author_id && ids.add(n.author_id));
    (allForAdmin.data ?? []).forEach((n) => n.author_id && ids.add(n.author_id));
    return Array.from(ids);
  }, [published.data, allForAdmin.data]);

  const authors = useQuery({
    queryKey: ["news-authors", authorIds.sort().join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      const map = new Map<string, string>();
      (data ?? []).forEach((p) => map.set(p.id, p.full_name));
      return map;
    },
  });

  const filteredPublished = useMemo(() => {
    const list = published.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((n) => n.title.toLowerCase().includes(q));
  }, [published.data, search]);

  const featured = filteredPublished.find((n) => n.featured) ?? filteredPublished[0] ?? null;
  const rest = filteredPublished.filter((n) => n.id !== featured?.id);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notícias</h1>
          <p className="text-sm text-muted-foreground">
            Comunicados, eventos e atualizações da empresa.
          </p>
        </div>
        {canManage && (
          <NewsEditorDialog
            mode="create"
            userId={user!.id}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["news-published"] });
              qc.invalidateQueries({ queryKey: ["news-all-admin"] });
            }}
          />
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "publicas" | "gerenciar")}>
        <TabsList>
          <TabsTrigger value="publicas">Publicadas</TabsTrigger>
          {canManage && <TabsTrigger value="gerenciar">Gerenciar</TabsTrigger>}
        </TabsList>

        {/* PUBLIC AREA */}
        <TabsContent value="publicas" className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {published.isLoading && <SkeletonGrid />}

          {published.isError && (
            <ErrorState message="Não foi possível carregar as notícias." />
          )}

          {!published.isLoading && !published.isError && filteredPublished.length === 0 && (
            <EmptyState
              title={search ? "Nada encontrado" : "Sem notícias publicadas"}
              description={
                search
                  ? "Tente buscar por outro título."
                  : "Quando uma notícia for publicada, ela aparecerá aqui."
              }
            />
          )}

          {featured && (
            <FeaturedCard
              news={featured}
              authorName={featured.author_id ? authors.data?.get(featured.author_id) : undefined}
            />
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((n) => (
                <NewsCard
                  key={n.id}
                  news={n}
                  authorName={n.author_id ? authors.data?.get(n.author_id) : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ADMIN AREA */}
        {canManage && (
          <TabsContent value="gerenciar" className="space-y-3">
            {allForAdmin.isLoading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
            {allForAdmin.isError && (
              <ErrorState message="Não foi possível carregar a lista." />
            )}
            {!allForAdmin.isLoading && (allForAdmin.data ?? []).length === 0 && (
              <EmptyState
                title="Nenhuma notícia ainda"
                description="Clique em ‘Nova notícia’ para começar."
              />
            )}
            <div className="rounded-lg border bg-card divide-y">
              {(allForAdmin.data ?? []).map((n) => (
                <AdminRow
                  key={n.id}
                  news={n}
                  authorName={n.author_id ? authors.data?.get(n.author_id) : undefined}
                  userId={user!.id}
                  onChanged={() => {
                    qc.invalidateQueries({ queryKey: ["news-published"] });
                    qc.invalidateQueries({ queryKey: ["news-all-admin"] });
                  }}
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function FeaturedCard({ news, authorName }: { news: NewsRow; authorName?: string }) {
  return (
    <Link
      to="/noticias/$id"
      params={{ id: news.id }}
      className="block group rounded-xl overflow-hidden border bg-card hover:shadow-lg transition-shadow"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="aspect-[16/10] md:aspect-auto bg-muted relative overflow-hidden">
          {news.cover_image_url ? (
            <img
              src={news.cover_image_url}
              alt={news.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 gap-1">
            <Star className="w-3 h-3" />
            Destaque
          </Badge>
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            {news.category && <Badge variant="secondary">{news.category}</Badge>}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {news.published_at && format(new Date(news.published_at), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 group-hover:text-primary transition-colors">
            {news.title}
          </h2>
          {news.summary && (
            <p className="text-muted-foreground mb-4 line-clamp-3">{news.summary}</p>
          )}
          <div className="flex items-center justify-between gap-4 mt-auto">
            <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              {authorName ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Ler notícia <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewsCard({ news, authorName }: { news: NewsRow; authorName?: string }) {
  return (
    <Card className="overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
      <Link to="/noticias/$id" params={{ id: news.id }} className="block">
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          {news.cover_image_url ? (
            <img
              src={news.cover_image_url}
              alt={news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
        </div>
      </Link>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          {news.category && <Badge variant="secondary" className="text-[10px]">{news.category}</Badge>}
          <span>
            {news.published_at &&
              formatDistanceToNow(new Date(news.published_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <CardTitle className="text-base leading-snug line-clamp-2">
          <Link to="/noticias/$id" params={{ id: news.id }} className="hover:text-primary">
            {news.title}
          </Link>
        </CardTitle>
        {news.summary && (
          <CardDescription className="line-clamp-2">{news.summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0 mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 truncate">
          <UserIcon className="w-3 h-3" />
          {authorName ?? "—"}
        </span>
        <Button asChild size="sm" variant="ghost" className="gap-1">
          <Link to="/noticias/$id" params={{ id: news.id }}>
            Ler notícia <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AdminRow({
  news,
  authorName,
  userId,
  onChanged,
}: {
  news: NewsRow;
  authorName?: string;
  userId: string;
  onChanged: () => void;
}) {
  const togglePublish = useMutation({
    mutationFn: async () => {
      const next = news.status === "publicado" ? "rascunho" : "publicado";
      const { error } = await supabase
        .from("news_posts")
        .update({
          status: next,
          published_at:
            next === "publicado" ? news.published_at ?? new Date().toISOString() : news.published_at,
        })
        .eq("id", news.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(news.status === "publicado" ? "Movida para rascunho" : "Notícia publicada");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("news_posts").delete().eq("id", news.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notícia excluída");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="w-14 h-14 rounded-md bg-muted overflow-hidden shrink-0">
        {news.cover_image_url ? (
          <img src={news.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{news.title}</span>
          {news.featured && (
            <Badge variant="outline" className="gap-1">
              <Star className="w-3 h-3" /> Destaque
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <Badge variant={news.status === "publicado" ? "default" : "secondary"} className="text-[10px]">
            {news.status === "publicado" ? "Publicado" : "Rascunho"}
          </Badge>
          <span>{authorName ?? "—"}</span>
          <span>·</span>
          <span>
            Atualizado {formatDistanceToNow(new Date(news.updated_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link to="/noticias/$id" params={{ id: news.id }}>
            <Eye className="w-4 h-4" />
          </Link>
        </Button>
        <NewsEditorDialog mode="edit" news={news} userId={userId} onSaved={onChanged} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => togglePublish.mutate()}
          disabled={togglePublish.isPending}
        >
          {news.status === "publicado" ? "Despublicar" : "Publicar"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir notícia?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A notícia será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate()}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ---------------- editor dialog ---------------- */

function NewsEditorDialog({
  mode,
  news,
  userId,
  onSaved,
}: {
  mode: "create" | "edit";
  news?: NewsRow;
  userId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    news
      ? {
          id: news.id,
          title: news.title,
          summary: news.summary ?? "",
          category: news.category ?? "",
          cover_image_url: news.cover_image_url ?? "",
          content_richtext: news.content_richtext ?? news.content ?? "",
          featured: news.featured,
        }
      : emptyForm,
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (!news) setForm(emptyForm);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `covers/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("news").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("news").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async (status: "rascunho" | "publicado") => {
      if (!form.title.trim()) throw new Error("Título é obrigatório");
      if (!form.content_richtext.trim()) throw new Error("Conteúdo é obrigatório");
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        category: form.category.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        content_richtext: form.content_richtext,
        content: form.content_richtext, // keep legacy column in sync
        featured: form.featured,
        status,
        published_at:
          status === "publicado"
            ? news?.published_at ?? new Date().toISOString()
            : news?.published_at ?? null,
      };
      if (form.id) {
        const { error } = await supabase.from("news_posts").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("news_posts")
          .insert({ ...payload, author_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, status) => {
      toast.success(status === "publicado" ? "Notícia publicada" : "Rascunho salvo");
      setOpen(false);
      reset();
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="w-4 h-4" />
            Nova notícia
          </Button>
        ) : (
          <Button size="sm" variant="ghost">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova notícia" : "Editar notícia"}</DialogTitle>
          <DialogDescription>
            Use Markdown no conteúdo. O preview aparece ao lado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Nova política de home office"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Comunicado, Evento..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Resumo</Label>
            <Textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Breve descrição que aparece nos cards"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Imagem de capa</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                placeholder="https://... ou faça upload"
                className="flex-1 min-w-[240px]"
              />
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Enviando..." : "Upload"}
              </Button>
            </div>
            {form.cover_image_url && (
              <div className="mt-2 aspect-[16/6] rounded-md overflow-hidden border bg-muted max-w-md">
                <img
                  src={form.cover_image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Conteúdo (Markdown) *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea
                rows={14}
                value={form.content_richtext}
                onChange={(e) => setForm({ ...form, content_richtext: e.target.value })}
                placeholder={"# Título\n\nParágrafo com **negrito** e [link](https://...)."}
                className="font-mono text-sm"
              />
              <div className="border rounded-md p-3 bg-muted/30 overflow-auto max-h-[360px]">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {form.content_richtext ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {form.content_richtext}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground text-sm">Preview...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="featured"
              checked={form.featured}
              onCheckedChange={(v) => setForm({ ...form, featured: v })}
            />
            <Label htmlFor="featured" className="cursor-pointer">
              Marcar como destaque
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => save.mutate("rascunho")}
            disabled={save.isPending}
          >
            Salvar rascunho
          </Button>
          <Button onClick={() => save.mutate("publicado")} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- states ---------------- */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <div className="aspect-[16/9] bg-muted animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
      <p className="text-sm text-destructive font-medium">{message}</p>
    </div>
  );
}
