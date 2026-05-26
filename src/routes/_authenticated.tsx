import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { InternalChat } from "@/components/InternalChat";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  // Auth gating happens client-side via useAuth below — avoids a blocking
  // supabase.auth.getSession() roundtrip on every navigation.
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login" });
      } else {
        // Adicionamos um pequeno delay ou garantimos que o perfil foi tentado carregar
        setReady(true);
      }
    }
  }, [loading, user, navigate]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger />
            <Topbar />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
          <InternalChat />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
