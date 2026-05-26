import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function InternalChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["internal_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_messages")
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      // Reverse to show in chronological order in the UI
      return (data as ChatMessage[]).reverse();
    },
    refetchOnWindowFocus: false,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("internal_messages").insert({
        sender_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["internal_messages"] });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("internal_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "internal_messages" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["internal_messages"] });
          if (!isOpen && payload.new.sender_id !== user?.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, queryClient, user?.id]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message.trim());
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 sm:w-96 h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-4">
          <CardHeader className="p-4 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat Interno
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden bg-muted/30">
            <div className="h-full overflow-y-auto p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender_id === user?.id ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {msg.profiles?.full_name || "Usuário"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        • {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card text-card-foreground border rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-3 border-t bg-card">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <div className="relative">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 animate-bounce hover:animate-none transition-all duration-300"
            onClick={() => setIsOpen(true)}
          >
            <MessageCircle className="h-7 w-7 text-white" />
          </Button>
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center p-0 border-2 border-background animate-in zoom-in"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
