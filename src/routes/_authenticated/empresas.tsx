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
import { Plus, Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
  head: () => ({ meta: [{ title: "Empresas — União Contadores" }] }),
});

const STATUS_OPTIONS = ["ativo", "inativo", "prospecto"] as const;

function EmpresasPage() {
  const { roles } = useAuth();
  const canManage = isApprover(roles);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alphabetFilter, setAlphabetFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [form, setForm] = useState({
    company_number: "",
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

  const filteredList = (companies.data ?? []).filter((c: any) => {
    const matchesSearch = 
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.includes(searchTerm) ||
      c.company_number?.includes(searchTerm);
    
    const matchesAlphabet = !alphabetFilter || 
      c.razao_social.toUpperCase().startsWith(alphabetFilter);
    
    return matchesSearch && matchesAlphabet;
  });

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const create = useMutation({
    mutationFn: async () => {
      if (!form.razao_social.trim()) throw new Error("Razão social é obrigatória");
      const { error } = await supabase.from("companies").insert({
        company_number: form.company_number.trim() || null,
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
      setForm({ company_number: "", razao_social: "", nome_fantasia: "", sector_id: "", status: "ativo", observacoes: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const parseDate = (v: string): string | null => {
    if (!v) return null;
    const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const iso = v.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return v.slice(0, 10);
    return null;
  };

  const importXlsx = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("Planilha vazia");

      const sectorMap = new Map(
        (sectors.data ?? []).map((s) => [s.name.toLowerCase().trim(), s.id]),
      );

      const get = (r: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(r)) {
          const normalizedK = k.toLowerCase().trim();
          if (keys.some(key => normalizedK === key.toLowerCase().trim() || normalizedK.includes(key.toLowerCase().trim()))) {
            return String(r[k] ?? "").trim();
          }
        }
        return "";
      };

      const payload = rows
        .map((r) => {
          const razao = get(r, ["razao_social", "razão social", "razao social", "razão_social"]);
          if (!razao) return null;
          const setorNome = get(r, ["setor", "sector"]);
          const statusRaw = get(r, ["status"]).toLowerCase();
          const status = (STATUS_OPTIONS as readonly string[]).includes(statusRaw)
            ? (statusRaw as (typeof STATUS_OPTIONS)[number])
            : "ativo";
          const capRaw = get(r, ["capital social", "capital_social"]).replace(/\./g, "").replace(",", ".");
          const cap = capRaw ? Number(capRaw) : null;
          return {
            company_number: get(r, ["nº", "n", "numero_empresa", "company_number"]) || null,
            razao_social: razao,
            nome_fantasia: get(r, ["nome_fantasia", "nome fantasia", "fantasia"]) || null,
            sector_id: setorNome ? sectorMap.get(setorNome.toLowerCase()) ?? null : null,
            status,
            observacoes: get(r, ["observacoes", "observações", "obs"]) || null,
            cnpj: get(r, ["cnpj"]) || null,
            situacao: get(r, ["situação", "situacao"]) || null,
            data_situacao: parseDate(get(r, ["data situação", "data situacao", "data_situacao"])),
            inicio_atividades: parseDate(get(r, ["início atividades", "inicio atividades", "inicio_atividades"])),
            natureza_juridica: get(r, ["natureza jurídica", "natureza juridica", "natureza_juridica"]) || null,
            porte: get(r, ["porte"]) || null,
            capital_social: cap && !isNaN(cap) ? cap : null,
            simples_nacional: get(r, ["simples nacional", "simples_nacional"]) || null,
            mei: get(r, ["mei"]) || null,
            cnae_principal: get(r, ["cnae principal", "cnae_principal", "atividade economica", "atividade econômica", "cnae"]) || null,
            cnaes_secundarios: get(r, ["cnaes secundários", "cnaes secundarios", "cnaes_secundarios", "atividades secundarias"]) || null,
            logradouro: get(r, ["logradouro"]) || null,
            numero: get(r, ["número", "numero"]) || null,
            complemento: get(r, ["complemento"]) || null,
            bairro: get(r, ["bairro"]) || null,
            municipio: get(r, ["município", "municipio"]) || null,
            uf: get(r, ["uf"]) || null,
            cep: get(r, ["cep"]) || null,
            telefone1: get(r, ["telefone 1", "telefone1", "telefone"]) || null,
            telefone2: get(r, ["telefone 2", "telefone2"]) || null,
            email: get(r, ["e-mail", "email"]) || null,
            socios: get(r, ["sócios", "socios", "quadro societário", "quadro societario", "administradores"]) || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (!payload.length) throw new Error("Nenhuma linha com 'razao_social' encontrada");

      const normCnpj = (v: string | null) => (v ? v.replace(/\D/g, "") : "");
      const existing = new Set(
        ((await supabase.from("companies").select("cnpj")).data ?? [])
          .map((c: { cnpj: string | null }) => normCnpj(c.cnpj))
          .filter(Boolean),
      );
      const seen = new Set<string>();
      let skipped = 0;
      const deduped = payload.filter((p) => {
        const key = normCnpj(p.cnpj);
        if (!key) return true;
        if (existing.has(key) || seen.has(key)) {
          skipped++;
          return false;
        }
        seen.add(key);
        return true;
      });

      if (!deduped.length) {
        throw new Error(`Nenhuma empresa nova — ${skipped} CNPJ(s) duplicado(s) ignorado(s)`);
      }
      const { error } = await supabase.from("companies").insert(deduped);
      if (error) throw error;
      return { inserted: deduped.length, skipped };
    },
    onSuccess: ({ inserted, skipped }) => {
      toast.success(
        skipped > 0
          ? `${inserted} importada(s) — ${skipped} CNPJ(s) duplicado(s) ignorado(s)`
          : `${inserted} empresa(s) importada(s)`,
      );
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa excluída");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        company_number: "001", razao_social: "Exemplo LTDA", nome_fantasia: "Exemplo", setor: "", status: "ativo",
        cnpj: "", "Situação": "", "Data Situação": "", "Início Atividades": "",
        "Natureza Jurídica": "", "Porte": "", "Capital Social": "",
        "CNAE Principal": "", "CNAEs Secundários": "",
        "Logradouro": "", "Número": "", "Complemento": "", "Bairro": "",
        "Município": "", "UF": "", "CEP": "",
        "Telefone 1": "", "Telefone 2": "", "E-mail": "", "Sócios": "Sócio 1, Sócio 2",
        observacoes: "",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");
    XLSX.writeFile(wb, "modelo-empresas.xlsx");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">Cadastro consolidado dos clientes.</p>
        </div>
        <div className="w-full md:w-72">
          <Input 
            placeholder="Buscar por N°, nome ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canManage && (
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importXlsx.mutate(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />Modelo
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importXlsx.isPending}>
              <Upload className="w-4 h-4" />{importXlsx.isPending ? "Importando..." : "Importar Excel"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />Cadastrar empresa</Button>
              </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Cadastrar empresa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>N° (Código da Empresa)</Label>
                  <Input
                    value={form.company_number}
                    onChange={(e) => setForm({ ...form, company_number: e.target.value })}
                  />
                </div>
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
          </div>
        )}
      </div>

      {(() => {
        const list = filteredList;
        const total = list.length;
        const by = (s: string) => list.filter((c: any) => c.status === s).length;
        const stats = [
          { label: "Total", value: total },
          { label: "Ativas", value: by("ativo") },
          { label: "Inativas", value: by("inativo") },
          { label: "Prospectos", value: by("prospecto") },
        ];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg border">
        <Button
          variant={alphabetFilter === null ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setAlphabetFilter(null)}
        >
          Tudo
        </Button>
        {alphabet.map((char) => (
          <Button
            key={char}
            variant={alphabetFilter === char ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 text-xs"
            onClick={() => setAlphabetFilter(char === alphabetFilter ? null : char)}
          >
            {char}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">N°</TableHead>
              <TableHead>Razão social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredList.map((c: any) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(c)}
                >
                  <TableCell className="font-mono text-sm font-bold text-primary">{c.company_number ?? "—"}</TableCell>
                  <TableCell className="font-medium">
                    {c.razao_social}
                    {c.nome_fantasia && <div className="text-xs text-muted-foreground">{c.nome_fantasia}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.cnpj ?? "—"}</TableCell>
                  <TableCell>{c.municipio ? `${c.municipio}/${c.uf ?? ""}` : "—"}</TableCell>
                  <TableCell>{c.sectors?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!companies.data?.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.razao_social}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["N°", detail.company_number],
                  ["CNPJ", detail.cnpj],
                  ["Nome fantasia", detail.nome_fantasia],
                  ["Situação", detail.situacao],
                  ["Início atividades", detail.inicio_atividades],
                  ["Natureza jurídica", detail.natureza_juridica],
                  ["Porte", detail.porte],
                  ["Capital social", detail.capital_social ? `R$ ${detail.capital_social.toLocaleString()}` : ""],
                  ["E-mail", detail.email],
                  ["Telefone", detail.telefone1],
                  ["Setor", detail.sectors?.name],
                  ["Status", detail.status],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex flex-col border-b border-muted py-1">
                    <dt className="text-muted-foreground text-[10px] uppercase font-bold">{label}</dt>
                    <dd className="font-medium">{val || "—"}</dd>
                  </div>
                ))}
              </dl>
              
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Endereço</h4>
                <p className="text-sm">
                  {detail.logradouro}, {detail.numero} {detail.complemento && `- ${detail.complemento}`}
                  <br />
                  {detail.bairro} — {detail.municipio}/{detail.uf}
                  <br />
                  CEP: {detail.cep}
                </p>
              </div>

              {detail.cnae_principal && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground">CNAE Principal</h4>
                  {(() => {
                    const m = String(detail.cnae_principal).match(/^(\d+)\s*-\s*(.+)$/);
                    return m ? (
                      <p className="text-sm"><span className="font-mono font-semibold">{m[1]}</span> — {m[2]}</p>
                    ) : <p className="text-sm">{detail.cnae_principal}</p>;
                  })()}
                </div>
              )}

              {detail.cnaes_secundarios && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground">CNAEs Secundários</h4>
                  <ul className="space-y-1">
                    {String(detail.cnaes_secundarios).split(/\s*\|\s*/).filter(Boolean).map((c, i) => {
                      const m = c.match(/^(\d+)\s*-\s*(.+)$/);
                      return (
                        <li key={i} className="text-sm flex gap-2">
                          {m ? (<><span className="font-mono font-semibold text-muted-foreground shrink-0">{m[1]}</span><span>{m[2]}</span></>) : c}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {detail.socios && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Sócios</h4>
                  <ul className="space-y-1">
                    {String(detail.socios).split(/\s*\|\s*/).filter(Boolean).map((s, i) => {
                      const m = s.match(/^(.+?)\s*\((.+)\)\s*$/);
                      return (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="font-medium">{m ? m[1] : s}</span>
                          {m && <Badge variant="secondary" className="text-[10px]">{m[2]}</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {detail.observacoes && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Observações</h4>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{detail.observacoes}</p>
                </div>
              )}


              {canManage && (
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirm("Deseja realmente excluir esta empresa?")) deleteCompany.mutate(detail.id);
                  }} disabled={deleteCompany.isPending}>
                    <Trash2 className="w-4 h-4" /> Excluir empresa
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmpresasPage;
