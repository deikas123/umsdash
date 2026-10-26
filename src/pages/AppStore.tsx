import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { FileText, Activity, Users, TrendingUp, MessageSquare, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const APP_REGISTRY = [
  {
    id: 'docs',
    name: 'Document Vault',
    description: 'Full document lifecycle management — upload, categorise, approve, expire, and share documents.',
    icon: FileText,
    color: 'from-blue-600 to-blue-800',
    status: 'installed' as const,
    href: '/docs',
    features: ['Upload & version control', 'Customer portal', 'OCR search', 'Audit trail'],
  },
  {
    id: 'ops',
    name: 'Operations Hub',
    description: 'Track vendor uptime, incidents, passwords, escalations, and on-call schedules.',
    icon: Activity,
    color: 'from-emerald-600 to-emerald-800',
    status: 'installed' as const,
    href: '/ops',
    features: ['Vendor scorecard', 'Incident management', 'SLA tracking', 'Escalations'],
  },
  {
    id: 'hr',
    name: 'HR Suite',
    description: 'Employee records, leave management, payroll integration, and performance reviews.',
    icon: Users,
    color: 'from-violet-600 to-violet-800',
    status: 'installed' as const,
    href: '/hr',
    features: ['Leave tracking', 'Performance reviews', 'Payroll export', 'Onboarding'],
  },
  {
    id: 'finance',
    name: 'Finance Tracker',
    description: 'Expense tracking, budget management, invoice processing, and financial reporting.',
    icon: TrendingUp,
    color: 'from-amber-600 to-amber-800',
    status: 'coming_soon' as const,
    href: null,
    features: ['Expense management', 'Budgets', 'Invoice processing', 'Reports'],
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management, pipeline tracking, and communication history.',
    icon: MessageSquare,
    color: 'from-rose-600 to-rose-800',
    status: 'coming_soon' as const,
    href: null,
    features: ['Contact management', 'Pipeline', 'Communication log', 'Deals'],
  },
];

export default function AppStore() {
  const navigate = useNavigate();
  const installed = APP_REGISTRY.filter(a => a.status === 'installed');
  const comingSoon = APP_REGISTRY.filter(a => a.status === 'coming_soon');

  return (
    <AppLayout title="App Store" description="Browse and manage UMS Hub applications">
      <PageHeader title="App Store" description="All available applications for your UMS Hub workspace." />      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Installed Apps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {installed.map(app => (
            <Card key={app.id} className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center`}>
                    <app.icon className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Installed</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{app.name}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground mb-3 space-y-1">
                  {app.features.map(f => <li key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />{f}</li>)}
                </ul>
                <Button size="sm" className="w-full" onClick={() => app.href && navigate(app.href)}>Open App →</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coming Soon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoon.map(app => (
            <Card key={app.id} className="opacity-75">
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center opacity-60`}>
                  <app.icon className="h-5 w-5 text-white" />
                </div>
                <Badge variant="secondary" className="w-fit mt-1">Coming Soon</Badge>
                <CardTitle className="text-lg">{app.name}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground mb-3 space-y-1">
                  {app.features.map(f => <li key={f} className="text-muted-foreground/60">• {f}</li>)}
                </ul>
                <Button size="sm" variant="outline" disabled className="w-full">Notify Me</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
