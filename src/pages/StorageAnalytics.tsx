import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/hooks/useStats';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HardDrive, Database, Users, FolderOpen, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <AppLayout title="Storage Analytics" description="Monitor storage consumption across the system">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <PageHeader
          title="Storage Analytics"
          description="Monitor storage consumption across the system"
        />

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Total Storage */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3 flex-shrink-0">
                <HardDrive className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Storage</p>
                {loading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold truncate">{formatBytes(stats.totalStorageBytes)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3 flex-shrink-0">
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                {loading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.storageByCategory.length}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3 flex-shrink-0">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Customers</p>
                {loading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.storageByCustomer.length}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemVariants} className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Storage by Category Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Storage by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : categoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Database className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No storage data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="bytes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatBytes(value), 'Storage']} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Storage by Customer Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top 10 Customers by Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : customerData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No customer storage data</p>
                </div>
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
                    <Tooltip formatter={(value: number) => [formatBytes(value), 'Storage']} />
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
        </motion.div>

        {/* Per-Bucket Usage Progress Bars */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Storage Breakdown by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : stats.storageByCategory.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No categories found</p>
              ) : (
                <div className="space-y-4">
                  {stats.storageByCategory.map((cat, i) => {
                    const pct = stats.totalStorageBytes > 0
                      ? Math.round((cat.bytes / stats.totalStorageBytes) * 100)
                      : 0;
                    const color = COLORS[i % COLORS.length];
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm text-muted-foreground">{formatBytes(cat.bytes)}</span>
                            <Badge variant="secondary" className="text-xs tabular-nums">{pct}%</Badge>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
