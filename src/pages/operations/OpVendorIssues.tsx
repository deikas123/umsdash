import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, AlertTriangle, Eye, Pencil, Siren } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";
import VendorPicker from "@/components/operations/VendorPicker";
import { normalizeName } from "@/lib/mask";

const impactColor: Record<string, string> = {
  Minor: "bg-indigo-50 text-primary",
  Moderate: "bg-warning/10 text-warning",
  Major: "bg-destructive/10 text-destructive",
  Critical: "bg-destructive text-destructive-foreground",
};

const statusColor: Record<string, string> = {
  Open: "bg-primary/10 text-primary",
  "In Progress": "bg-warning/10 text-warning",
  Resolved: "bg-accent/10 text-accent",
  Closed: "bg-muted text-muted-foreground",
};

const emptyForm = { vendor: "", system_name: "", issue: "", impact: "Minor", downtime_hours: "", total_hours: "24", status: "Open", uptime_start: "", uptime_end: "", date_reported: "" };

function parseDowntimeToHours(val: string): number {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.max(0, num);
}

function calcPeriodHours(start: string, end: string): string {
  if (!start || !end) return "24";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "24";
  return String(Math.round(ms / (1000 * 60 * 60)));
}

function calcUptimePct(downtimeHours: string, totalHours: string): number | null {
  const dh = parseDowntimeToHours(downtimeHours);
  const th = parseFloat(totalHours);
  if (!th || th <= 0 || !downtimeHours) return null;
  return Math.max(0, Math.min(100, ((th - dh) / th) * 100));
}

export default function OpVendorIssues() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [escalateVIDialog, setEscalateVIDialog] = useState<{ open: boolean; sourceId: string; defaultTitle: string }>({ open: false, sourceId: "", defaultTitle: "" });
  const [escalateVITitle, setEscalateVITitle] = useState("");
  const [escalateVINote, setEscalateVINote] = useState("");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendor_issues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_issues").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const uptimePct = calcUptimePct(form.downtime_hours, form.total_hours);
      const downtimeLabel = form.downtime_hours ? `${form.downtime_hours}h` : null;
      const basePayload = {
        vendor: normalizeName(form.vendor),
        system_name: form.system_name ? normalizeName(form.system_name) : null,
        issue: form.issue, impact: form.impact, downtime: downtimeLabel, status: form.status,
        uptime_percentage: uptimePct,
        uptime_start: form.uptime_start || null, uptime_end: form.uptime_end || null,
        date_reported: form.date_reported || null,
      };
      if (editId) {
        const { error } = await supabase.from("vendor_issues").update(basePayload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendor_issues").insert({ ...basePayload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_issues"] });
      const shouldNotify = editId
        ? form.status !== vendors.find((v) => v.id === editId)?.status
        : true;
      if (shouldNotify) {
        supabase.functions.invoke("notify-sms", {
          body: {
            type: "vendor_status_change",
            data: {
              vendor: form.vendor,
              system_name: form.system_name,
              new_status: form.status,
              issue: form.issue,
              id: editId || "",
            },
          },
        }).catch((e) => console.error("SMS notification failed:", e));
      }
      setOpen(false); setEditId(null); setForm(emptyForm);
      toast.success(editId ? "Issue updated." : "Vendor issue created.");
    },
    onError: (e) => toast.error(e.message),
  });

  const escalateVIMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("escalations", {
        body: {
          action: "create",
          source_table: "vendor_issues",
          source_id: escalateVIDialog.sourceId,
          title: escalateVITitle,
          note: escalateVINote || undefined,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escalation created.");
      setEscalateVIDialog({ open: false, sourceId: "", defaultTitle: "" });
      setEscalateVITitle("");
      setEscalateVINote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (v: any) => {
    const existingHours = v.downtime ? v.downtime.replace(/h.*/, "") : "";
    setForm({ vendor: v.vendor, system_name: v.system_name || "", issue: v.issue, impact: v.impact, downtime_hours: existingHours, total_hours: "24", status: v.status, uptime_start: v.uptime_start || "", uptime_end: v.uptime_end || "", date_reported: v.date_reported || "" });
    setEditId(v.id); setOpen(true);
  };

  const headers = ["Vendor", "System", "Issue", "Impact", "Downtime", "Uptime %", "Status", "Date"];
  const toRow = (v: any) => [v.vendor, v.system_name || "", v.issue.replace(/,/g, ";"), v.impact, v.downtime || "", v.uptime_percentage != null ? Number(v.uptime_percentage).toFixed(2) : "", v.status, v.date_reported || ""];

  const previewItem = vendors.find((v) => v.id === previewId);
  const filtered = vendors.filter((v) => {
    const matchSearch = v.vendor.toLowerCase().includes(search.toLowerCase()) || (v.system_name || "").toLowerCase().includes(search.toLowerCase());
    const matchImpact = filterImpact === "all" || v.impact === filterImpact;
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchImpact && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Vendor Issues"
        description="RCA tracking and vendor accountability management."
        actions={
          <>
            <ExportMenu
              onCSV={() => exportToCSV(headers, filtered.map(toRow), `vendor-issues-${format(new Date(), "yyyy-MM-dd")}.csv`)}
              onPDF={() => exportToPDF("Vendor Issues", headers, filtered.map(toRow))}
              onExcel={() => exportToExcel("Vendor Issues", headers, filtered.map(toRow))}
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-[4px]"><Plus className="h-3.5 w-3.5" /> New Issue</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Edit Vendor Issue" : "New Vendor Issue"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground">Vendor</Label><div className="mt-1"><VendorPicker value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} vendors={vendors.map((v: any) => v.vendor).filter(Boolean)} /></div></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground">System</Label><Input className="h-9 mt-1 rounded-[4px]" value={form.system_name} onChange={(e) => setForm({ ...form, system_name: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground">Issue Description</Label><Input className="h-9 mt-1 rounded-[4px]" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} required /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground">Impact</Label>
                    <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v })}>
                      <SelectTrigger className="h-9 mt-1 rounded-[4px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Minor">Minor</SelectItem><SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Major">Major</SelectItem><SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-9 mt-1 rounded-[4px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem><SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-t pt-3 mt-1"><p className="text-xs font-semibold text-muted-foreground mb-2">Uptime Period</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold text-muted-foreground">Period Start</Label><Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.uptime_start} onChange={(e) => {
                      const newStart = e.target.value;
                      const autoTotal = calcPeriodHours(newStart, form.uptime_end);
                      setForm({ ...form, uptime_start: newStart, total_hours: autoTotal });
                    }} /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Period End</Label><Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.uptime_end} onChange={(e) => {
                      const newEnd = e.target.value;
                      const autoTotal = calcPeriodHours(form.uptime_start, newEnd);
                      setForm({ ...form, uptime_end: newEnd, total_hours: autoTotal });
                    }} /></div>
                  </div>
                  {form.uptime_start && form.uptime_end && (
                    <p className="text-xs text-muted-foreground">Total period: <span className="font-semibold font-mono-data">{form.total_hours}h</span> (auto-calculated from dates)</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold text-muted-foreground">Downtime (hours)</Label><Input type="number" step="0.5" min="0" className="h-9 mt-1 rounded-[4px]" placeholder="e.g. 8" value={form.downtime_hours} onChange={(e) => setForm({ ...form, downtime_hours: e.target.value })} /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Total Period (hours)</Label><Input type="number" step="1" min="1" className="h-9 mt-1 rounded-[4px]" value={form.total_hours} onChange={(e) => setForm({ ...form, total_hours: e.target.value })} /><p className="text-[10px] text-muted-foreground mt-1">Override if needed</p></div>
                  </div>
                  {calcUptimePct(form.downtime_hours, form.total_hours) !== null && (
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Calculated Uptime</p>
                      <p className={`text-2xl font-semibold tabular-nums ${(calcUptimePct(form.downtime_hours, form.total_hours) ?? 0) >= 99.5 ? "text-accent" : (calcUptimePct(form.downtime_hours, form.total_hours) ?? 0) >= 98 ? "text-warning" : "text-destructive"}`}>
                        {calcUptimePct(form.downtime_hours, form.total_hours)?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <div><Label className="text-xs font-semibold text-muted-foreground">Date Reported</Label><Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.date_reported} onChange={(e) => setForm({ ...form, date_reported: e.target.value })} /><p className="text-[10px] text-muted-foreground mt-1">Leave blank for today</p></div>
                  <Button className="w-full rounded-[4px]" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.vendor || !form.issue}>
                    {saveMutation.isPending ? "Saving..." : editId ? "Update Issue" : "Create Issue"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search vendors or systems..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
        </div>
        <Select value={filterImpact} onValueChange={setFilterImpact}>
          <SelectTrigger className="h-9 w-40 rounded-[4px]"><SelectValue placeholder="Impact Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Impacts</SelectItem><SelectItem value="Minor">Minor</SelectItem>
            <SelectItem value="Moderate">Moderate</SelectItem><SelectItem value="Major">Major</SelectItem><SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 rounded-[4px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Resolved</SelectItem><SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 label-caps">Vendor</th>
              <th className="px-3 py-3 label-caps">System</th>
              <th className="px-3 py-3 label-caps">Issue</th>
              <th className="px-3 py-3 label-caps">Impact</th>
              <th className="px-3 py-3 label-caps">Downtime</th>
              <th className="px-3 py-3 label-caps">Uptime</th>
              <th className="px-3 py-3 label-caps">Status</th>
              <th className="px-3 py-3 label-caps">Date</th>
              <th className="px-3 py-3 label-caps">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-3 py-3 font-medium">{v.vendor}</td>
                <td className="px-3 py-3 font-mono-data text-muted-foreground">{v.system_name}</td>
                <td className="px-3 py-3 max-w-[200px]"><span className="block truncate">{v.issue}</span></td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${impactColor[v.impact] || ""}`}>{v.impact}</span></td>
                <td className="px-3 py-3 font-mono-data tabular-nums text-destructive">{v.downtime || "—"}</td>
                <td className="px-3 py-3 font-mono-data tabular-nums">{(v as any).uptime_percentage != null ? <span className={(v as any).uptime_percentage >= 99.5 ? "text-accent" : (v as any).uptime_percentage >= 98 ? "text-warning" : "text-destructive"}>{Number((v as any).uptime_percentage).toFixed(2)}%</span> : "—"}</td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${statusColor[v.status] || ""}`}>{v.status}</span></td>
                <td className="px-3 py-3 font-mono-data text-muted-foreground">{v.date_reported}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" onClick={() => setPreviewId(v.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" onClick={() => handleEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px] text-warning" title="Escalate" onClick={() => { setEscalateVIDialog({ open: true, sourceId: v.id, defaultTitle: `Vendor Issue: ${v.vendor} — ${v.system_name || ""}` }); setEscalateVITitle(`Vendor Issue: ${v.vendor} — ${v.system_name || ""}`); setEscalateVINote(""); }}><Siren className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-sm">No vendor issues reported for this period.</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vendor Issue Details</DialogTitle></DialogHeader>
          {previewItem && (
            <div className="space-y-3 text-sm">
              <div><span className="text-xs font-semibold text-muted-foreground">Vendor:</span> <span className="font-medium">{previewItem.vendor}</span></div>
              <div><span className="text-xs font-semibold text-muted-foreground">System:</span> {previewItem.system_name || "—"}</div>
              <div><span className="text-xs font-semibold text-muted-foreground">Issue:</span> {previewItem.issue}</div>
              <div><span className="text-xs font-semibold text-muted-foreground">Impact:</span> <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${impactColor[previewItem.impact] || ""}`}>{previewItem.impact}</span></div>
              <div><span className="text-xs font-semibold text-muted-foreground">Downtime:</span> {previewItem.downtime || "—"}</div>
              <div><span className="text-xs font-semibold text-muted-foreground">Uptime:</span> {(previewItem as any).uptime_percentage != null ? `${Number((previewItem as any).uptime_percentage).toFixed(2)}%` : "—"}{(previewItem as any).uptime_start ? ` (${(previewItem as any).uptime_start} → ${(previewItem as any).uptime_end || "ongoing"})` : ""}</div>
              <div><span className="text-xs font-semibold text-muted-foreground">Status:</span> <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${statusColor[previewItem.status] || ""}`}>{previewItem.status}</span></div>
              <div><span className="text-xs font-semibold text-muted-foreground">RCA Status:</span> {previewItem.rca_status}</div>
              <div><span className="text-xs font-semibold text-muted-foreground">Date Reported:</span> {previewItem.date_reported}</div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setPreviewId(null); handleEdit(previewItem); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Escalate Vendor Issue Dialog */}
      <Dialog open={escalateVIDialog.open} onOpenChange={(o) => { if (!o) { setEscalateVIDialog({ open: false, sourceId: "", defaultTitle: "" }); setEscalateVITitle(""); setEscalateVINote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalate Vendor Issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold text-muted-foreground">Title</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={escalateVITitle} onChange={(e) => setEscalateVITitle(e.target.value)} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground">Note (optional)</Label><Textarea className="mt-1.5 rounded-[4px] min-h-[80px]" placeholder="Optional note..." value={escalateVINote} onChange={(e) => setEscalateVINote(e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setEscalateVIDialog({ open: false, sourceId: "", defaultTitle: "" }); setEscalateVITitle(""); setEscalateVINote(""); }}>Cancel</Button>
              <Button size="sm" className="rounded-[4px]" onClick={() => escalateVIMutation.mutate()} disabled={escalateVIMutation.isPending || !escalateVITitle}>Escalate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
