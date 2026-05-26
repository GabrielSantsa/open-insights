import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, CheckSquare, BookOpen, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meu-perfil/painel")({
  component: MeuPainel,
});

function MeuPainel() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu Painel</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Tarefas Pendentes", value: "3", icon: CheckSquare, color: "text-amber-600" },
          { label: "Tarefas Atrasadas", value: "1", icon: AlertCircle, color: "text-rose-600" },
          { label: "Procedimentos Favoritos", value: "5", icon: BookOpen, color: "text-primary" },
          { label: "Próximos Prazos", value: "2", icon: Clock, color: "text-blue-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase">Minhas Demandas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma demanda ativa no momento.</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase">Próximos Treinamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-sm">Você não possui treinamentos agendados.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
