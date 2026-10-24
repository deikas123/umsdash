import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';

function getSLATier(uptime: number): { label: string; color: string } {
  if (uptime >= 99.9) return { label: 'Platinum (99.9%+)', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
  if (uptime >= 99.5) return { label: 'Gold (99.5%+)', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
  if (uptime >= 99.0) return { label: 'Silver (99.0%+)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  if (uptime >= 95.0) return { label: 'Bronze (95%+)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
  return { label: 'At Risk (<95%)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
}

export function SLACalculator() {
  const [totalMinutes, setTotalMinutes] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState('');

  const total = parseFloat(totalMinutes) || 0;
  const downtime = parseFloat(downtimeMinutes) || 0;
  const uptime = total > 0 ? Math.max(0, ((total - downtime) / total) * 100) : null;
  const tier = uptime !== null ? getSLATier(uptime) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          SLA Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Total Minutes in Period</Label>
            <Input
              type="number"
              min="0"
              className="h-8 mt-1 text-sm"
              placeholder="e.g. 43200"
              value={totalMinutes}
              onChange={e => setTotalMinutes(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Downtime Minutes</Label>
            <Input
              type="number"
              min="0"
              className="h-8 mt-1 text-sm"
              placeholder="e.g. 30"
              value={downtimeMinutes}
              onChange={e => setDowntimeMinutes(e.target.value)}
            />
          </div>
        </div>
        {uptime !== null && tier && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <span className="text-lg font-bold">{uptime.toFixed(3)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SLA Tier</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className={`h-full rounded-full ${uptime >= 99.0 ? 'bg-green-500' : uptime >= 95.0 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, uptime)}%` }}
              />
            </div>
          </div>
        )}
        {uptime === null && (
          <p className="text-xs text-muted-foreground">Enter total and downtime minutes to calculate SLA uptime %.</p>
        )}
      </CardContent>
    </Card>
  );
}
