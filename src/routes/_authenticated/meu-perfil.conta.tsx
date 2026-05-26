import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";
import { User, Phone, Lock, Mail, Camera, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/meu-perfil/conta")({
  component: MinhaConta,
});

function MinhaConta() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["my-employee-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!employee?.id) throw new Error("Perfil não encontrado");
      const { error } = await supabase
        .from("employee_profiles")
        .update(updatedData)
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employee-profile", user?.id] });
      toast.success("Alterações salvas com sucesso!");
      setSaving(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar: ${err.message}`);
      setSaving(false);
    }
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      telefone: formData.get("phone") as string,
      ramal: formData.get("extension") as string,
    };
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-[500px] md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e configurações de segurança.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 flex flex-col items-center">
              <div className="relative group cursor-pointer">
                <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-1 ring-border/10 group-hover:ring-primary/20 transition-all">
                  <AvatarImage src={employee?.foto_url || ""} />
                  <AvatarFallback className="text-3xl bg-primary/5 text-primary">
                    {employee?.nome_completo?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="mt-6 text-[11px] text-muted-foreground text-center max-w-[150px]">
                Sua foto será visível para todos os colegas na plataforma.
              </p>
              <Button variant="outline" size="sm" className="mt-6 w-full h-10 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
                Alterar Imagem
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase">Dados Pessoais</CardTitle>
              <CardDescription>Mantenha suas informações de contato atualizadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input name="phone" id="phone" placeholder="(XX) XXXXX-XXXX" className="pl-9 h-11" defaultValue={employee?.telefone || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extension">Ramal</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input name="extension" id="extension" placeholder="000" className="pl-9 h-11" defaultValue={employee?.ramal || ""} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" readOnly disabled className="pl-9 h-11 bg-muted/30" value={employee?.email_corporativo || user?.email || ""} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">O e-mail corporativo não pode ser alterado por aqui.</p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving} className="px-8 h-11 rounded-xl shadow-sm">
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase">Assinatura de E-mail</CardTitle>
              <CardDescription>Esta assinatura será exibida em seu perfil institucional.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signature">Texto da Assinatura (Opcional)</Label>
                  <textarea 
                    id="signature"
                    name="signature"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={employee?.assinatura_email || ""}
                    placeholder="Adicione uma frase curta ou informação adicional..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    className="px-8 h-11 rounded-xl border-border/60"
                    onClick={() => {
                      const sig = (document.getElementById("signature") as HTMLTextAreaElement).value;
                      updateMutation.mutate({ assinatura_email: sig });
                    }}
                  >
                    Atualizar Assinatura
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase">Segurança</CardTitle>
              <CardDescription>Atualize sua senha periodicamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="current_password" type="password" className="pl-9 h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input id="new_password" type="password" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                    <Input id="confirm_password" type="password" className="h-11" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" className="px-8 h-11 rounded-xl border-border/60">Alterar Senha</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
