import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export function OpNotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["ops_notifications", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    const channel = supabase
      .channel("ops-notif-" + user!.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ops_notifications",
          filter: "user_id=eq." + user!.id,
        },
        () => queryClient.invalidateQueries({ queryKey: ["ops_notifications", user!.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user!.id, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ops_notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops_notifications", user!.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ops_notifications")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops_notifications", user!.id] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-[4px]">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Ops Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-[4px] text-xs"
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="h-80">
          {(notifications ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            (notifications ?? []).map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`cursor-pointer border-b border-border px-4 py-3 hover:bg-secondary/50 transition-colors ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at))} ago
                </p>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default OpNotificationBell;
