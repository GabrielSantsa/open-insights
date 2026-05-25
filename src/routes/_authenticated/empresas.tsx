import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
  head: () => ({ meta: [{ title: "Empresas — União Contadores" }] }),
});

function EmpresasPage() {
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await supabase.from("companies").select("*, sectors(name)").order("razao_social")).data ?? [],
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
        <p className="text-sm text-muted-foreground">Cadastro consolidado dos clientes.</p>
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
