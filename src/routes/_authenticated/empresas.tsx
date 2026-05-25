import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isApprover } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
  head: () => ({ meta: [{ title: "Empresas — União Contadores" }] }),
});

const STATUS_OPTIONS = ["ativo", "inativo", "suspenso"] as const;

function EmpresasPage() {
  const { roles } = useAuth();
  const canManage = isApprover(roles);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    sector_id: "",
    status: "ativo" as (typeof STATUS_OPTIONS)[number],
    observacoes: "",
  });

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () =>
      (await supabase.from("companies").select("*, sectors(name)").order("razao_social")).data ?? [],
  });

  const sectors = useQuery({
    queryKey: ["sectors-all"],
    queryFn: async () => (await supabase.from("sectors").select("id, name").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.razao_social.trim()) throw new Error("Razão social é obrigatória");
      const { error } = await supabase.from("companies").insert({
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim() || null,
        sector_id: form.sector_id || null,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa cadastrada");
      setForm({ razao_social: "", nome_fantasia: "", sector_id: "", status: "ativo", observacoes: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">Cadastro consolidado dos clientes.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" />Cadastrar empresa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Cadastrar empresa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Razão social *</Label>
                  <Input
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome fantasia</Label>
                  <Input
                    value={form.nome_fantasia}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Setor</Label>
                    <Select
                      value={form.sector_id || "none"}
                      onValueChange={(v) => setForm({ ...form, sector_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem setor</SelectItem>
                        {(sectors.data ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as (typeof STATUS_OPTIONS)[number] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    rows={4}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Razão social</TableHead><TableHead>Fantasia</TableHead><TableHead>Setor</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(companies.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.razao_social}</TableCell>
                  <TableCell>{c.nome_fantasia ?? "—"}</TableCell>
                  <TableCell>{c.sectors?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!companies.data?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
