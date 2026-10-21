import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Siren,
  CheckCircle,
  CheckCheck,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  Activity,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

type ActionDialog = {
  open: boolean;
  escalationId: string;
  action: string;
  title: string;
};

const levelLabel: Record<number, string> = {
  1: "Assigned Person",
  2: "Managers",
  3: "Administrators",
};

const levelClass: Record<number, string> = {
  1: "bg-primary/10 text-primary",
  2: "bg-warning/10 text-warning",
  3: "bg-destructive/10 text-destructive",
};

const statusClass: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  acknowledged: "bg-warning/10 text-warning",
  resolved: "bg-accent/10 text-accent",
};

const eventIcon = (eventType: string) => {
  switch (eventType) {
    case "created":
      return <Plus className="h-3.5 w-3.5" />;
    case "escalated":
    case "auto_escalated":
      return <ChevronUp className="h-3.5 w-3.5" />;
    case "acknowledged":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "resolved":
      return <CheckCheck className="h-3.5 w-3.5" />;
    case "reopened":
      return <RotateCcw className="h-3.5 w-3.5" />;
    case "comment":
      return <MessageSquare className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
};

function EventHistory({ escalationId }: { escalationId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["escalation_events", escalationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalation_events")
        .select("*, profiles!actor_id(full_name)")
        .eq("escalation_id", escalationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">Loading events...</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((ev: any) => (
        <div key={ev.id} className="flex items-start gap-3 text-xs">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            {eventIcon(ev.event_type)}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">
              {ev.profiles?.full_name || "System"}
            </span>
            {" — "}
            <span className="capitalize text-muted-foreground">{ev.event_type.replace("_", " ")}</span>
            {ev.from_level != null && ev.to_level != null && (
              <span className="ml-1 text-muted-foreground">
                (Level {ev.from_level} → Level {ev.to_level})
              </span>
            )}
            {ev.note && (
              <span className="ml-1 italic text-muted-foreground">"{ev.note}"</span>
            )}
          </div>
          <span className="flex-shrink-0 text-muted-foreground">
            {format(new Date(ev.created_at), "MMM d, HH:mm")}
          </span>
        </div>
      ))}
      {events.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">No events recorded.</p>
      )}
    </div>
  );
}

export function OpEscalationsComponent() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    open: false,
    escalationId: "",
    action: "",
    title: "",
  });
  const [commentNote, setCommentNote] = useState("");

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ["escalations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("escalations", {
        body: {
          action: actionDialog.action,
          id: actionDialog.escalationId,
          note: commentNote || undefined,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalations"] });
      queryClient.invalidateQueries({
        queryKey: ["escalation_events", actionDialog.escalationId],
      });
      toast.success(`${actionDialog.title} successful.`);
      setActionDialog({ open: false, escalationId: "", action: "", title: "" });
      setCommentNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const openAction = (
    e: React.MouseEvent,
    escalationId: string,
    action: string,
    title: string
  ) => {
    e.stopPropagation();
    setCommentNote("");
    setActionDialog({ open: true, escalationId, action, title });
  };

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Track and manage escalation workflows."
      />

      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 label-caps">Title</th>
              <th className="px-5 py-3 label-caps">Source</th>
              <th className="px-5 py-3 label-caps">Level</th>
              <th className="px-5 py-3 label-caps">Status</th>
              <th className="px-5 py-3 label-caps">Deadline</th>
              <th className="px-5 py-3 label-caps">Created</th>
              <th className="px-5 py-3 label-caps">Actions</th>
            </tr>
          </thead>
          <tbody>
            {escalations.map((esc) => (
              <>
                <tr
                  key={esc.id}
                  className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-secondary/50"
                  onClick={() =>
                    setExpandedId(esc.id === expandedId ? null : esc.id)
                  }
                >
                  <td className="px-5 py-3 font-medium">{esc.title}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <span className="capitalize">{esc.source_table.replace("_", " ")}</span>
                    {" "}
                    <span className="font-mono-data text-xs">
                      {esc.source_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${
                        levelClass[esc.current_level] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {levelLabel[esc.current_level] || `Level ${esc.current_level}`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${
                        statusClass[esc.status] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {esc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {esc.level_deadline
                      ? formatDistanceToNow(new Date(esc.level_deadline), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono-data text-muted-foreground">
                    {format(new Date(esc.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {esc.status === "open" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Acknowledge"
                            onClick={(e) =>
                              openAction(e, esc.id, "acknowledge", "Acknowledge")
                            }
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Escalate"
                            onClick={(e) =>
                              openAction(e, esc.id, "escalate", "Escalate")
                            }
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Comment"
                            onClick={(e) =>
                              openAction(e, esc.id, "comment", "Comment")
                            }
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {esc.status === "acknowledged" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Resolve"
                            onClick={(e) =>
                              openAction(e, esc.id, "resolve", "Resolve")
                            }
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Escalate"
                            onClick={(e) =>
                              openAction(e, esc.id, "escalate", "Escalate")
                            }
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-[4px]"
                            title="Comment"
                            onClick={(e) =>
                              openAction(e, esc.id, "comment", "Comment")
                            }
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {esc.status === "resolved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-[4px]"
                          title="Reopen"
                          onClick={(e) =>
                            openAction(e, esc.id, "reopen", "Reopen")
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === esc.id && (
                  <tr key={`${esc.id}-events`}>
                    <td colSpan={7} className="px-5 pb-4 bg-secondary/30">
                      <p className="label-caps mb-3 mt-2">Event History</p>
                      <EventHistory escalationId={esc.id} />
                    </td>
                  </tr>
                )}
              </>
            ))}
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!isLoading && escalations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Siren className="h-8 w-8 mb-2" />
            <p className="text-sm">No escalations yet.</p>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({
              open: false,
              escalationId: "",
              action: "",
              title: "",
            });
            setCommentNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(actionDialog.action === "comment" ||
              actionDialog.action === "escalate") && (
              <Textarea
                placeholder="Optional note..."
                value={commentNote}
                onChange={(e) => setCommentNote(e.target.value)}
                className="rounded-[4px] min-h-[80px]"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-[4px]"
                onClick={() => {
                  setActionDialog({
                    open: false,
                    escalationId: "",
                    action: "",
                    title: "",
                  });
                  setCommentNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-[4px]"
                onClick={() => actionMutation.mutate()}
                disabled={actionMutation.isPending}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OpEscalationsComponent;
