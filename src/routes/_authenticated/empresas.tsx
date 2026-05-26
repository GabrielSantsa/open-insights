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
  const [isEditingNumbers, setIsEditingNumbers] = useState(false);
  const [tempNumbers, setTempNumbers] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredList = (companies.data ?? []).filter((c: any) => 
    c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.company_number?.includes(searchTerm)
  );
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
  const updateNumbersFileRef = useRef<HTMLInputElement>(null);

  // dd/mm/yyyy or yyyy-mm-dd → ISO date or null
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
          if (keys.includes(k.toLowerCase().trim())) return String(r[k] ?? "").trim();
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
            cnae_principal: get(r, ["cnae principal", "cnae_principal"]) || null,
            cnaes_secundarios: get(r, ["cnaes secundários", "cnaes secundarios", "cnaes_secundarios"]) || null,
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
            socios: get(r, ["sócios", "socios"]) || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (!payload.length) throw new Error("Nenhuma linha com 'razao_social' encontrada");

      // Dedupe by CNPJ: ignora duplicados dentro do arquivo e contra a base
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

  const updateNumbersXlsx = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("Planilha vazia");

      const get = (r: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(r)) {
          if (keys.includes(k.toLowerCase().trim())) return String(r[k] ?? "").trim();
        }
        return "";
      };

      const normCnpj = (v: string | null) => (v ? v.replace(/\D/g, "") : "");
      
      const updates = rows
        .map((r) => {
          const cnpj = normCnpj(get(r, ["cnpj"]));
          const number = get(r, ["nº", "n", "numero_empresa", "company_number", "n°", "n_empresa"]);
          if (!cnpj || !number) return null;
          return { cnpj, number };
        })
        .filter((x): x is { cnpj: string; number: string } => x !== null);

      if (!updates.length) throw new Error("Nenhuma linha com CNPJ e N° encontrada");

      // Get existing companies to map CNPJ -> ID
      const { data: existing } = await supabase.from("companies").select("id, cnpj");
      const cnpjMap = new Map((existing ?? []).map(c => [normCnpj(c.cnpj), c.id]));

      let count = 0;
      for (const item of updates) {
        const id = cnpjMap.get(item.cnpj);
        if (id) {
          const { error } = await supabase
            .from("companies")
            .update({ company_number: item.number })
            .eq("id", id);
          if (!error) count++;
        }
      }

      if (count === 0) throw new Error("Nenhum CNPJ correspondente encontrado no sistema");
      return count;
    },
    onSuccess: (count) => {
      toast.success(`${count} número(s) vinculado(s) com sucesso`);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBulkNumbers = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(tempNumbers);
      if (entries.length === 0) return;
      
      const promises = entries.map(([id, number]) => 
        supabase.from("companies").update({ company_number: number }).eq("id", id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error("Erro ao salvar alguns números");
    },
    onSuccess: () => {
      toast.success("Números salvos");
      setIsEditingNumbers(false);
      setTempNumbers({});
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
        "Telefone 1": "", "Telefone 2": "", "E-mail": "", "Sócios": "",
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
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importXlsx.isPending}>
              <Upload className="w-4 h-4" />{importXlsx.isPending ? "Importando..." : "Importar Excel"}
            </Button>
            <Button 
              variant={isEditingNumbers ? "default" : "outline"} 
              onClick={() => {
                if (isEditingNumbers) {
                  saveBulkNumbers.mutate();
                } else {
                  setIsEditingNumbers(true);
                }
              }}
              disabled={saveBulkNumbers.isPending}
            >
              {isEditingNumbers ? (saveBulkNumbers.isPending ? "Salvando..." : "Salvar Números") : "Editar Números"}
            </Button>
            {isEditingNumbers && (
              <Button variant="ghost" onClick={() => { setIsEditingNumbers(false); setTempNumbers({}); }}>
                Cancelar
              </Button>
            )}
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
                  <TableCell className="font-mono text-xs">
                    {isEditingNumbers ? (
                      <Input 
                        className="h-8 w-24 text-xs" 
                        value={tempNumbers[c.id] ?? c.company_number ?? ""} 
                        onChange={(e) => setTempNumbers({ ...tempNumbers, [c.id]: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      c.company_number ?? "—"
                    )}
                  </TableCell>
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
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.razao_social}</DialogTitle></DialogHeader>
          {detail && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["N°", detail.company_number],
                ["CNPJ", detail.cnpj],
                ["Nome fantasia", detail.nome_fantasia],
                ["Situação", detail.situacao],
                ["Data situação", detail.data_situacao],
                ["Início atividades", detail.inicio_atividades],
                ["Natureza jurídica", detail.natureza_juridica],
                ["Porte", detail.porte],
                ["Capital social", detail.capital_social != null ? Number(detail.capital_social).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null],
                ["Simples Nacional", detail.simples_nacional],
                ["MEI", detail.mei],
                ["CNAE principal", detail.cnae_principal],
                ["CNAEs secundários", detail.cnaes_secundarios],
                ["Endereço", [detail.logradouro, detail.numero, detail.complemento].filter(Boolean).join(", ") || null],
                ["Bairro", detail.bairro],
                ["Cidade/UF", detail.municipio ? `${detail.municipio}/${detail.uf ?? ""}` : null],
                ["CEP", detail.cep],
                ["Telefone 1", detail.telefone1],
                ["Telefone 2", detail.telefone2],
                ["E-mail", detail.email],
                ["Setor", detail.sectors?.name],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="col-span-2 sm:col-span-1">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium break-words">{v as string}</dd>
                </div>
              ))}
              {detail.socios && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Sócios</dt>
                  <dd className="font-medium whitespace-pre-wrap">{detail.socios.split(" | ").join("\n")}</dd>
                </div>
              )}
              {detail.observacoes && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Observações</dt>
                  <dd className="font-medium whitespace-pre-wrap">{detail.observacoes}</dd>
                </div>
              )}
            </dl>
          )}
          {canManage && detail && (
            <DialogFooter className="mt-6 border-t pt-4">
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => {
                  if (confirm("Deseja realmente excluir esta empresa?")) {
                    deleteCompany.mutate(detail.id);
                  }
                }}
                disabled={deleteCompany.isPending}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Empresa
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
