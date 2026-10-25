import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Search, KeyRound, Pencil, MessageSquare, Trash2, RefreshCw, History } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO, format, addDays, formatDistanceToNow } from "date-fns";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { maskPhone } from "@/lib/mask";

export default function OpPasswords() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    system_name: "",
    username: "",
    assigned_to: "",
    expiry_date: "",
    phone_number: "",
    owner_user_id: "",
    backup_user_id: "",
    rotation_days: 90,
  });

  // Renew dialog state
  const [renewDialog, setRenewDialog] = useState<{ open: boolean; password: any | null }>({ open: false, password: null });
  const [renewNewExpiry, setRenewNewExpiry] = useState("");

  // History sheet state
  const [historySheet, setHistorySheet] = useState<{ open: boolean; passwordId: string | null; systemName: string }>({
    open: false,
    passwordId: null,
    systemName: "",
  });

  const { data: passwords = [], isLoading } = useQuery({
    queryKey: ["passwords"],
    queryFn: async () => {
      const { data, error } = await supabase.from("passwords").select("*").order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: profilesList = [] } = useQuery({
    queryKey: ["profiles_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        user_id: user!.id,
        phone_number: form.phone_number || null,
        owner_user_id: form.owner_user_id || null,
        backup_user_id: form.backup_user_id || null,
        rotation_days: form.rotation_days,
      } as any;
      if (editId) {
        delete payload.user_id;
        const { error } = await supabase.from("passwords").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("passwords").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      setOpen(false);
      setEditId(null);
      setForm({ system_name: "", username: "", assigned_to: "", expiry_date: "", phone_number: "", owner_user_id: "", backup_user_id: "", rotation_days: 90 });
      toast.success(editId ? "Password entry updated." : "Password entry added.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("passwords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast.success("Password entry deleted.");
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (p: { id: string; system_name: string; expiry_date: string; phone_number: string; assigned_to: string | null }) => {
      const { data, error } = await supabase.functions.invoke("ops-send-sms", {
        body: {
          phone: p.phone_number,
          message: `UMS REMINDER: Password for ${p.system_name} (${p.assigned_to || "unassigned"}) expires on ${p.expiry_date}. Please update it before expiry.`,
          related_table: "passwords",
          related_id: p.id,
        },
      });
      if (error) throw error;
      await supabase.from("passwords").update({ notified: true, last_notified_at: new Date().toISOString() }).eq("id", p.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast.success("SMS reminder sent.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      const pw = renewDialog.password!;
      const { error: insertError } = await supabase.from("password_renewals").insert({
        password_id: pw.id,
        previous_expiry: pw.expiry_date,
        new_expiry: renewNewExpiry,
        renewed_by: user!.id,
      });
      if (insertError) throw insertError;
      const { error: updateError } = await supabase
        .from("passwords")
        .update({ expiry_date: renewNewExpiry, last_renewed_at: new Date().toISOString() })
        .eq("id", pw.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      setRenewDialog({ open: false, password: null });
      toast.success("Password marked as renewed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: renewalHistory = [] } = useQuery({
    queryKey: ["password_renewals", historySheet.passwordId],
    enabled: !!historySheet.passwordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_renewals")
        .select("*, profiles!renewed_by(full_name)")
        .eq("password_id", historySheet.passwordId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (p: any) => {
    setForm({
      system_name: p.system_name,
      username: p.username,
      assigned_to: p.assigned_to || "",
      expiry_date: p.expiry_date,
      phone_number: p.phone_number || "",
      owner_user_id: p.owner_user_id || "",
      backup_user_id: p.backup_user_id || "",
      rotation_days: p.rotation_days ?? 90,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const getDaysLeft = (expiry: string) => differenceInDays(parseISO(expiry), new Date());

  const searchedPasswords = passwords.filter((p) =>
    p.system_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.assigned_to || "").toLowerCase().includes(search.toLowerCase())
  );

  const expired = searchedPasswords.filter((p) => getDaysLeft(p.expiry_date) <= 0);
  const dueThisWeek = searchedPasswords.filter((p) => { const d = getDaysLeft(p.expiry_date); return d >= 1 && d <= 7; });
  const dueThisMonth = searchedPasswords.filter((p) => { const d = getDaysLeft(p.expiry_date); return d >= 8 && d <= 30; });
  const healthy = searchedPasswords.filter((p) => getDaysLeft(p.expiry_date) > 30);

  const headers = ["System", "Username", "Assigned To", "Phone", "Expiry", "Status", "Owner", "Backup"];
  const toRow = (p: any) => {
    const dl = getDaysLeft(p.expiry_date);
    const ownerProfile = profilesList.find((pr) => pr.user_id === p.owner_user_id);
    const backupProfile = profilesList.find((pr) => pr.user_id === p.backup_user_id);
    return [
      p.system_name,
      p.username,
      p.assigned_to || "",
      isAdmin ? (p.phone_number || "") : maskPhone(p.phone_number),
      p.expiry_date,
      dl <= 0 ? "Expired" : `${dl}d`,
      ownerProfile?.full_name || "",
      backupProfile?.full_name || "",
    ];
  };

  const getStatusStyle = (daysLeft: number) => {
    if (daysLeft <= 0) return "bg-destructive text-destructive-foreground";
    if (daysLeft <= 2) return "bg-destructive/10 text-destructive";
    if (daysLeft <= 7) return "bg-warning/10 text-warning";
    return "bg-accent/10 text-accent";
  };

  const getStatusLabel = (daysLeft: number) => {
    if (daysLeft <= 0) return "Expired";
    if (daysLeft <= 2) return `${daysLeft}d — Critical`;
    if (daysLeft <= 7) return `${daysLeft}d — Warning`;
    return `${daysLeft}d`;
  };

  const renderTable = (rows: typeof passwords) => (
    <div className="card-shadow rounded-lg bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3 label-caps">System</th>
            <th className="px-5 py-3 label-caps">Username</th>
            <th className="px-5 py-3 label-caps">Assigned To</th>
            <th className="px-5 py-3 label-caps">Phone</th>
            <th className="px-5 py-3 label-caps">Expiry</th>
            <th className="px-5 py-3 label-caps">Status</th>
            <th className="px-5 py-3 label-caps">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const daysLeft = getDaysLeft(p.expiry_date);
            return (
              <tr key={p.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-5 py-3 font-medium">{p.system_name}</td>
                <td className="px-5 py-3 font-mono-data text-muted-foreground">{p.username}</td>
                <td className="px-5 py-3">{p.assigned_to || "—"}</td>
                <td className="px-5 py-3 font-mono-data text-muted-foreground">
                  {isAdmin ? ((p as any).phone_number || "—") : maskPhone((p as any).phone_number)}
                </td>
                <td className="px-5 py-3 font-mono-data tabular-nums">{p.expiry_date}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${getStatusStyle(daysLeft)}`}>
                    {getStatusLabel(daysLeft)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" title="Edit" onClick={() => handleEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-[4px] text-accent"
                      title="Mark Renewed"
                      onClick={() => {
                        setRenewDialog({ open: true, password: p });
                        setRenewNewExpiry(format(addDays(new Date(), (p as any).rotation_days ?? 90), "yyyy-MM-dd"));
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-[4px]"
                      title="Renewal History"
                      onClick={() => setHistorySheet({ open: true, passwordId: p.id, systemName: p.system_name })}
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    {(p as any).phone_number && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-[4px] text-primary"
                        title="Send SMS reminder"
                        onClick={() => sendSmsMutation.mutate({ id: p.id, system_name: p.system_name, expiry_date: p.expiry_date, phone_number: (p as any).phone_number, assigned_to: p.assigned_to })}
                        disabled={sendSmsMutation.isPending}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-[4px] text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {isLoading && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td>
            </tr>
          )}
        </tbody>
      </table>
      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <KeyRound className="h-8 w-8 mb-2" />
          <p className="text-sm">No passwords in this group.</p>
        </div>
      )}
    </div>
  );

  const resetForm = () => {
    setEditId(null);
    setForm({ system_name: "", username: "", assigned_to: "", expiry_date: "", phone_number: "", owner_user_id: "", backup_user_id: "", rotation_days: 90 });
  };

  return (
    <div>
      <PageHeader
        title="Passwords"
        description="Expiration tracking and employee assignment management."
        actions={
          <>
            <ExportMenu
              onCSV={() => exportToCSV(headers, searchedPasswords.map(toRow), `passwords-${format(new Date(), "yyyy-MM-dd")}.csv`)}
              onPDF={() => exportToPDF("Passwords", headers, searchedPasswords.map(toRow))}
              onExcel={() => exportToExcel("Passwords", headers, searchedPasswords.map(toRow))}
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-[4px]">
                  <Plus className="h-3.5 w-3.5" /> Add Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? "Edit Password Entry" : "Add Password Entry"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">System</Label>
                    <Input className="h-9 mt-1 rounded-[4px]" value={form.system_name} onChange={e => setForm({ ...form, system_name: e.target.value })} required />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Username</Label>
                    <Input className="h-9 mt-1 rounded-[4px]" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Assigned To</Label>
                    <Input className="h-9 mt-1 rounded-[4px]" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Phone Number (254...)</Label>
                    <Input className="h-9 mt-1 rounded-[4px]" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="254712345678" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Expiry Date</Label>
                    <Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Owner</Label>
                    <Select value={form.owner_user_id} onValueChange={(v) => setForm({ ...form, owner_user_id: v === "__none__" ? "" : v })}>
                      <SelectTrigger className="h-9 mt-1 rounded-[4px]"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {profilesList.map((pr) => (
                          <SelectItem key={pr.user_id} value={pr.user_id}>{pr.full_name || pr.user_id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Backup Person</Label>
                    <Select value={form.backup_user_id} onValueChange={(v) => setForm({ ...form, backup_user_id: v === "__none__" ? "" : v })}>
                      <SelectTrigger className="h-9 mt-1 rounded-[4px]"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {profilesList.map((pr) => (
                          <SelectItem key={pr.user_id} value={pr.user_id}>{pr.full_name || pr.user_id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Rotation Days</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-9 mt-1 rounded-[4px]"
                      value={form.rotation_days}
                      onChange={e => setForm({ ...form, rotation_days: parseInt(e.target.value) || 90 })}
                    />
                  </div>
                  <Button
                    className="w-full rounded-[4px]"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !form.system_name || !form.username || !form.expiry_date}
                  >
                    {saveMutation.isPending ? "Saving..." : editId ? "Update Entry" : "Add Entry"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
        </div>
      </div>

      <Tabs defaultValue="expired">
        <TabsList className="mb-4">
          <TabsTrigger value="expired">
            Expired <Badge className="ml-1.5 h-5 min-w-5 rounded-full text-[10px]">{expired.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="week">
            Due This Week <Badge className="ml-1.5 h-5 min-w-5 rounded-full text-[10px]">{dueThisWeek.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="month">
            Due This Month <Badge className="ml-1.5 h-5 min-w-5 rounded-full text-[10px]">{dueThisMonth.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="healthy">
            Healthy <Badge className="ml-1.5 h-5 min-w-5 rounded-full text-[10px]">{healthy.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expired">{renderTable(expired)}</TabsContent>
        <TabsContent value="week">{renderTable(dueThisWeek)}</TabsContent>
        <TabsContent value="month">{renderTable(dueThisMonth)}</TabsContent>
        <TabsContent value="healthy">{renderTable(healthy)}</TabsContent>
      </Tabs>

      {/* Mark Renewed Dialog */}
      <Dialog open={renewDialog.open} onOpenChange={(o) => setRenewDialog((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Renewed — {renewDialog.password?.system_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Current expiry: <span className="font-mono-data font-medium text-foreground">{renewDialog.password?.expiry_date}</span>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">New Expiry Date</Label>
              <Input
                type="date"
                className="h-9 mt-1 rounded-[4px]"
                value={renewNewExpiry}
                onChange={e => setRenewNewExpiry(e.target.value)}
              />
            </div>
            <Button
              className="w-full rounded-[4px]"
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending || !renewNewExpiry}
            >
              {renewMutation.isPending ? "Saving..." : "Confirm Renewal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renewal History Sheet */}
      <Sheet open={historySheet.open} onOpenChange={(o) => setHistorySheet((s) => ({ ...s, open: o }))}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Renewal History — {historySheet.systemName}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-0">
            {renewalHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No renewals recorded yet.</p>
            ) : (
              renewalHistory.map((r: any) => (
                <div key={r.id} className="border-b border-border py-3">
                  <p className="text-sm font-medium">
                    {r.previous_expiry || "—"} → {r.new_expiry}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renewed by: {r.profiles?.full_name || "Unknown"} &middot;{" "}
                    {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
