import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin, ROLE_LABELS } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Administração — União Contadores" }] }),
});

function AdminPage() {
  const { roles } = useAuth();
  if (!isAdmin(roles)) {
    return <div className="text-center text-muted-foreground py-12">Acesso restrito a administradores.</div>;
  }
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, perfis e auditoria.</p>
        </div>
        <Button asChild>
          <Link to="/admin/usuarios/novo"><UserPlus className="w-4 h-4 mr-2" /> Novo usuário</Link>
        </Button>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="audit"><AuditPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const rolesMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesMap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: rolesMap.get(p.id) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Perfil atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Usuários cadastrados</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Cargo</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(users.data ?? []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{u.position ?? "—"}</TableCell>
                <TableCell>
                  <Select value={u.roles[0] ?? "colaborador"} onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as AppRole })}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Badge variant={u.active ? "default" : "outline"}>{u.active ? "Ativo" : "Inativo"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditPanel() {
  const logs = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => (await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Últimas ações registradas</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Recurso</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(logs.data ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{l.user_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-sm font-medium">{l.action}</TableCell>
                <TableCell className="text-sm">{l.resource ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!logs.data?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum registro de auditoria.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
