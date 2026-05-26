import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AArrowDown, AArrowUp, Pencil, Save, X, BookOpen, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/procedimentos/$id")({
  component: ProcedureDetail,
});

type Heading = { id: string; text: string; level: number };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function ProcedureDetail() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const canEdit = isApprover(roles);
  const qc = useQueryClient();

  const [fontSize, setFontSize] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("proc-font-size") : null;
    return stored ? Number(stored) : 17;
  });
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("proc-font-size", String(fontSize));
  }, [fontSize]);

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

  const progressQ = useQuery({
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

  const saveContent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("procedures")
        .update({ content: draft, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo salvo");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["proc", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const content: string = proc.data?.content ?? "";

  const headings = useMemo<Heading[]>(() => {
    const out: Heading[] = [];
    const lines = content.split("\n");
    let inCode = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) inCode = !inCode;
      if (inCode) continue;
      const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
      if (m) {
        const text = m[2].replace(/[*_`]/g, "");
        out.push({ id: slugify(text), text, level: m[1].length });
      }
    }
    return out;
  }, [content]);

  // Reading progress + active heading via scroll
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => {
      const max = main.scrollHeight - main.clientHeight;
      const p = max > 0 ? Math.min(100, Math.max(0, (main.scrollTop / max) * 100)) : 0;
      setProgress(p);

      // Active heading: last one above viewport top + 120px
      if (!articleRef.current) return;
      const hs = articleRef.current.querySelectorAll<HTMLElement>("h1, h2, h3");
      let current = "";
      hs.forEach((el) => {
        if (el.getBoundingClientRect().top - 140 <= 0) current = el.id;
      });
      setActiveHeading(current);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener("scroll", onScroll);
  }, [content]);

  const scrollTo = (hid: string) => {
    const el = document.getElementById(hid);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!proc.data) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const done = (steps.data ?? []).filter((s) => progressQ.data?.get(s.id)).length;
  const total = steps.data?.length ?? 0;
  const readMinutes = Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 220));

  return (
    <div className="relative -m-6">
      {/* Reading progress bar */}
      <div className="sticky top-0 z-20 h-1 bg-transparent">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/procedimentos"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Link>
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFontSize((s) => Math.max(14, s - 1))}
              title="Diminuir fonte"
            >
              <AArrowDown className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{fontSize}px</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              title="Aumentar fonte"
            >
              <AArrowUp className="w-4 h-4" />
            </Button>
            {canEdit && !editing && (
              <Button variant="outline" size="sm" className="ml-2" onClick={() => { setDraft(content); setEditing(true); }}>
                <Pencil className="w-4 h-4 mr-1" />Editar artigo
              </Button>
            )}
          </div>
        </div>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline">v{proc.data.version}</Badge>
            {proc.data.sectors && <Badge variant="secondary">{(proc.data.sectors as any).name}</Badge>}
            {content && <Badge variant="outline">⏱ {readMinutes} min de leitura</Badge>}
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">{proc.data.title}</h1>
          {proc.data.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">{proc.data.description}</p>
          )}
          <div className="text-xs text-muted-foreground mt-3">
            Última revisão: {proc.data.last_revision ? new Date(proc.data.last_revision).toLocaleDateString("pt-BR") : "—"}
          </div>
        </header>

        <Tabs defaultValue="artigo" className="w-full">
          <TabsList>
            <TabsTrigger value="artigo"><BookOpen className="w-4 h-4 mr-1" />Artigo</TabsTrigger>
            <TabsTrigger value="checklist"><ListChecks className="w-4 h-4 mr-1" />Checklist {total > 0 && `(${done}/${total})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="artigo" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8">
              {/* Article */}
              <article ref={articleRef} className="min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={24}
                      className="font-mono text-sm"
                      placeholder="# Título&#10;&#10;Escreva o artigo em **Markdown**. Use ## para subtítulos, listas, links, tabelas..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        <X className="w-4 h-4 mr-1" />Cancelar
                      </Button>
                      <Button onClick={() => saveContent.mutate()} disabled={saveContent.isPending}>
                        <Save className="w-4 h-4 mr-1" />{saveContent.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suporta Markdown: **negrito**, *itálico*, # títulos, listas, [links](url), tabelas, `código`, blocos de citação ({">"}).
                    </p>
                  </div>
                ) : content ? (
                  <div
                    className="prose prose-neutral dark:prose-invert max-w-none
                      prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight
                      prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:border-b prose-h2:pb-2
                      prose-h3:text-xl prose-h3:mt-8
                      prose-p:leading-[1.8] prose-li:leading-[1.8]
                      prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:opacity-80
                      prose-blockquote:border-l-primary prose-blockquote:bg-muted/40 prose-blockquote:py-1 prose-blockquote:not-italic
                      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-muted prose-pre:border prose-img:rounded-lg
                      prose-table:text-sm"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children, ...p }) => <h1 id={slugify(String(children))} {...p}>{children}</h1>,
                        h2: ({ children, ...p }) => <h2 id={slugify(String(children))} {...p}>{children}</h2>,
                        h3: ({ children, ...p }) => <h3 id={slugify(String(children))} {...p}>{children}</h3>,
                        a: ({ children, href, ...p }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" {...p}>{children}</a>
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Este procedimento ainda não tem um artigo de leitura.</p>
                      {canEdit && (
                        <Button className="mt-4" onClick={() => { setDraft(""); setEditing(true); }}>
                          <Pencil className="w-4 h-4 mr-1" />Escrever artigo
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </article>

              {/* TOC */}
              {headings.length > 0 && (
                <aside className="hidden lg:block">
                  <div className="sticky top-8">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      Neste artigo
                    </div>
                    <nav className="space-y-1 border-l text-sm">
                      {headings.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => scrollTo(h.id)}
                          className={`block w-full text-left -ml-px pl-4 py-1 border-l-2 transition-colors
                            ${activeHeading === h.id
                              ? "border-primary text-foreground font-medium"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"}
                            ${h.level === 2 ? "pl-6" : ""}
                            ${h.level === 3 ? "pl-9 text-xs" : ""}
                          `}
                        >
                          {h.text}
                        </button>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="mt-6">
            <Card className="max-w-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Checklist pessoal</span>
                  <Badge variant="secondary">{done}/{total} concluídas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {total === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum passo cadastrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {(steps.data ?? []).map((s) => {
                      const checked = progressQ.data?.get(s.id) ?? false;
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
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  ✓ Seu progresso é individual e não altera o procedimento para os demais usuários.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
