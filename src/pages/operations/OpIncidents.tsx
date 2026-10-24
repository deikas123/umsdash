import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Pencil, Siren, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";

const departments = ["Sales", "Procurement/Warehouse", "Finance", "Customer Service & IT", "HR/Admin", "Other"];
const incidentTypes = [
  "Workplace Safety", "Logistics Loss", "Theft / Suspected Theft",
  "Property Damage", "Customer Complaint", "System Outage / Downtime",
  "Data Breach", "Fraud / Cash Loss", "Vendor/Supplier Issue", "Other",
];
const locations = ["Office", "Warehouse", "Customer Site", "In Transit", "Other"];
const severityLevels = ["Level 1 – Minor", "Level 2 – Moderate", "Level 3 – Major", "Level 4 – Critical"];
const urgencyLevels = ["Low", "Medium", "High", "Immediate"];

const sevColor: Record<string, string> = {
  "Level 1": "bg-indigo-50 text-primary",
  "Level 2": "bg-warning/10 text-warning",
  "Level 3": "bg-destructive/10 text-destructive",
  "Level 4": "bg-destructive text-destructive-foreground",
};
const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-accent/10 text-accent",
  closed: "bg-muted text-muted-foreground",
};

const emptyForm = {
  department: "", incident_type: "", date_of_incident: "", time_of_incident: "",
  date_reported: "", location: "", reported_by: "", witnesses: "", persons_involved: "",
  description: "", item_description: "", item_quantity: 0, serial_numbers: "",
  estimated_value: 0, severity: "", urgency: "",
  problem_statement: "", why_1: "", why_2: "", why_3: "", why_4: "", why_5: "",
  capa_action: "", capa_owner: "", capa_deadline: "", capa_status: "open",
};

type Incident = typeof emptyForm & { id?: string; incident_number?: string; status?: string };

export default function OpIncidents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [sevFilter, setSevFilter] = useState(searchParams.get("severity") || "");
  const [deptFilter, setDeptFilter] = useState(searchParams.get("department") || "");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [escalateIncDialog, setEscalateIncDialog] = useState<{ open: boolean; sourceId: string; defaultTitle: string }>({ open: false, sourceId: "", defaultTitle: "" });
  const [escalateIncTitle, setEscalateIncTitle] = useState("");
  const [escalateIncNote, setEscalateIncNote] = useState("");

  const [createTaskDialog, setCreateTaskDialog] = useState<{ open: boolean; incident: any | null }>({ open: false, incident: null });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload = {
        incident_number: "TEMP",
        user_id: user!.id,
        department: form.department || null,
        incident_type: form.incident_type || null,
        date_of_incident: form.date_of_incident || null,
        time_of_incident: form.time_of_incident || null,
        date_reported: form.date_reported || null,
        location: form.location || null,
        reported_by: form.reported_by || null,
        witnesses: form.witnesses || null,
        persons_involved: form.persons_involved || null,
        description: form.description || null,
        item_description: form.item_description || null,
        item_quantity: form.item_quantity || null,
        serial_numbers: form.serial_numbers || null,
        estimated_value: form.estimated_value || null,
        severity: form.severity || null,
        urgency: form.urgency || null,
        problem_statement: form.problem_statement || null,
        why_1: form.why_1 || null, why_2: form.why_2 || null,
        why_3: form.why_3 || null, why_4: form.why_4 || null, why_5: form.why_5 || null,
        capa_action: form.capa_action || null,
        capa_owner: form.capa_owner || null,
        capa_deadline: form.capa_deadline || null,
        capa_status: form.capa_status,
        status,
      };
      if (editId) {
        const { error } = await supabase.from("incidents").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("incidents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      if (!editId && status === "open") {
        supabase.functions.invoke("notify-sms", {
          body: {
            type: "new_incident",
            data: {
              incident_type: form.incident_type,
              severity: form.severity,
              department: form.department,
              reported_by: form.reported_by,
            },
          },
        }).catch((e) => console.error("SMS notification failed:", e));
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? "Incident updated." : "Incident report submitted.");
    },
    onError: (e) => toast.error(e.message),
  });

  const previewIncident = incidents.find((i) => i.id === previewId);

  const escalateIncMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("escalations", {
        body: {
          action: "create",
          source_table: "incidents",
          source_id: escalateIncDialog.sourceId,
          title: escalateIncTitle,
          note: escalateIncNote || undefined,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escalation created.");
      setEscalateIncDialog({ open: false, sourceId: "", defaultTitle: "" });
      setEscalateIncTitle("");
      setEscalateIncNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const inc = createTaskDialog.incident;
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        description: `Linked to incident ${inc.incident_number}: ${inc.description || ""}`,
        priority: taskPriority,
        status: "pending",
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created and linked to incident.");
      setCreateTaskDialog({ open: false, incident: null });
      setTaskTitle("");
      setTaskPriority("normal");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (inc: any) => {
    setForm({
      department: inc.department || "", incident_type: inc.incident_type || "",
      date_of_incident: inc.date_of_incident || "", time_of_incident: inc.time_of_incident || "",
      date_reported: inc.date_reported || "", location: inc.location || "", reported_by: inc.reported_by || "",
      witnesses: inc.witnesses || "", persons_involved: inc.persons_involved || "",
      description: inc.description || "", item_description: inc.item_description || "",
      item_quantity: inc.item_quantity || 0, serial_numbers: inc.serial_numbers || "",
      estimated_value: inc.estimated_value || 0, severity: inc.severity || "", urgency: inc.urgency || "",
      problem_statement: inc.problem_statement || "",
      why_1: inc.why_1 || "", why_2: inc.why_2 || "", why_3: inc.why_3 || "",
      why_4: inc.why_4 || "", why_5: inc.why_5 || "",
      capa_action: inc.capa_action || "", capa_owner: inc.capa_owner || "",
      capa_deadline: inc.capa_deadline || "", capa_status: inc.capa_status || "open",
    });
    setEditId(inc.id);
    setShowForm(true);
  };

  const incHeaders = ["ID", "Type", "Department", "Severity", "Status", "Date", "Description"];
  const incToRow = (i: any) => [i.incident_number, i.incident_type || "", i.department || "", i.severity || "", i.status, i.date_of_incident || "", (i.description || "").substring(0, 100)];

  const filtered = incidents.filter((i) => {
    const matchSearch = i.incident_number.toLowerCase().includes(search.toLowerCase()) || (i.incident_type || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || i.status === statusFilter;
    const matchSev = !sevFilter || (i.severity || "").startsWith(sevFilter);
    const matchDept = !deptFilter || i.department === deptFilter;
    return matchSearch && matchStatus && matchSev && matchDept;
  });

  // ---- FORM VIEW ----
  if (showForm) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={editId ? "Edit Incident Report" : "New Incident Report"}
          description="Form UMS-INC-01 — Complete all required sections."
          actions={<Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancel</Button>}
        />
        <div className="space-y-8">
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">General Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold text-muted-foreground">Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Incident Type</Label>
                <Select value={form.incident_type} onValueChange={(v) => setForm({...form, incident_type: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{incidentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Date of Incident</Label><Input type="date" className="h-9 mt-1.5 rounded-[4px]" value={form.date_of_incident} onChange={e => setForm({...form, date_of_incident: e.target.value})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Time of Incident</Label><Input type="time" className="h-9 mt-1.5 rounded-[4px]" value={form.time_of_incident} onChange={e => setForm({...form, time_of_incident: e.target.value})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Date Reported</Label><Input type="date" className="h-9 mt-1.5 rounded-[4px]" value={form.date_reported} onChange={e => setForm({...form, date_reported: e.target.value})} /><p className="text-[10px] text-muted-foreground mt-1">Leave blank to use today's date</p></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Location</Label>
                <Select value={form.location} onValueChange={(v) => setForm({...form, location: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Reported By</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.reported_by} onChange={e => setForm({...form, reported_by: e.target.value})} placeholder="Name & Title" /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Witnesses</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.witnesses} onChange={e => setForm({...form, witnesses: e.target.value})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Persons Involved</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.persons_involved} onChange={e => setForm({...form, persons_involved: e.target.value})} /></div>
            </div>
          </section>
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">Incident Description</h2>
            <Textarea className="rounded-[4px] min-h-[120px]" placeholder="Write facts only..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </section>
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">Items / Assets Affected</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold text-muted-foreground">Item Description</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.item_description} onChange={e => setForm({...form, item_description: e.target.value})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Quantity</Label><Input type="number" className="h-9 mt-1.5 rounded-[4px]" value={form.item_quantity || ""} onChange={e => setForm({...form, item_quantity: parseInt(e.target.value) || 0})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Serial Numbers</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.serial_numbers} onChange={e => setForm({...form, serial_numbers: e.target.value})} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Estimated Value (KES)</Label><Input type="number" className="h-9 mt-1.5 rounded-[4px]" value={form.estimated_value || ""} onChange={e => setForm({...form, estimated_value: parseFloat(e.target.value) || 0})} /></div>
            </div>
          </section>
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold text-muted-foreground">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{severityLevels.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Urgency</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm({...form, urgency: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{urgencyLevels.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </section>
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">Root Cause Analysis — 5 Whys</h2>
            <div><Label className="text-xs font-semibold text-muted-foreground">Problem Statement</Label><Textarea className="mt-1.5 rounded-[4px] min-h-[80px]" value={form.problem_statement} onChange={e => setForm({...form, problem_statement: e.target.value})} /></div>
            <div className="mt-4 space-y-3">
              {([["why_1","1"],["why_2","2"],["why_3","3"],["why_4","4"],["why_5","5"]] as const).map(([key, n]) => (
                <div key={key}><Label className="text-xs font-semibold text-muted-foreground">{n}. Why{n === "5" ? " (Root Cause)" : ""}?</Label>
                  <Input className="h-9 mt-1.5 rounded-[4px]" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div>
              ))}
            </div>
          </section>
          <section className="card-shadow rounded-lg bg-card p-6">
            <h2 className="label-caps mb-4">CAPA</h2>
            <div className="space-y-4">
              <div><Label className="text-xs font-semibold text-muted-foreground">Corrective Action</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.capa_action} onChange={e => setForm({...form, capa_action: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs font-semibold text-muted-foreground">Owner</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={form.capa_owner} onChange={e => setForm({...form, capa_owner: e.target.value})} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground">Deadline</Label><Input type="date" className="h-9 mt-1.5 rounded-[4px]" value={form.capa_deadline} onChange={e => setForm({...form, capa_deadline: e.target.value})} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <Select value={form.capa_status} onValueChange={(v) => setForm({...form, capa_status: v})}><SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select></div>
              </div>
            </div>
          </section>
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => createMutation.mutate("draft")} disabled={createMutation.isPending}>Save as Draft</Button>
            <Button size="sm" className="rounded-[4px]" onClick={() => createMutation.mutate("open")} disabled={createMutation.isPending}>{editId ? "Update Report" : "Submit Incident Report"}</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- PREVIEW DIALOG ----
  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? <div className="py-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}:</span> <span className="text-sm">{value}</span></div> : null;

  // ---- LIST VIEW ----
  return (
    <div>
      <PageHeader
        title="Incidents"
        description="UMS Incident Reports (Form UMS-INC-01) with RCA and CAPA tracking."
        actions={
          <>
            <ExportMenu
              onCSV={() => exportToCSV(incHeaders, filtered.map(incToRow), `incidents-${format(new Date(), "yyyy-MM-dd")}.csv`)}
              onPDF={() => exportToPDF("Incidents", incHeaders, filtered.map(incToRow))}
              onExcel={() => exportToExcel("Incidents", incHeaders, filtered.map(incToRow))}
            />
            <Button size="sm" className="gap-1.5 rounded-[4px]" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="h-3.5 w-3.5" /> New Incident</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
        </div>
        {(statusFilter || sevFilter || deptFilter) && (
          <div className="flex items-center gap-2">
            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("")} className="ml-1 hover:text-destructive">×</button>
              </span>
            )}
            {sevFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-foreground">
                Severity: {sevFilter}
                <button onClick={() => setSevFilter("")} className="ml-1 hover:text-destructive">×</button>
              </span>
            )}
            {deptFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-foreground">
                Dept: {deptFilter}
                <button onClick={() => setDeptFilter("")} className="ml-1 hover:text-destructive">×</button>
              </span>
            )}
            <button onClick={() => { setStatusFilter(""); setSevFilter(""); setDeptFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>
      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 label-caps">ID</th>
              <th className="px-5 py-3 label-caps">Type</th>
              <th className="px-5 py-3 label-caps">Department</th>
              <th className="px-5 py-3 label-caps">Severity</th>
              <th className="px-5 py-3 label-caps">Status</th>
              <th className="px-5 py-3 label-caps">Date</th>
              <th className="px-5 py-3 label-caps">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc) => {
              const sevKey = (inc.severity || "").split(" –")[0];
              return (
                <tr key={inc.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                  <td className="px-5 py-3 font-mono-data">{inc.incident_number}</td>
                  <td className="px-5 py-3">{inc.incident_type || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{inc.department || "—"}</td>
                  <td className="px-5 py-3"><span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${sevColor[sevKey] || "bg-muted text-muted-foreground"}`}>{inc.severity || "—"}</span></td>
                  <td className="px-5 py-3"><span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${statusColor[inc.status] || ""}`}>{inc.status}</span></td>
                  <td className="px-5 py-3 font-mono-data text-muted-foreground">{inc.date_of_incident || inc.created_at?.split("T")[0]}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" onClick={() => setPreviewId(inc.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" onClick={() => handleEdit(inc)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px] text-accent" title="Create Task" onClick={() => { setCreateTaskDialog({ open: true, incident: inc }); setTaskTitle(inc.incident_number ? `${inc.incident_number}: ${inc.incident_type || "Incident"}` : (inc.incident_type || "Incident")); setTaskPriority("normal"); }}><ClipboardList className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px] text-warning" title="Escalate" onClick={() => { setEscalateIncDialog({ open: true, sourceId: inc.id, defaultTitle: `Incident ${inc.incident_number}: ${inc.incident_type || ""}` }); setEscalateIncTitle(`Incident ${inc.incident_number}: ${inc.incident_type || ""}`); setEscalateIncNote(""); }}><Siren className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {isLoading && <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No incidents recorded yet.</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Incident Report — {previewIncident?.incident_number}</DialogTitle></DialogHeader>
          {previewIncident && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Department" value={previewIncident.department} />
                <DetailRow label="Type" value={previewIncident.incident_type} />
                <DetailRow label="Date" value={previewIncident.date_of_incident} />
                <DetailRow label="Time" value={previewIncident.time_of_incident} />
                <DetailRow label="Location" value={previewIncident.location} />
                <DetailRow label="Reported By" value={previewIncident.reported_by} />
                <DetailRow label="Severity" value={previewIncident.severity} />
                <DetailRow label="Urgency" value={previewIncident.urgency} />
                <DetailRow label="Witnesses" value={previewIncident.witnesses} />
                <DetailRow label="Persons Involved" value={previewIncident.persons_involved} />
              </div>
              <DetailRow label="Description" value={previewIncident.description} />
              <DetailRow label="Item Description" value={previewIncident.item_description} />
              <DetailRow label="Estimated Value" value={previewIncident.estimated_value ? `KES ${previewIncident.estimated_value}` : null} />
              <div className="border-t pt-3 mt-3">
                <p className="label-caps mb-2">Root Cause Analysis</p>
                <DetailRow label="Problem Statement" value={previewIncident.problem_statement} />
                <DetailRow label="Why 1" value={previewIncident.why_1} />
                <DetailRow label="Why 2" value={previewIncident.why_2} />
                <DetailRow label="Why 3" value={previewIncident.why_3} />
                <DetailRow label="Why 4" value={previewIncident.why_4} />
                <DetailRow label="Why 5 (Root Cause)" value={previewIncident.why_5} />
              </div>
              <div className="border-t pt-3">
                <p className="label-caps mb-2">CAPA</p>
                <DetailRow label="Action" value={previewIncident.capa_action} />
                <DetailRow label="Owner" value={previewIncident.capa_owner} />
                <DetailRow label="Deadline" value={previewIncident.capa_deadline} />
                <DetailRow label="Status" value={previewIncident.capa_status} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setPreviewId(null); handleEdit(previewIncident); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialog.open} onOpenChange={(o) => { if (!o) { setCreateTaskDialog({ open: false, incident: null }); setTaskTitle(""); setTaskPriority("normal"); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task from Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold text-muted-foreground">Task Title</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title..." /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
              <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as "low" | "normal" | "high")}>
                <SelectTrigger className="h-9 mt-1.5 rounded-[4px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setCreateTaskDialog({ open: false, incident: null }); setTaskTitle(""); setTaskPriority("normal"); }}>Cancel</Button>
              <Button size="sm" className="rounded-[4px]" onClick={() => createTaskMutation.mutate()} disabled={createTaskMutation.isPending || !taskTitle.trim()}>Create Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Escalate Incident Dialog */}
      <Dialog open={escalateIncDialog.open} onOpenChange={(o) => { if (!o) { setEscalateIncDialog({ open: false, sourceId: "", defaultTitle: "" }); setEscalateIncTitle(""); setEscalateIncNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalate Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold text-muted-foreground">Title</Label><Input className="h-9 mt-1.5 rounded-[4px]" value={escalateIncTitle} onChange={(e) => setEscalateIncTitle(e.target.value)} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground">Note (optional)</Label><Textarea className="mt-1.5 rounded-[4px] min-h-[80px]" placeholder="Optional note..." value={escalateIncNote} onChange={(e) => setEscalateIncNote(e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="rounded-[4px]" onClick={() => { setEscalateIncDialog({ open: false, sourceId: "", defaultTitle: "" }); setEscalateIncTitle(""); setEscalateIncNote(""); }}>Cancel</Button>
              <Button size="sm" className="rounded-[4px]" onClick={() => escalateIncMutation.mutate()} disabled={escalateIncMutation.isPending || !escalateIncTitle}>Escalate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
