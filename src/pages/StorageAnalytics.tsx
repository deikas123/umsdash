import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStats } from '@/hooks/useStats';
import { HardDrive, Database, Users, FolderOpen } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const COLORS = [
  'hsl(220, 70%, 50%)', 'hsl(160, 70%, 45%)', 'hsl(40, 90%, 50%)',
  'hsl(340, 70%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(30, 80%, 50%)',
  'hsl(200, 70%, 50%)', 'hsl(100, 60%, 45%)', 'hsl(0, 70%, 50%)',
  'hsl(260, 60%, 55%)',
];

export default function StorageAnalytics() {
  const { stats, loading } = useStats();

  const categoryData = stats.storageByCategory.map((c, i) => ({
    ...c,
    fill: COLORS[i % COLORS.length],
    label: `${c.name} (${formatBytes(c.bytes)})`,
  }));

  const customerData = stats.storageByCustomer.map((c, i) => ({
    ...c,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <AppLayout title="Storage Analytics" description="Monitor storage consumption across the system">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <HardDrive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-20" /> : formatBytes(stats.totalStorageBytes)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-10" /> : stats.storageByCategory.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Customers</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-10" /> : stats.storageByCustomer.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Storage by Category Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Storage by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : categoryData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No storage data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="bytes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatBytes(value)} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Storage by Customer Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Customers by Storage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : customerData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No customer storage data</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={customerData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => formatBytes(v)} className="text-xs" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 10 }}
                      className="text-xs"
                    />
                    <Tooltip formatter={(value: number) => formatBytes(value)} />
                    <Bar dataKey="bytes" name="Storage" radius={[0, 4, 4, 0]}>
                      {customerData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {stats.storageByCategory.map((cat) => {
                  const pct = stats.totalStorageBytes > 0
                    ? Math.round((cat.bytes / stats.totalStorageBytes) * 100)
                    : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                        <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                          {formatBytes(cat.bytes)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
