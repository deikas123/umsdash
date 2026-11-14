import { useState } from 'react';
import { FileText, CalendarDays, Terminal, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message?: string | null;
  created_at: string;
  is_read: boolean;
}

interface NotificationGroup {
  key: string;
  label: string;
  Icon: React.ElementType;
  iconClass: string;
  items: Notification[];
}

function classify(n: Notification): string {
  const text = `${n.title} ${n.message ?? ''}`.toLowerCase();
  if (/document|upload|doc|file|vault/.test(text)) return 'documents';
  if (/leave|holiday|annual|sick|maternity|paternity/.test(text)) return 'leave';
  if (/ticket|it |helpdesk|support|incident/.test(text)) return 'it';
  return 'system';
}

const GROUP_META: Record<string, { label: string; Icon: React.ElementType; iconClass: string }> = {
  documents: { label: 'Documents',  Icon: FileText,     iconClass: 'text-blue-500'  },
  leave:     { label: 'Leave',       Icon: CalendarDays, iconClass: 'text-orange-500'},
  it:        { label: 'IT / Helpdesk',Icon: Terminal,    iconClass: 'text-cyan-500'  },
  system:    { label: 'System',      Icon: Bell,         iconClass: 'text-gray-400'  },
};

interface NotificationDigestProps {
  notifications: Notification[];
}

export function NotificationDigest({ notifications }: NotificationDigestProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (notifications.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No recent activity</div>;
  }

  // Build groups preserving order: documents, leave, it, system
  const groupMap: Record<string, Notification[]> = { documents: [], leave: [], it: [], system: [] };
  for (const n of notifications) {
    groupMap[classify(n)].push(n);
  }

  const groups: NotificationGroup[] = Object.entries(groupMap)
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => ({ key, ...GROUP_META[key], items }));

  const toggle = (key: string) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="divide-y divide-border">
      {groups.map(({ key, label, Icon, iconClass, items }) => {
        const isOpen = !!openGroups[key];
        const unread = items.filter(n => !n.is_read).length;
        const latest = items[0];
        return (
          <div key={key}>
            {/* Group header */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              aria-expanded={isOpen}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${iconClass}`} />
              <span className="text-sm font-medium flex-1">{label}</span>
              {unread > 0 && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0.5 h-auto">{unread}</Badge>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:block">
                {latest.title}
              </span>
              {isOpen
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              }
            </button>

            {/* Expanded items */}
            {isOpen && (
              <div className="bg-muted/20">
                {items.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-6 py-2.5 border-t border-border/50 ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    {!n.is_read
                      ? <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      : <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
