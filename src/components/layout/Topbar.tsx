import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/permissions";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
  link: string | null;
}

export function Topbar() {
  const { profile, roles, signOut, user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifs((data ?? []) as Notification[]);
    };
    load();

    const channel = supabase
      .channel("notifs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    toast.success("Notificações marcadas como lidas");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = (profile?.full_name ?? "U C")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = roles[0] ? ROLE_LABELS[roles[0]] : "Colaborador";

  return (
    <div className="flex-1 flex items-center gap-3">
      <div className="relative max-w-md flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9 h-9 bg-background" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-destructive text-destructive-foreground border-0 text-[10px]">
                  {unread}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-medium text-sm">Notificações</div>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Sem notificações</div>
              ) : (
                <ul className="divide-y">
                  {notifs.map((n) => (
                    <li key={n.id} className={`p-3 ${!n.read ? "bg-accent/20" : ""}`}>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium leading-tight">{profile?.full_name || user?.email}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{profile?.position || roleLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm">{profile?.full_name}</div>
              <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
              <div className="text-xs text-muted-foreground font-normal mt-1">{roleLabel}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard"><UserIcon className="w-4 h-4 mr-2" />Meu perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
