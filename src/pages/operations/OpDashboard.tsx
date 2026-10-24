import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/operations/StatsCard";
import PageHeader from "@/components/operations/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2, KeyRound, Server, FileWarning, TrendingUp, Activity, ShieldAlert, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { motion } from "framer-motion";

const COLORS = {
  primary: "hsl(226, 70%, 55%)",
  accent: "hsl(160, 84%, 39%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 84%, 60%)",
  muted: "hsl(214, 32%, 85%)",
  indigo400: "hsl(226, 68%, 65%)",
  indigo200: "hsl(226, 100%, 87%)",
};

const statusColors: Record<string, string> = {
  open: COLORS.primary,
  draft: COLORS.muted,
  in_progress: COLORS.warning,
  resolved: COLORS.accent,
  closed: "hsl(214, 32%, 75%)",
};

const sevBadge: Record<string, string> = {
  "Level 1": "bg-primary/10 text-primary",
  "Level 2": "bg-warning/10 text-[hsl(38,92%,50%)]",
  "Level 3": "bg-destructive/10 text-destructive",
  "Level 4": "bg-destructive text-destructive-foreground",
};
const statusBadge: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/10 text-[hsl(38,92%,50%)]",
  resolved: "bg-accent/10 text-accent",
  closed: "bg-muted text-muted-foreground",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "none",
  boxShadow: "0 4px 24px rgba(0,0,0,.12)",
  fontSize: 12,
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};

const MotionCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] }}
    className={`rounded-lg bg-card p-5 card-shadow ${className}`}
  >
    {children}
  </motion.div>
);

export default function OpDashboard() {
  const [timeRange, setTimeRange] = useState("6");
  const navigate = useNavigate();
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
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

  const { data: vendorIssues = [] } = useQuery({
    queryKey: ["vendor_issues"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_issues").select("*");
      return data || [];
    },
  });

  // === Computed stats ===
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "in_progress").length;
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const expiringPasswords = passwords.filter((p) => {
    const d = differenceInDays(parseISO(p.expiry_date), new Date());
    return d > 0 && d <= 7;
  }).length;
  const avgUptime = useMemo(() => {
    const withUptime = vendorIssues.filter((v) => v.uptime_percentage != null);
    if (!withUptime.length) return null;
    return (withUptime.reduce((s, v) => s + Number(v.uptime_percentage), 0) / withUptime.length).toFixed(2);
  }, [vendorIssues]);

  // === Status pie ===
  const statusData = useMemo(() => {
    const counts = incidents.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name, value, fill: statusColors[name] || COLORS.muted,
    }));
  }, [incidents]);

  // === Monthly trend (area chart) ===
  const monthlyTrend = useMemo(() => {
    const months = parseInt(timeRange);
    const now = new Date();
    return Array.from({ length: months }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, months - 1 - i));
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, "MMM yy");
      const created = incidents.filter((inc) => {
        const d = parseISO(inc.created_at);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;
      const resolved = incidents.filter((inc) => {
        if (inc.status !== "resolved" && inc.status !== "closed") return false;
        const d = parseISO(inc.updated_at);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;
      return { month: label, created, resolved };
    });
  }, [incidents, timeRange]);

  // === Severity breakdown ===
  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      const sev = (i.severity || "Unset").split(" –")[0];
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // === Department breakdown ===
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      const dept = i.department || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // === Vendor uptime gauge data ===
  const vendorUptimeData = useMemo(() => {
    const byVendor: Record<string, { total: number; count: number }> = {};
    vendorIssues.forEach((v) => {
      if (v.uptime_percentage == null) return;
      if (!byVendor[v.vendor]) byVendor[v.vendor] = { total: 0, count: 0 };
      byVendor[v.vendor].total += Number(v.uptime_percentage);
      byVendor[v.vendor].count += 1;
    });
    return Object.entries(byVendor).map(([vendor, { total, count }]) => ({
      name: vendor,
      uptime: parseFloat((total / count).toFixed(2)),
      fill: total / count >= 99.5 ? COLORS.accent : total / count >= 98 ? COLORS.warning : COLORS.destructive,
    }));
  }, [vendorIssues]);

  // === Password expiry distribution ===
  const pwData = useMemo(() => [
    { name: "Active", value: passwords.filter((p) => differenceInDays(parseISO(p.expiry_date), new Date()) > 7).length, fill: COLORS.accent },
    { name: "< 7 days", value: passwords.filter((p) => { const d = differenceInDays(parseISO(p.expiry_date), new Date()); return d > 2 && d <= 7; }).length, fill: COLORS.warning },
    { name: "< 2 days", value: passwords.filter((p) => { const d = differenceInDays(parseISO(p.expiry_date), new Date()); return d > 0 && d <= 2; }).length, fill: COLORS.destructive },
    { name: "Expired", value: passwords.filter((p) => differenceInDays(parseISO(p.expiry_date), new Date()) <= 0).length, fill: "hsl(0, 60%, 45%)" },
  ], [passwords]);

  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <PageHeader
          title="System Overview"
          description={incidents.length ? `${incidents.length} total incidents tracked across ${new Set(incidents.map((i) => i.department).filter(Boolean)).size} departments.` : "No incidents yet. Create your first incident report."}
        />
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="cursor-pointer" onClick={() => navigate("/ops/incidents?status=open")}>
          <StatsCard label="Open Incidents" value={openIncidents} icon={FileWarning} trend={openIncidents > 5 ? "down" : "neutral"} change={openIncidents > 5 ? "Needs attention" : undefined} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="cursor-pointer" onClick={() => navigate("/ops/incidents?status=resolved")}>
          <StatsCard label="Resolved" value={resolvedIncidents} icon={CheckCircle2} trend="up" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="cursor-pointer" onClick={() => navigate("/ops/passwords")}>
          <StatsCard label="Passwords Expiring" value={expiringPasswords} change="Within 7 days" trend={expiringPasswords > 0 ? "down" : "neutral"} icon={KeyRound} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="cursor-pointer" onClick={() => navigate("/ops/vendor-uptime")}>
          <StatsCard label="Avg Uptime" value={avgUptime ? `${avgUptime}%` : "—"} icon={Activity} trend={avgUptime && parseFloat(avgUptime) >= 99.5 ? "up" : "neutral"} change={avgUptime ? (parseFloat(avgUptime) >= 99.5 ? "Above SLA" : "Below SLA") : undefined} />
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident Trend - Spans 2 cols */}
        <MotionCard className="lg:col-span-2" delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Incident Trend
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke={COLORS.primary} fill="url(#gradCreated)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke={COLORS.accent} fill="url(#gradResolved)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </MotionCard>

        {/* Status Pie */}
        <MotionCard delay={0.15}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-primary" /> Status Breakdown
          </h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                    paddingAngle={3} dataKey="value" animationBegin={200} animationDuration={800}
                    cursor="pointer"
                    onClick={(entry) => navigate(`/ops/incidents?status=${entry.name}`)}
                  >
                    {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                    {d.name}: <span className="font-medium tabular-nums text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : incidentsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No incidents yet</p>
          )}
        </MotionCard>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Severity */}
        <MotionCard delay={0.2}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-destructive" /> By Severity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value" name="Incidents" radius={[4, 4, 0, 0]} animationDuration={800}
                cursor="pointer"
                onClick={(entry) => navigate(`/ops/incidents?severity=${entry.name}`)}
              >
                {severityData.map((_, i) => (
                  <Cell key={i} fill={[COLORS.primary, COLORS.warning, COLORS.destructive, "hsl(0, 60%, 45%)"][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MotionCard>

        {/* Department */}
        <MotionCard delay={0.25}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-primary" /> By Department
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value" name="Incidents" fill={COLORS.indigo400} radius={[0, 4, 4, 0]} animationDuration={800}
                cursor="pointer"
                onClick={(entry) => navigate(`/ops/incidents?department=${entry.name}`)}
              />
            </BarChart>
          </ResponsiveContainer>
        </MotionCard>

        {/* Password Expiry */}
        <MotionCard delay={0.3}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-warning" /> Password Expiry
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pwData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value" animationBegin={300} animationDuration={800}>
                {pwData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {pwData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                {d.name}: <span className="font-medium tabular-nums text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>

      {/* Vendor Uptime */}
      {vendorUptimeData.length > 0 && (
        <MotionCard delay={0.35}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-accent" /> Vendor System Uptime
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vendorUptimeData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis domain={[95, 100]} tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Uptime"]} />
              <Bar dataKey="uptime" name="Avg Uptime %" radius={[4, 4, 0, 0]} animationDuration={800}>
                {vendorUptimeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MotionCard>
      )}

      {/* Recent Incidents Table */}
      {recentIncidents.length > 0 && (
        <MotionCard delay={0.4} className="p-0 overflow-x-auto">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Incidents</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((inc) => {
                const sevKey = (inc.severity || "").split(" –")[0];
                return (
                  <tr key={inc.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                    <td className="px-5 py-3 font-mono text-xs tabular-nums">{inc.incident_number}</td>
                    <td className="px-5 py-3">{inc.incident_type || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${sevBadge[sevKey] || "bg-muted text-muted-foreground"}`}>
                        {inc.severity || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusBadge[inc.status] || ""}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {inc.date_of_incident || inc.created_at?.split("T")[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </MotionCard>
      )}

      {incidents.length === 0 && passwords.length === 0 && vendorIssues.length === 0 && (
        <MotionCard className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No data yet. Start by creating an incident report or adding password entries.</p>
        </MotionCard>
      )}
    </div>
  );
}
