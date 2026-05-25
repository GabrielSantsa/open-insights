import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentosPage,
  head: () => ({ meta: [{ title: "Documentos — União Contadores" }] }),
});

function DocumentosPage() {
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await supabase.from("documents").select("*, sectors(name)").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos corporativos</h1>
        <p className="text-sm text-muted-foreground">Repositório seguro com controle por setor.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Arquivos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Tamanho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(docs.data ?? []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {d.sensitive && <Lock className="w-3 h-3 text-destructive" />}
                    {d.name}
                  </TableCell>
                  <TableCell>{d.category ?? "—"}</TableCell>
                  <TableCell>{d.sectors?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!docs.data?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum documento cadastrado. <span className="text-xs">(Upload disponível em breve via painel admin.)</span>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
