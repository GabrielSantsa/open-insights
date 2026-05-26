import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { InternalChat } from "@/components/InternalChat";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If we're not loading and have no user, redirect to login
    if (!loading && !user) {
      navigate({ to: "/login" });
      return;
    }

    // If we have a user, we're ready to show the layout, even if some profile data is still fetching
    if (user) {
      setReady(true);
    }
  }, [loading, user, navigate]);

  // Only show the global loading spinner if we're actively loading AND have no user yet
  if (loading && !user && !ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse">Acessando sistema...</p>
      </div>
    );
  }

  // If after loading we still have no user (and redirect hasn't happened yet), keep blank or show login
  if (!user && !loading) return null;

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
