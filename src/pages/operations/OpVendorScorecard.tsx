import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/operations/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

function slaLabel(uptime: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (uptime >= 99.9) return { label: 'Platinum', variant: 'default' };
  if (uptime >= 99.5) return { label: 'Gold', variant: 'default' };
  if (uptime >= 99.0) return { label: 'Silver', variant: 'secondary' };
  return { label: 'At Risk', variant: 'destructive' };
}

interface VendorScore {
  vendor: string;
  totalIssues: number;
  avgResolution: number;
  uptime: number;
}

export default function OpVendorScorecard() {
  const { data: issues = [], isLoading: loadingIssues } = useQuery({
    queryKey: ['vendor_issues_scorecard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_issues')
        .select('vendor, status, date_reported, updated_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: uptimeRows = [], isLoading: loadingUptime } = useQuery({
    queryKey: ['vendor_uptime_scorecard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_issues')
        .select('vendor, uptime_percentage')
        .not('uptime_percentage', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const scores = useMemo<VendorScore[]>(() => {
    const vendors = Array.from(new Set([...issues, ...uptimeRows].map(r => r.vendor)));
    return vendors.map(vendor => {
      const vIssues = issues.filter(i => i.vendor === vendor);
      const resolved = vIssues.filter(i => i.status === 'resolved' || i.status === 'closed');
      const avgRes = resolved.length > 0
        ? resolved.reduce((acc, i) => {
            const ms = new Date(i.updated_at).getTime() - new Date(i.date_reported || i.updated_at).getTime();
            return acc + Math.max(0, ms);
          }, 0) / resolved.length / 3600000 // hours
        : 0;
      const vUptime = uptimeRows.filter(r => r.vendor === vendor).map(r => r.uptime_percentage as number);
      const avgUptime = vUptime.length > 0 ? vUptime.reduce((a, b) => a + b, 0) / vUptime.length : 100;
      return { vendor, totalIssues: vIssues.length, avgResolution: Math.round(avgRes), uptime: Math.round(avgUptime * 100) / 100 };
    }).sort((a, b) => b.uptime - a.uptime);
  }, [issues, uptimeRows]);

  const loading = loadingIssues || loadingUptime;

  return (
    <div>
      <PageHeader
        title="Vendor Scorecard"
        description="Vendor performance overview — uptime, issues, and SLA tier."
      />
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No vendor data yet. Add vendor issues and uptime records to see scores.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map(s => {
            const sla = slaLabel(s.uptime);
            return (
              <Card key={s.vendor}>
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-semibold">{s.vendor}</p>
                    <Badge variant={sla.variant} className="text-xs mt-1">{sla.label} SLA</Badge>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{s.totalIssues}</span>
                      <span className="text-muted-foreground">issues</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{s.avgResolution}h</span>
                      <span className="text-muted-foreground">avg resolution</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{s.uptime}%</span>
                      <span className="text-muted-foreground">uptime</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-32">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${s.uptime >= 99.5 ? 'bg-green-500' : s.uptime >= 99.0 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, s.uptime)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-0.5">{s.uptime}% uptime</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
