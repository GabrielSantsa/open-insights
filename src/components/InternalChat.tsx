import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function InternalChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["internal_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_messages")
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("internal_messages").insert({
        sender_id: user?.id,
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
    if (isOpen) {
      const channel = supabase
        .channel("internal_messages_changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "internal_messages" },
          () => {
            queryClient.invalidateQueries({ queryKey: ["internal_messages"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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
            <ScrollArea className="h-full p-4" viewportRef={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg: any) => (
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
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
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
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 border-t bg-card">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 animate-bounce hover:animate-none"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </Button>
      )}
    </div>
  );
}
