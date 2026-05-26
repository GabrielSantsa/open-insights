import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { adminCreateUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios/novo")({
  component: NewUserPage,
  head: () => ({ meta: [{ title: "Novo usuário — União Contadores" }] }),
});

function NewUserPage() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const createUser = useServerFn(adminCreateUser);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<AppRole>("colaborador");
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const sectors = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => (await supabase.from("sectors").select("id, name").order("name")).data ?? [],
  });

  if (!isAdmin(roles)) {
    return <div className="text-center text-muted-foreground py-12">Acesso restrito a administradores.</div>;
  }

  const toggleSector = (id: string) => {
    setSectorIds((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUser({ data: { fullName, email, password, position: position || null, role, sectorIds } });
      toast.success("Usuário criado com sucesso.");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastrar novo usuário</h1>
        <p className="text-sm text-muted-foreground">Apenas administradores podem criar acessos na intranet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do colaborador</CardTitle>
          <CardDescription>O usuário poderá entrar imediatamente com a senha definida abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex.: Analista Fiscal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha inicial</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Perfil de acesso</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Setores</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-md">
                {(sectors.data ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={sectorIds.includes(s.id)} onCheckedChange={() => toggleSector(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" asChild><Link to="/admin">Cancelar</Link></Button>
              <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar usuário"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
