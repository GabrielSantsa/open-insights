import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Save, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { EmployeeStatus } from "@/lib/permissions";

interface EmployeeFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function EmployeeForm({ initialData, onSubmit, onCancel, isSubmitting }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    nome_completo: "",
    cargo: "",
    cargo_padronizado: "",
    setor: "",
    email_corporativo: "",
    telefone: "",
    ramal: "",
    status: "ativo" as EmployeeStatus,
    gestor_id: null as string | null,
    localizacao: "",
    data_admissao: new Date().toISOString().split('T')[0],
    informacoes_institucionais: "",
    assinatura_email: "",
    foto_url: "",
    coordenador_id: null as string | null,
    foco: "",
    perfil: "",
    atuacao: "",
    competencias_responsabilidades: "",
    conhecimento_tecnico: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome_completo: initialData.nome_completo || "",
        cargo: initialData.cargo || "",
        cargo_padronizado: initialData.cargo_padronizado || "",
        setor: initialData.setor || "",
        email_corporativo: initialData.email_corporativo || "",
        telefone: initialData.telefone || "",
        ramal: initialData.ramal || "",
        status: initialData.status || "ativo",
        gestor_id: initialData.gestor_id || "none", // Use "none" as a placeholder for null in Select
        localizacao: initialData.localizacao || "",
        data_admissao: initialData.data_admissao ? new Date(initialData.data_admissao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        informacoes_institucionais: initialData.informacoes_institucionais || "",
        assinatura_email: initialData.assinatura_email || "",
        foto_url: initialData.foto_url || "",
        coordenador_id: initialData.coordenador_id || "none",
      });
    }
  }, [initialData]);

  const { data: managers } = useQuery({
    queryKey: ["employees-list-mini"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("id, nome_completo")
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      gestor_id: formData.gestor_id === "none" ? null : formData.gestor_id,
      coordenador_id: formData.coordenador_id === "none" ? null : formData.coordenador_id,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-8 pb-10">
          {/* Sessão 1: Informações Pessoais e Foto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <User className="w-4 h-4" />
              Identificação e Perfil
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome completo *</Label>
                <Input 
                  id="nome_completo" 
                  required
                  placeholder="Ex: João Silva" 
                  value={formData.nome_completo} 
                  onChange={(e) => setFormData({...formData, nome_completo: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foto_url">URL da Foto</Label>
                <Input 
                  id="foto_url" 
                  placeholder="https://exemplo.com/foto.jpg" 
                  value={formData.foto_url} 
                  onChange={(e) => setFormData({...formData, foto_url: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Cargo e Setor */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Dados Profissionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo (Exibição) *</Label>
                <Input 
                  id="cargo" 
                  required
                  placeholder="Ex: Contador Sênior" 
                  value={formData.cargo} 
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo_padronizado">Cargo Padronizado</Label>
                <Input 
                  id="cargo_padronizado" 
                  placeholder="Ex: CONTADOR_SR" 
                  value={formData.cargo_padronizado} 
                  onChange={(e) => setFormData({...formData, cargo_padronizado: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setor">Setor *</Label>
                <Input 
                  id="setor" 
                  required
                  placeholder="Ex: Fiscal" 
                  value={formData.setor} 
                  onChange={(e) => setFormData({...formData, setor: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_admissao">Data de Admissão *</Label>
                <Input 
                  id="data_admissao" 
                  type="date"
                  required
                  value={formData.data_admissao} 
                  onChange={(e) => setFormData({...formData, data_admissao: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Sessão 3: Estrutura e Status */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Estrutura e Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val as any})}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gestor_id">Gestor Direto</Label>
                <Select value={formData.gestor_id || "none"} onValueChange={(val) => setFormData({...formData, gestor_id: val})}>
                  <SelectTrigger id="gestor_id">
                    <SelectValue placeholder="Selecione um gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {managers?.filter(m => m.id !== initialData?.id).map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordenador_id">Coordenador</Label>
                <Select value={formData.coordenador_id || "none"} onValueChange={(val) => setFormData({...formData, coordenador_id: val})}>
                  <SelectTrigger id="coordenador_id">
                    <SelectValue placeholder="Selecione um coordenador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {managers?.filter(m => m.id !== initialData?.id).map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input 
                  id="localizacao" 
                  placeholder="Ex: Sede Principal - São Paulo" 
                  value={formData.localizacao} 
                  onChange={(e) => setFormData({...formData, localizacao: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Sessão 4: Contato */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Informações de Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email_corporativo">E-mail corporativo *</Label>
                <Input 
                  id="email_corporativo" 
                  type="email" 
                  required
                  placeholder="nome@uniaocontadores.com.br" 
                  value={formData.email_corporativo} 
                  onChange={(e) => setFormData({...formData, email_corporativo: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  placeholder="(11) 0000-0000" 
                  value={formData.telefone} 
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ramal">Ramal</Label>
                <Input 
                  id="ramal" 
                  placeholder="123" 
                  value={formData.ramal} 
                  onChange={(e) => setFormData({...formData, ramal: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Sessão 5: Adicionais */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="informacoes_institucionais">Informações Institucionais</Label>
                <Textarea 
                  id="informacoes_institucionais" 
                  placeholder="Breve resumo sobre a trajetória ou foco do colaborador..." 
                  className="min-h-[100px]"
                  value={formData.informacoes_institucionais} 
                  onChange={(e) => setFormData({...formData, informacoes_institucionais: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assinatura_email">Assinatura de E-mail (HTML/Texto)</Label>
                <Textarea 
                  id="assinatura_email" 
                  placeholder="Conteúdo da assinatura automática..." 
                  className="min-h-[100px] font-mono text-xs"
                  value={formData.assinatura_email} 
                  onChange={(e) => setFormData({...formData, assinatura_email: e.target.value})} 
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-6 border-t bg-background/95 backdrop-blur-sm flex gap-3 sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-xl h-11" disabled={isSubmitting}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 shadow-sm rounded-xl h-11" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Salvando...
            </div>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Informações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
