import { useState } from "react";
import { Mail, Copy, Check, RefreshCw, Save, Building2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface EmployeeSignatureProps {
  employee: any;
  onUpdate?: (data: any) => void;
}

export function EmployeeSignature({ employee, onUpdate }: EmployeeSignatureProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Basic signature template
    const signature = `
${employee.nome_completo}
${employee.cargo_padronizado || employee.cargo}
União Contadores

E-mail: ${employee.email_corporativo}
Telefone: ${employee.telefone || "(XX) XXXX-XXXX"} | Ramal: ${employee.ramal || "-"}
Site: www.uniaocontadores.com.br
    `.trim();

    navigator.clipboard.writeText(signature);
    setCopied(true);
    toast.success("Assinatura copiada com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Configurações Institucionais</h3>
            <Card className="border-border/40 bg-muted/20 shadow-none">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cargo Padronizado</p>
                    <p className="text-sm font-semibold">{employee.cargo_padronizado || employee.cargo || "Não definido"}</p>
                  </div>
                </div>
                
                <Separator className="opacity-40" />
                
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Empresa</p>
                    <p className="text-sm font-semibold">União Contadores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Informações Adicionais</h3>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              {employee.informacoes_institucionais || "Nenhuma informação institucional adicional cadastrada para este colaborador."}
            </p>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleCopy} className="gap-2 rounded-xl h-11 px-6 shadow-sm">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado!" : "Copiar Assinatura"}
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl h-11 px-6 border-border/60">
                <RefreshCw className="w-4 h-4" />
                Restaurar Padrão
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Visualização Prévia</h3>
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/40" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/40" />
                <span className="ml-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Novo E-mail</span>
              </div>
            </CardHeader>
            <CardContent className="p-8 bg-background min-h-[250px] flex items-end">
              <div className="w-full space-y-4 border-l-4 border-primary pl-6 py-2">
                <div className="space-y-0.5">
                  <p className="font-bold text-lg text-foreground leading-tight">{employee.nome_completo}</p>
                  <p className="text-primary font-semibold text-sm tracking-tight">{employee.cargo_padronizado || employee.cargo}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span className="text-xs font-bold uppercase tracking-wider">União Contadores</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {employee.email_corporativo}</span>
                    <span className="flex items-center gap-1.5 font-medium underline underline-offset-4 decoration-primary/30">www.uniaocontadores.com.br</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/60 pt-2">
                    Av. Brasil, 1500 - Sala 402, Centro - Cascavel/PR
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-[10px] text-muted-foreground text-center">
            Esta é uma prévia da sua assinatura digital padronizada.
          </p>
        </div>
      </div>
    </div>
  );
}
