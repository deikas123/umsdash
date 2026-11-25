import { useState } from 'react';
import { useItVpsMonitors, useItCloudServices } from '@/it/hooks/useItData';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type VpsStatus = 'up' | 'down' | 'degraded';
type CloudStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

interface SummaryRow {
  id: string;
  name: string;
  kind: 'vps' | 'cloud';
  status: string;
  availabilityPct: number | null;
  slaTarget: number;
}

/** Returns null for maintenance so it is shown as "Maintenance" rather than a 0% figure. */
function cloudStatusToPct(status: CloudStatus): number | null {
  if (status === 'operational') return 100;
  if (status === 'degraded') return 99;
  if (status === 'maintenance') return null;
  return 0; // outage
}

function statusColor(status: string): string {
  if (status === 'up' || status === 'operational') return 'bg-green-100 text-green-800';
  if (status === 'degraded') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function statusDot(status: string): string {
  if (status === 'up' || status === 'operational') return 'bg-green-500';
  if (status === 'degraded') return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function UptimeSummary() {
  const { isItAdmin, isItStaff, isAdmin } = useAuth();
  if (!isItAdmin && !isItStaff && !isAdmin) return <Navigate to="/it" replace />;

  const { data: vps = [] } = useItVpsMonitors();
  const { data: cloud = [] } = useItCloudServices();

  const initialRows = (): SummaryRow[] => [
    ...vps.map(v => ({
      id: v.id, name: v.name, kind: 'vps' as const,
      status: v.status, availabilityPct: v.uptime_pct ?? 0, slaTarget: 99.9,
    })),
    ...cloud.map(c => ({
      id: c.id, name: c.name, kind: 'cloud' as const,
      status: c.status, availabilityPct: cloudStatusToPct(c.status as CloudStatus), slaTarget: 99.9,
    })),
  ];

  const [slaTargets, setSlaTargets] = useState<Record<string, number>>({});

  const rows: SummaryRow[] = initialRows().map(r => ({
    ...r,
    slaTarget: slaTargets[r.id] ?? r.slaTarget,
  }));

  const updateSla = (id: string, val: number) => {
    setSlaTargets(prev => ({ ...prev, [id]: val }));
  };

  const chartData = vps.map(v => ({ name: v.name, uptime: v.uptime_pct ?? 0 }));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('IT Uptime Summary Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      head: [['Service', 'Type', 'Status', 'Availability %', 'SLA Target %', 'SLA Met']],
      body: rows.map(r => [
        r.name,
        r.kind.toUpperCase(),
        r.status,
        r.availabilityPct === null ? 'Maintenance' : r.availabilityPct.toFixed(2) + '%',
        r.slaTarget.toFixed(2) + '%',
        r.availabilityPct === null ? 'N/A' : r.availabilityPct >= r.slaTarget ? 'Yes' : 'No',
      ]),
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 174, 219] },
    });
    doc.save(`uptime-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Uptime Summary</h1>
          <p className="page-subtitle">Availability overview for VPS and cloud services</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* Summary table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Availability %</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">SLA Target %</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">SLA Met</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No services recorded.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{r.kind}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot(r.status)}`} />
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {r.availabilityPct === null ? (
                    <span className="text-muted-foreground italic text-xs">Maintenance</span>
                  ) : `${r.availabilityPct.toFixed(2)}%`}
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={r.slaTarget}
                    onChange={e => updateSla(r.id, parseFloat(e.target.value) || 99.9)}
                    className="h-7 w-24 text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  {r.availabilityPct === null
                    ? <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Maintenance</Badge>
                    : r.availabilityPct >= r.slaTarget
                    ? <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Met</Badge>
                    : <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Below SLA</Badge>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VPS uptime chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <h2 className="text-sm font-semibold mb-4">VPS Uptime % by Server</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Bar dataKey="uptime" radius={[4, 4, 0, 0]} name="Uptime %">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.uptime >= 99 ? '#22c55e' : entry.uptime >= 95 ? '#eab308' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
