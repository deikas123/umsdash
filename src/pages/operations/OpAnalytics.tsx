import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/operations/PageHeader";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";

export default function OpAnalytics() {
  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: vendorIssues = [] } = useQuery({
    queryKey: ["vendor_issues"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_issues").select("*");
      return data || [];
    },
  });

  const { data: passwords = [] } = useQuery({
    queryKey: ["passwords"],
    queryFn: async () => {
      const { data } = await supabase.from("passwords").select("*");
      return data || [];
    },
  });

  // Monthly trends (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return { key: format(startOfMonth(d), "yyyy-MM"), label: format(d, "MMM") };
  });

  const monthlyTrends = months.map((m) => {
    const monthIncidents = incidents.filter((inc) => {
      const d = inc.date_of_incident || inc.created_at?.split("T")[0];
      return d?.startsWith(m.key);
    });
    return {
      month: m.label,
      incidents: monthIncidents.length,
      resolved: monthIncidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
      open: monthIncidents.filter((i) => i.status === "open" || i.status === "in_progress").length,
    };
  });

  // Vendor performance + uptime from real data
  const vendorMap: Record<string, { issues: number; resolved: number; uptimes: number[]; }> = {};
  vendorIssues.forEach((v) => {
    if (!vendorMap[v.vendor]) vendorMap[v.vendor] = { issues: 0, resolved: 0, uptimes: [] };
    vendorMap[v.vendor].issues++;
    if (v.status === "Resolved" || v.status === "Closed") vendorMap[v.vendor].resolved++;
    if ((v as any).uptime_percentage != null) vendorMap[v.vendor].uptimes.push((v as any).uptime_percentage);
  });
  const vendorPerformance = Object.entries(vendorMap).map(([vendor, d]) => ({
    vendor, issues: d.issues, resolved: d.resolved,
    uptime: d.uptimes.length > 0 ? parseFloat((d.uptimes.reduce((a, b) => a + b, 0) / d.uptimes.length).toFixed(2)) : null,
  }));
  const vendorUptime = vendorPerformance.filter((v) => v.uptime !== null);

  // RCA categories from real incidents
  const rcaMap: Record<string, number> = {};
  incidents.forEach((inc) => {
    (inc.root_cause_categories || []).forEach((cat: string) => {
      rcaMap[cat] = (rcaMap[cat] || 0) + 1;
    });
  });
  const rcaColors = ["hsl(226, 70%, 55%)", "hsl(226, 68%, 65%)", "hsl(226, 100%, 87%)", "hsl(226, 100%, 94%)", "hsl(214, 32%, 91%)"];
  const rcaCategories = Object.entries(rcaMap).map(([name, value], i) => ({
    name, value, fill: rcaColors[i % rcaColors.length],
  }));

  // Summary stats
  const totalIncidents = incidents.length;
  const resolvedPct = totalIncidents > 0 ? Math.round((incidents.filter((i) => i.status === "resolved" || i.status === "closed").length / totalIncidents) * 100) : 0;

  const anaHeaders = ["Incident ID", "Type", "Department", "Severity", "Status", "Date"];
  const anaToRow = (i: any) => [i.incident_number, i.incident_type || "", i.department || "", i.severity || "", i.status, i.date_of_incident || ""];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Real-time reporting — Monthly trends, vendor performance, and RCA analysis."
        actions={
          <ExportMenu
            onCSV={() => exportToCSV(anaHeaders, incidents.map(anaToRow), `ums-analytics-${format(now, "yyyy-MM-dd")}.csv`)}
            onPDF={() => exportToPDF("UMS Analytics", anaHeaders, incidents.map(anaToRow))}
            onExcel={() => exportToExcel("Analytics", anaHeaders, incidents.map(anaToRow))}
          />
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Total Incidents</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{totalIncidents}</p>
          <p className="mt-1 text-xs text-accent font-medium">{resolvedPct}% resolved</p>
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Vendor Issues</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{vendorIssues.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{vendorIssues.filter((v) => v.status === "Open").length} open</p>
        </div>
        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="label-caps">Password Entries</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{passwords.length}</p>
          <p className="mt-1 text-xs text-destructive font-medium">
            {passwords.filter((p) => {
              const d = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / 86400000);
              return d <= 0;
            }).length} expired
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-shadow rounded-lg bg-card p-5">
          <h3 className="label-caps mb-4">Monthly Incident Trends</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} />
              <Line type="monotone" dataKey="incidents" stroke="hsl(226, 70%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Total" />
              <Line type="monotone" dataKey="resolved" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} name="Resolved" />
              <Line type="monotone" dataKey="open" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} name="Open" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {vendorPerformance.length > 0 ? (
          <div className="card-shadow rounded-lg bg-card p-5">
            <h3 className="label-caps mb-4">Vendor Performance</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vendorPerformance} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="vendor" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} />
                <Bar dataKey="issues" fill="hsl(226, 70%, 55%)" radius={[4, 4, 0, 0]} name="Issues" />
                <Bar dataKey="resolved" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card-shadow rounded-lg bg-card p-5 flex items-center justify-center text-muted-foreground text-sm">
            No vendor issues data yet.
          </div>
        )}

        {vendorUptime.length > 0 && (
          <div className="card-shadow rounded-lg bg-card p-5">
            <h3 className="label-caps mb-4">Vendor System Uptime (%)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vendorUptime} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="vendor" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis domain={[95, 100]} tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="uptime" radius={[4, 4, 0, 0]} name="Avg Uptime">
                  {vendorUptime.map((entry, i) => (
                    <Cell key={i} fill={entry.uptime! >= 99.5 ? "hsl(160, 84%, 39%)" : entry.uptime! >= 98 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {rcaCategories.length > 0 && (
          <div className="card-shadow rounded-lg bg-card p-5 col-span-2">
            <h3 className="label-caps mb-4">RCA Root Cause Categories</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={rcaCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {rcaCategories.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 4, border: "none", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.1)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 mt-2 flex-wrap">
              {rcaCategories.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  {d.name}: {d.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
