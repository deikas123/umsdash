import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, AlertCircle, CheckCircle2, Activity, Search, CalendarIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";
import VendorPicker from "@/components/operations/VendorPicker";
import { normalizeName } from "@/lib/mask";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import { SLACalculator } from "@/components/operations/SLACalculator";

const SLA_TARGET = 99.5;

type DatePreset = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "custom" | "all";

function getPresetRange(preset: DatePreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  switch (preset) {
    case "this_month": return { from: startOfMonth(now), to: now };
    case "last_month": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case "last_3_months": return { from: startOfMonth(subMonths(now, 2)), to: now };
    case "last_6_months": return { from: startOfMonth(subMonths(now, 5)), to: now };
    case "all": return { from: undefined, to: undefined };
    case "custom": return { from: undefined, to: undefined };
  }
}

export default function OpVendorUptime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [slaTarget, setSlaTarget] = useState(SLA_TARGET);
  const [open, setOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ vendor: "", system_name: "", downtime_hours: "", total_hours: "24", uptime_start: "", uptime_end: "" });

  const [slaDismissed, setSlaDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('umshub_sla_breach_dismissed') === 'true'; } catch { return false; }
  });

  const handleDismissSla = () => {
    setSlaDismissed(true);
    try { localStorage.setItem('umshub_sla_breach_dismissed', 'true'); } catch (_e) { /* storage unavailable */ }
  };

  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const activeRange = datePreset === "custom"
    ? { from: customFrom, to: customTo }
    : getPresetRange(datePreset);

  const { data: vendorIssues = [], isLoading } = useQuery({
    queryKey: ["vendor_issues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_issues").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filter records by date range
  const dateFilteredIssues = useMemo(() => {
    if (!activeRange.from && !activeRange.to) return vendorIssues;
    return vendorIssues.filter((v: any) => {
      const dateStr = v.uptime_start || v.date_reported || v.created_at?.split("T")[0];
      if (!dateStr) return false;
      const d = parseISO(dateStr);
      const from = activeRange.from ? startOfDay(activeRange.from) : new Date(0);
      const to = activeRange.to ? endOfDay(activeRange.to) : new Date(9999, 11, 31);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [vendorIssues, activeRange.from, activeRange.to]);

  // Auto-calculate uptime % from downtime hours
  const calculatedUptime = form.downtime_hours && form.total_hours
    ? Math.max(0, Math.min(100, ((parseFloat(form.total_hours) - parseFloat(form.downtime_hours)) / parseFloat(form.total_hours)) * 100)).toFixed(2)
    : "";

  const createMutation = useMutation({
    mutationFn: async () => {
      const uptimePct = calculatedUptime ? parseFloat(calculatedUptime) : null;
      if (uptimePct === null) throw new Error("Please enter downtime hours");
      const { error } = await supabase.from("vendor_issues").insert({
        vendor: normalizeName(form.vendor),
        system_name: form.system_name ? normalizeName(form.system_name) : null,
        issue: `Uptime record: ${uptimePct}% (${form.downtime_hours}h downtime / ${form.total_hours}h total)`,
        impact: "Minor",
        status: "Closed",
        downtime: `${form.downtime_hours}h`,
        uptime_percentage: uptimePct,
        uptime_start: form.uptime_start || null,
        uptime_end: form.uptime_end || null,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_issues"] });
      setOpen(false);
      setForm({ vendor: "", system_name: "", downtime_hours: "", total_hours: "24", uptime_start: "", uptime_end: "" });
      toast.success("Uptime record added.");
    },
    onError: (e) => toast.error(e.message),
  });

  const uniqueVendors = Array.from(new Set(vendorIssues.map((v: any) => v.vendor)));

  // Aggregate per-vendor uptime (date-filtered)
  const vendorMap: Record<string, { uptimes: { value: number; start: string | null; end: string | null }[]; systems: Set<string> }> = {};
  dateFilteredIssues.forEach((v: any) => {
    if (v.uptime_percentage == null) return;
    if (!vendorMap[v.vendor]) vendorMap[v.vendor] = { uptimes: [], systems: new Set() };
    vendorMap[v.vendor].uptimes.push({ value: v.uptime_percentage, start: v.uptime_start, end: v.uptime_end });
    if (v.system_name) vendorMap[v.vendor].systems.add(v.system_name);
  });

  const vendorSummary = Object.entries(vendorMap).map(([vendor, d]) => {
    const avg = d.uptimes.reduce((a, b) => a + b.value, 0) / d.uptimes.length;
    const latest = d.uptimes[0]?.value ?? 0;
    const min = Math.min(...d.uptimes.map((u) => u.value));
    return {
      vendor,
      avgUptime: parseFloat(avg.toFixed(2)),
      latestUptime: parseFloat(Number(latest).toFixed(2)),
      minUptime: parseFloat(Number(min).toFixed(2)),
      records: d.uptimes.length, systems: Array.from(d.systems).join(", "), belowSla: avg < slaTarget,
    };
  }).sort((a, b) => a.avgUptime - b.avgUptime);

  const filteredSummary = vendorSummary.filter((v) => {
    const matchVendor = vendorFilter === "all" || v.vendor === vendorFilter;
    const matchSearch = v.vendor.toLowerCase().includes(search.toLowerCase()) || v.systems.toLowerCase().includes(search.toLowerCase());
    return matchVendor && matchSearch;
  });

  const totalRecords = filteredSummary.reduce((a, b) => a + b.records, 0);

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return { key: format(startOfMonth(d), "yyyy-MM"), label: format(d, "MMM") };
  });

  const trendData = months.map((m) => {
    const monthRecords = dateFilteredIssues.filter((v: any) => {
      if (v.uptime_percentage == null) return false;
      const dateStr = v.uptime_start || v.date_reported || v.created_at?.split("T")[0];
      return dateStr?.startsWith(m.key);
    });
    const values = monthRecords.map((v: any) => v.uptime_percentage as number);
    const avg = values.length > 0 ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
    return { month: m.label, uptime: avg };
  });

  const alerts = vendorSummary.filter((v) => v.belowSla);

  const headers = ["Vendor", "Systems", "Avg Uptime %", "Latest %", "Min %", "Records", "Below SLA"];
  const toRow = (v: any) => [v.vendor, v.systems, String(v.avgUptime), String(v.latestUptime), String(v.minUptime), String(v.records), v.belowSla ? "YES" : "No"];

  const getUptimeColor = (pct: number) => pct >= 99.5 ? "text-accent" : pct >= 98 ? "text-warning" : "text-destructive";

  const presetLabels: Record<DatePreset, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    last_3_months: "Last 3 Months",
    last_6_months: "Last 6 Months",
    custom: "Custom Range",
    all: "All Time",
  };

  const dateRangeLabel = datePreset === "custom" && customFrom && customTo
    ? `${format(customFrom, "dd MMM yyyy")} – ${format(customTo, "dd MMM yyyy")}`
    : datePreset === "custom"
    ? "Select dates..."
    : presetLabels[datePreset];

  return (
    <div>
      <PageHeader
        title="Vendor Uptime"
        description="SLA monitoring, historical uptime trends, and threshold alerts."
        actions={
          <>
            <ExportMenu
              onCSV={() => exportToCSV(headers, filteredSummary.map(toRow), `vendor-uptime-${format(now, "yyyy-MM-dd")}.csv`)}
              onPDF={() => exportToPDF("Vendor Uptime", headers, filteredSummary.map(toRow))}
              onExcel={() => exportToExcel("Vendor Uptime", headers, filteredSummary.map(toRow))}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-[4px]"><Plus className="h-3.5 w-3.5" /> Log Uptime</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Uptime Record</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground">Vendor</Label><div className="mt-1"><VendorPicker value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} vendors={vendorIssues.map((v: any) => v.vendor).filter(Boolean)} /></div></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground">System</Label><Input className="h-9 mt-1 rounded-[4px]" value={form.system_name} onChange={(e) => setForm({ ...form, system_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold text-muted-foreground">Period Start</Label><Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.uptime_start} onChange={(e) => {
                      const s = e.target.value;
                      const autoH = s && form.uptime_end ? String(Math.max(1, Math.round((new Date(form.uptime_end).getTime() - new Date(s).getTime()) / 3600000))) : form.total_hours;
                      setForm({ ...form, uptime_start: s, total_hours: autoH });
                    }} /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Period End</Label><Input type="date" className="h-9 mt-1 rounded-[4px]" value={form.uptime_end} onChange={(e) => {
                      const en = e.target.value;
                      const autoH = form.uptime_start && en ? String(Math.max(1, Math.round((new Date(en).getTime() - new Date(form.uptime_start).getTime()) / 3600000))) : form.total_hours;
                      setForm({ ...form, uptime_end: en, total_hours: autoH });
                    }} /></div>
                  </div>
                  {form.uptime_start && form.uptime_end && (
                    <p className="text-xs text-muted-foreground">Total period: <span className="font-semibold font-mono-data">{form.total_hours}h</span> (auto-calculated from dates)</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold text-muted-foreground">Downtime (hours)</Label><Input type="number" step="0.5" min="0" className="h-9 mt-1 rounded-[4px]" placeholder="e.g. 8" value={form.downtime_hours} onChange={(e) => setForm({ ...form, downtime_hours: e.target.value })} required /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Total Period (hours)</Label><Input type="number" step="1" min="1" className="h-9 mt-1 rounded-[4px]" value={form.total_hours} onChange={(e) => setForm({ ...form, total_hours: e.target.value })} /><p className="text-[10px] text-muted-foreground mt-1">Override if needed</p></div>
                  </div>
                  {calculatedUptime && (
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Calculated Uptime</p>
                      <p className={`text-2xl font-semibold tabular-nums ${getUptimeColor(parseFloat(calculatedUptime))}`}>{calculatedUptime}%</p>
                    </div>
                  )}
                  <Button className="w-full rounded-[4px]" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.vendor || !form.downtime_hours}>
                    {createMutation.isPending ? "Saving..." : "Log Uptime"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* SLA Breach Alert Banner */}
      {!slaDismissed && alerts.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>SLA Breach Alert</AlertTitle>
          <AlertDescription className="flex items-start justify-between gap-2">
            <span>
              {alerts.length} vendor{alerts.length > 1 ? 's are' : ' is'} in SLA breach:{' '}
              {alerts.map((v) => v.vendor).join(', ')}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 flex-shrink-0" onClick={handleDismissSla}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Date Range + SLA Target + Filters */}      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Label className="text-xs font-semibold text-muted-foreground">Period:</Label>
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="h-9 w-40 rounded-[4px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(presetLabels).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-36 justify-start text-left font-normal rounded-[4px]", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd MMM yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-36 justify-start text-left font-normal rounded-[4px]", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd MMM yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="h-6 w-px bg-border mx-1" />
        <Label className="text-xs font-semibold text-muted-foreground">SLA:</Label>
        <Input type="number" step="0.1" min="90" max="100" className="h-9 w-24 rounded-[4px] font-mono-data" value={slaTarget} onChange={(e) => setSlaTarget(parseFloat(e.target.value) || 99.5)} />
        <span className="text-xs text-muted-foreground">%</span>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
          </div>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="h-9 w-44 rounded-[4px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {uniqueVendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active range indicator */}
      {datePreset !== "all" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-2">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Showing data for: <span className="font-semibold text-foreground">{dateRangeLabel}</span>
            {" · "}<span className="font-mono-data">{totalRecords}</span> records
          </p>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs px-2" onClick={() => setDatePreset("all")}>Clear filter</Button>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div key={a.vendor} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm"><span className="font-semibold">{a.vendor}</span> is below SLA target — avg uptime <span className="font-mono-data font-semibold text-destructive">{a.avgUptime}%</span> (target: {slaTarget}%)</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Vendors Tracked</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{filteredSummary.length}</p>
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Avg Uptime</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {filteredSummary.length > 0 ? (filteredSummary.reduce((a, b) => a + b.avgUptime, 0) / filteredSummary.length).toFixed(2) : "—"}%
          </p>
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Below SLA</p>
          <p className={`mt-2 text-3xl font-semibold tabular-nums ${alerts.length > 0 ? "text-destructive" : "text-accent"}`}>{alerts.length}</p>
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Total Records</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">{totalRecords}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

        <div className="card-shadow rounded-lg bg-card p-5">
          <h3 className="label-caps mb-4">Vendor Avg Uptime vs SLA</h3>
          {filteredSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={filteredSummary} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="vendor" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis domain={[Math.min(95, Math.floor(Math.min(...filteredSummary.map((v) => v.avgUptime)) - 1)), 100]} tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} formatter={(v: number) => `${v}%`} />
                <ReferenceLine y={slaTarget} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" label={{ value: `SLA ${slaTarget}%`, position: "right", fontSize: 10, fill: "hsl(0, 84%, 60%)" }} />
                <Bar dataKey="avgUptime" radius={[4, 4, 0, 0]} name="Avg Uptime">
                  {filteredSummary.map((entry, i) => (
                    <Cell key={i} fill={entry.avgUptime >= slaTarget ? "hsl(160, 84%, 39%)" : entry.avgUptime >= 98 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No uptime data logged yet.</div>
          )}
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <h3 className="label-caps mb-4">Monthly Uptime Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis domain={[95, 100]} tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} formatter={(v: number | null) => v != null ? `${v}%` : "N/A"} />
              <ReferenceLine y={slaTarget} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="uptime" stroke="hsl(226, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} connectNulls name="Avg Uptime" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <SLACalculator />
      </div>

      {/* Vendor Detail Table */}
      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 label-caps">Vendor</th>
              <th className="px-5 py-3 label-caps">Systems</th>
              <th className="px-5 py-3 label-caps">Avg Uptime</th>
              <th className="px-5 py-3 label-caps">Latest</th>
              <th className="px-5 py-3 label-caps">Min</th>
              <th className="px-5 py-3 label-caps">Records</th>
              <th className="px-5 py-3 label-caps">SLA Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSummary.map((v) => (
              <tr key={v.vendor} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-5 py-3 font-medium">{v.vendor}</td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{v.systems || "—"}</td>
                <td className={`px-5 py-3 font-mono-data tabular-nums font-semibold ${getUptimeColor(v.avgUptime)}`}>{v.avgUptime}%</td>
                <td className={`px-5 py-3 font-mono-data tabular-nums ${getUptimeColor(v.latestUptime)}`}>{v.latestUptime}%</td>
                <td className={`px-5 py-3 font-mono-data tabular-nums ${getUptimeColor(v.minUptime)}`}>{v.minUptime}%</td>
                <td className="px-5 py-3 font-mono-data tabular-nums text-muted-foreground">{v.records}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 text-xs font-medium ${v.belowSla ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
                    {v.belowSla ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    {v.belowSla ? "Below SLA" : "Meeting SLA"}
                  </span>
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
          </tbody>
        </table>
        {!isLoading && filteredSummary.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-sm">No uptime data for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
}
