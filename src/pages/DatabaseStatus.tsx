import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Database, Table as TableIcon, Hash } from "lucide-react";

const DatabaseStatus = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["supabase-stats"],
    queryFn: async () => {
      // List of main tables to check
      const tables = [
        "companies",
        "profiles",
        "tasks",
        "sectors",
        "news_posts",
        "apps",
        "procedures",
        "employee_profiles",
        "internal_messages"
      ];

      const results = await Promise.all(
        tables.map(async (tableName) => {
          const { count, error } = await supabase
            .from(tableName as any)
            .select("*", { count: "exact", head: true });
          
          return {
            name: tableName,
            count: count || 0,
            error: error ? error.message : null
          };
        })
      );

      return results;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive bg-destructive/10 rounded-lg">
        Erro ao carregar estatísticas do banco de dados.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Status do Banco de Dados</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats?.slice(0, 3).map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {item.name === 'companies' ? 'Empresas' : item.name === 'profiles' ? 'Usuários' : 'Demandas'}
              </CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Visão Geral das Tabelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Tabela</TableHead>
                <TableHead className="text-right">Total de Registros</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium capitalize">{item.name.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right font-mono">{item.count}</TableCell>
                  <TableCell>
                    {item.error ? (
                      <span className="text-destructive text-sm">Erro de acesso</span>
                    ) : (
                      <span className="text-green-500 text-sm">Ativo</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseStatus;
