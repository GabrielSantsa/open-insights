import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, UserPlus, Users, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  const [view, setView] = useState("cards");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Colaboradores</h1>
          <p className="text-muted-foreground">Encontre rapidamente contatos internos e estrutura da equipe.</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo colaborador
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." className="pl-9" />
        </div>
        <div className="ml-auto flex items-center gap-2 border rounded-md p-1">
          <Button variant={view === "cards" ? "secondary" : "ghost"} size="sm" onClick={() => setView("cards")}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Placeholder for filters */}
        <div className="h-8 bg-muted animate-pulse w-24 rounded-full" />
        <div className="h-8 bg-muted animate-pulse w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 rounded-xl border bg-card p-6 animate-pulse" />
        ))}
      </div>
    </div>
  );
}