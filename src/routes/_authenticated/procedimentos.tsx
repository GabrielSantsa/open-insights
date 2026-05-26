import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Star, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["Fiscal", "Departamento Pessoal", "RH", "Comercial", "Financeiro", "Administrativo"];

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

export const Route = createFileRoute("/_authenticated/procedimentos")({
  component: ProceduresPage,
  head: () => ({ meta: [{ title: "Procedimentos — União Contadores" }] }),
});

function ProceduresPage() {
  const { user, roles } = useAuth();
  const canPublish = isApprover(roles);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", version: "1.0", category: "Fiscal" });


  const publish = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Título é obrigatório");
      const { error } = await supabase.from("procedures").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        version: form.version.trim() || "1.0",
        status: "ativo",
        responsible_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Procedimento publicado");
      setForm({ title: "", description: "", version: "1.0" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["procs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const procs = useQuery({
    queryKey: ["procs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("id, title, description, version, last_revision, status, sector_id, sectors(name)")
        .order("title");
      return data ?? [];
    },
  });

  const favs = useQuery({
    queryKey: ["my-fav-procs", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("procedure_favorites").select("procedure_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((f) => f.procedure_id));
    },
    enabled: !!user,
  });

  const toggleFav = useMutation({
    mutationFn: async ({ id, isFav }: { id: string; isFav: boolean }) => {
      if (isFav) {
        await supabase.from("procedure_favorites").delete().eq("user_id", user!.id).eq("procedure_id", id);
      } else {
        await supabase.from("procedure_favorites").insert({ user_id: user!.id, procedure_id: id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-fav-procs"] }),
  });

  const filtered = (procs.data ?? []).filter((p) =>
    !q || p.title.toLowerCase().includes(q.toLowerCase()) || (p.description ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">Base de conhecimento e checklists operacionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar procedimento..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          {canPublish && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />Publicar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Publicar procedimento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Versão</Label>
                    <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p: any) => {
          const isFav = favs.data?.has(p.id) ?? false;
          return (
            <Card key={p.id} className="hover:border-primary/40 transition-colors group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link to="/procedimentos/$id" params={{ id: p.id }} className="hover:underline">{p.title}</Link>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => toggleFav.mutate({ id: p.id, isFav })}
                  >
                    <Star className={`w-4 h-4 ${isFav ? "fill-accent text-accent" : ""}`} />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2">{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>v{p.version}{p.sectors ? ` · ${p.sectors.name}` : ""}</span>
                <Badge variant="outline" className="capitalize">{p.status.replace("_", " ")}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {!filtered.length && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-12">Nenhum procedimento encontrado.</div>
        )}
      </div>
    </div>
  );
}
