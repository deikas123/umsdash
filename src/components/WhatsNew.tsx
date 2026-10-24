import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const CHANGELOG = [
  {
    date: '2026-10-22',
    title: 'Gamification & Streaks',
    description:
      'Upload documents daily to earn XP, maintain streaks, and unlock achievements. Check My Progress in the sidebar.',
    tag: 'New',
  },
  {
    date: '2026-10-15',
    title: 'UI Improvements',
    description:
      'Breadcrumbs, sidebar memory, quick-action FAB, grid/list toggle for documents, bulk actions, and more polish across the app.',
    tag: 'Improved',
  },
  {
    date: '2026-09-01',
    title: 'Operations Hub Integration',
    description:
      'Vendor uptime monitoring, incident tracking, SLA breach alerts, and ops analytics now unified in UMS Hub.',
    tag: 'New',
  },
  {
    date: '2026-08-01',
    title: 'UMS Hub Launch',
    description:
      'Document Vault and Operations Hub unified into a single platform. Single login, shared user management.',
    tag: 'Launch',
  },
];

export function WhatsNew() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-1.5 h-8 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          What's New
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            What's New in UMS Hub
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-6">
          {CHANGELOG.map((entry, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                {i < CHANGELOG.length - 1 && (
                  <div className="flex-1 w-px bg-border mt-1" />
                )}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {entry.tag}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold">{entry.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
