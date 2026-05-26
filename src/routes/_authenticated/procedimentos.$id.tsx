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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, AArrowDown, AArrowUp, Pencil, Save, X, BookOpen, ListChecks, GitBranch, History,
  Paperclip, Upload, Download, Trash2, FileText,
} from "lucide-react";
import { diffLines } from "diff";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/procedimentos/$id")({
  component: ProcedureDetail,
});

type Heading = { id: string; text: string; level: number };

const WORKFLOW_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
const WORKFLOW_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rascunho: "outline",
  em_revisao: "secondary",
  publicado: "default",
  arquivado: "destructive",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function bumpVersion(current: string, major: boolean): string {
  const [maj = "1", min = "0"] = (current ?? "1.0").split(".");
  if (major) return `${Number(maj) + 1}.0`;
  return `${maj}.${Number(min) + 1}`;
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
  const [versionDialog, setVersionDialog] = useState(false);
  const [versionForm, setVersionForm] = useState({ note: "", major: false });
  const [diffFromId, setDiffFromId] = useState<string>("");
  const [diffToId, setDiffToId] = useState<string>("current");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Registrar acesso (1x por carregamento)
  useEffect(() => {
    if (!proc.data?.id || !user) return;
    supabase.rpc("increment_procedure_access", { _procedure_id: proc.data.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc.data?.id, user?.id]);

  const versions = useQuery({
    queryKey: ["proc-versions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedure_versions")
        .select("id, version, change_note, is_major, content, created_at, created_by")
        .eq("procedure_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const files = useQuery({
    queryKey: ["proc-files", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedure_files")
        .select("*")
        .eq("procedure_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Não autenticado");
      const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("procedures").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("procedure_files").insert({
        procedure_id: id, name: file.name, storage_path: path,
        file_size: file.size, mime_type: file.type, uploaded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Anexo enviado"); qc.invalidateQueries({ queryKey: ["proc-files", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFile = useMutation({
    mutationFn: async (f: { id: string; storage_path: string }) => {
      await supabase.storage.from("procedures").remove([f.storage_path]);
      const { error } = await supabase.from("procedure_files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Anexo removido"); qc.invalidateQueries({ queryKey: ["proc-files", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadFile = async (f: { storage_path: string; name: string }) => {
    const { data, error } = await supabase.storage.from("procedures")
      .createSignedUrl(f.storage_path, 60, { download: f.name });
    if (error || !data) return toast.error(error?.message ?? "Erro");
    window.open(data.signedUrl, "_blank");
  };



  const steps = useQuery({
    queryKey: ["proc-steps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedure_steps").select("*").eq("procedure_id", id).order("order_index");
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
      toast.success("Rascunho salvo");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["proc", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mudança de workflow — se vai pra "publicado", versiona automaticamente (minor)
  const changeWorkflow = useMutation({
    mutationFn: async (next: string) => {
      const p = proc.data!;
      const goingLive = next === "publicado" && p.workflow !== "publicado";
      let newVersion = p.version;

      if (goingLive) {
        newVersion = bumpVersion(p.version, false);
        const { error: vErr } = await supabase.from("procedure_versions").insert({
          procedure_id: p.id,
          version: newVersion,
          title: p.title,
          description: p.description,
          content: p.content,
          change_note: "Publicação",
          is_major: false,
          created_by: user!.id,
        });
        if (vErr) throw vErr;
      }

      const { error } = await supabase
        .from("procedures")
        .update({
          workflow: next as any,
          version: newVersion,
          published_at: goingLive ? new Date().toISOString() : p.published_at,
          last_revision: goingLive ? new Date().toISOString().slice(0, 10) : p.last_revision,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(`Status alterado para ${WORKFLOW_LABEL[next]}`);
      qc.invalidateQueries({ queryKey: ["proc", id] });
      qc.invalidateQueries({ queryKey: ["proc-versions", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Criar nova versão manualmente (snapshot do estado atual)
  const createVersion = useMutation({
    mutationFn: async () => {
      const p = proc.data!;
      const newVersion = bumpVersion(p.version, versionForm.major);
      const { error: vErr } = await supabase.from("procedure_versions").insert({
        procedure_id: p.id,
        version: newVersion,
        title: p.title,
        description: p.description,
        content: p.content,
        change_note: versionForm.note.trim() || null,
        is_major: versionForm.major,
        created_by: user!.id,
      });
      if (vErr) throw vErr;
      const { error } = await supabase
        .from("procedures")
        .update({ version: newVersion, last_revision: new Date().toISOString().slice(0, 10) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nova versão criada");
      setVersionDialog(false);
      setVersionForm({ note: "", major: false });
      qc.invalidateQueries({ queryKey: ["proc", id] });
      qc.invalidateQueries({ queryKey: ["proc-versions", id] });
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

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => {
      const max = main.scrollHeight - main.clientHeight;
      const p = max > 0 ? Math.min(100, Math.max(0, (main.scrollTop / max) * 100)) : 0;
      setProgress(p);
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

  if (proc.isLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!proc.data) {
    return (
      <Card className="max-w-md mx-auto mt-12 border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground space-y-3">
          <p>Procedimento não encontrado ou você não tem acesso.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/procedimentos"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const done = (steps.data ?? []).filter((s) => progressQ.data?.get(s.id)).length;
  const total = steps.data?.length ?? 0;
  const readMinutes = Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 220));
  const workflow = proc.data.workflow ?? "rascunho";

  return (
    <div className="relative -m-6">
      <div className="sticky top-0 z-20 h-1 bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/procedimentos"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Link>
          </Button>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => setFontSize((s) => Math.max(14, s - 1))} title="Diminuir fonte">
              <AArrowDown className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{fontSize}px</span>
            <Button variant="outline" size="icon" onClick={() => setFontSize((s) => Math.min(24, s + 1))} title="Aumentar fonte">
              <AArrowUp className="w-4 h-4" />
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" className="ml-2" onClick={() => setVersionDialog(true)}>
                  <GitBranch className="w-4 h-4 mr-1" />Nova versão
                </Button>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => { setDraft(content); setEditing(true); }}>
                    <Pencil className="w-4 h-4 mr-1" />Editar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={WORKFLOW_VARIANT[workflow]}>{WORKFLOW_LABEL[workflow]}</Badge>
            <Badge variant="outline">v{proc.data.version}</Badge>
            {proc.data.category && <Badge variant="secondary">{proc.data.category}</Badge>}
            {proc.data.sectors && <Badge variant="secondary">{(proc.data.sectors as any).name}</Badge>}
            {content && <Badge variant="outline">⏱ {readMinutes} min de leitura</Badge>}
            {typeof proc.data.access_count === "number" && (
              <Badge variant="outline">{proc.data.access_count} acessos</Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">{proc.data.title}</h1>
          {proc.data.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">{proc.data.description}</p>
          )}
          <div className="text-xs text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Última revisão: {proc.data.last_revision ? new Date(proc.data.last_revision).toLocaleDateString("pt-BR") : "—"}</span>
            {proc.data.published_at && (
              <span>Publicado em: {new Date(proc.data.published_at).toLocaleDateString("pt-BR")}</span>
            )}
            {canEdit && (
              <span className="flex items-center gap-2">
                <span>Status:</span>
                <Select
                  value={workflow}
                  onValueChange={(v) => changeWorkflow.mutate(v)}
                  disabled={changeWorkflow.isPending}
                >
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="em_revisao">Em revisão</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </span>
            )}
          </div>
        </header>

        <Tabs defaultValue="artigo" className="w-full">
          <TabsList>
            <TabsTrigger value="artigo"><BookOpen className="w-4 h-4 mr-1" />Artigo</TabsTrigger>
            <TabsTrigger value="checklist"><ListChecks className="w-4 h-4 mr-1" />Checklist {total > 0 && `(${done}/${total})`}</TabsTrigger>
            <TabsTrigger value="anexos"><Paperclip className="w-4 h-4 mr-1" />Anexos {(files.data?.length ?? 0) > 0 && `(${files.data?.length})`}</TabsTrigger>
            <TabsTrigger value="historico"><History className="w-4 h-4 mr-1" />Histórico {(versions.data?.length ?? 0) > 0 && `(${versions.data?.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="artigo" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8">
              <article ref={articleRef} className="min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={24} className="font-mono text-sm"
                      placeholder="# Título&#10;&#10;Escreva o artigo em **Markdown**." />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                      <Button onClick={() => saveContent.mutate()} disabled={saveContent.isPending}>
                        <Save className="w-4 h-4 mr-1" />{saveContent.isPending ? "Salvando..." : "Salvar rascunho"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Salvar não cria nova versão. Para versionar, use <strong>Nova versão</strong> ou mude o status para <strong>Publicado</strong>.
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
                          <Checkbox checked={checked} onCheckedChange={(v) => toggle.mutate({ stepId: s.id, value: !!v })} className="mt-0.5" />
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

          <TabsContent value="anexos" className="mt-6">
            <Card className="max-w-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Anexos</span>
                  {canEdit && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFile.mutate(f);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      />
                      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadFile.isPending}>
                        <Upload className="w-4 h-4 mr-1" />{uploadFile.isPending ? "Enviando..." : "Enviar arquivo"}
                      </Button>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {files.isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
                ) : (files.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum anexo neste procedimento.</p>
                ) : (
                  <ul className="space-y-2">
                    {files.data!.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : "—"} · {new Date(f.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => downloadFile(f)} title="Baixar">
                          <Download className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => {
                            if (confirm(`Remover "${f.name}"?`)) deleteFile.mutate({ id: f.id, storage_path: f.storage_path });
                          }} title="Remover">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 max-w-6xl">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Versões</CardTitle></CardHeader>
                <CardContent>
                  {versions.isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
                  ) : (versions.data?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem versões.</p>
                  ) : (
                    <ul className="space-y-2">
                      {versions.data!.map((v) => (
                        <li key={v.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                          <Badge variant={v.is_major ? "default" : "outline"} className="shrink-0 mt-0.5">v{v.version}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{v.change_note || (v.is_major ? "Mudança major" : "Atualização")}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(v.created_at).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comparar versões</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">De (base)</Label>
                      <Select value={diffFromId} onValueChange={setDiffFromId}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma versão" /></SelectTrigger>
                        <SelectContent>
                          {(versions.data ?? []).map((v) => (
                            <SelectItem key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString("pt-BR")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Para</Label>
                      <Select value={diffToId} onValueChange={setDiffToId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Versão atual (v{proc.data.version})</SelectItem>
                          {(versions.data ?? []).map((v) => (
                            <SelectItem key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString("pt-BR")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(() => {
                    if (!diffFromId) {
                      return <p className="text-sm text-muted-foreground text-center py-8">Escolha uma versão base para comparar.</p>;
                    }
                    const from = versions.data?.find((v) => v.id === diffFromId);
                    const to = diffToId === "current"
                      ? { content, version: proc.data.version }
                      : versions.data?.find((v) => v.id === diffToId);
                    if (!from || !to) return null;
                    const parts = diffLines(from.content ?? "", to.content ?? "");
                    const added = parts.filter((p) => p.added).reduce((a, p) => a + (p.count ?? 0), 0);
                    const removed = parts.filter((p) => p.removed).reduce((a, p) => a + (p.count ?? 0), 0);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">+{added} linhas</span>
                          <span className="text-red-600 dark:text-red-400">−{removed} linhas</span>
                        </div>
                        <pre className="text-xs font-mono border rounded-md max-h-[60vh] overflow-auto p-0 leading-relaxed">
                          {parts.map((p, i) => {
                            const cls = p.added
                              ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-l-2 border-emerald-500"
                              : p.removed
                              ? "bg-red-500/10 text-red-900 dark:text-red-200 border-l-2 border-red-500"
                              : "text-muted-foreground border-l-2 border-transparent";
                            const prefix = p.added ? "+ " : p.removed ? "− " : "  ";
                            return (
                              <div key={i} className={`${cls} px-3 py-0.5 whitespace-pre-wrap break-words`}>
                                {p.value.split("\n").filter((_, idx, arr) => idx < arr.length - 1 || _ !== "").map((line, j) => (
                                  <div key={j}>{prefix}{line}</div>
                                ))}
                              </div>
                            );
                          })}
                        </pre>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={versionDialog} onOpenChange={setVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar nova versão</DialogTitle>
            <DialogDescription>
              Cria um snapshot do conteúdo atual. Atual: v{proc.data.version} → v{bumpVersion(proc.data.version, versionForm.major)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nota da mudança</Label>
              <Textarea
                rows={3}
                value={versionForm.note}
                onChange={(e) => setVersionForm({ ...versionForm, note: e.target.value })}
                placeholder="Ex: Atualização do prazo de DCTFWeb conforme IN 2.005"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={versionForm.major}
                onCheckedChange={(v) => setVersionForm({ ...versionForm, major: !!v })}
              />
              Mudança relevante (versão major)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialog(false)}>Cancelar</Button>
            <Button onClick={() => createVersion.mutate()} disabled={createVersion.isPending}>
              {createVersion.isPending ? "Criando..." : "Criar versão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
