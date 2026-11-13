// src/components/CommandPalette.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';

interface PaletteItem {
  label: string;
  href: string;
}

interface PaletteGroup {
  group: string;
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    group: 'Document Vault',
    items: [
      { label: 'Dashboard', href: '/docs' },
      { label: 'Documents', href: '/docs/documents' },
      { label: 'Customers', href: '/docs/customers' },
      { label: 'Upload', href: '/docs/upload' },
      { label: 'Tasks', href: '/docs/tasks' },
      { label: 'Chat', href: '/docs/chat' },
      { label: 'Folders', href: '/docs/folders' },
      { label: 'Reminders', href: '/docs/reminders' },
      { label: 'Search', href: '/docs/search' },
      { label: 'Reports', href: '/docs/reports' },
      { label: 'Audit Logs', href: '/docs/audit-logs' },
      { label: 'Settings', href: '/docs/settings' },
    ],
  },
  {
    group: 'Operations Hub',
    items: [
      { label: 'Ops Dashboard', href: '/ops' },
      { label: 'Incidents', href: '/ops/incidents' },
      { label: 'Vendor Issues', href: '/ops/vendor-issues' },
      { label: 'Passwords', href: '/ops/passwords' },
      { label: 'Escalations', href: '/ops/escalations' },
      { label: 'On-Call', href: '/ops/oncall' },
      { label: 'Analytics', href: '/ops/analytics' },
    ],
  },
  {
    group: 'HR Hub',
    items: [
      { label: 'HR Dashboard', href: '/hr' },
      { label: 'Employees', href: '/hr/employees' },
      { label: 'Leave', href: '/hr/leave' },
      { label: 'Payroll', href: '/hr/payroll' },
      { label: 'Attendance', href: '/hr/attendance' },
      { label: 'Loans', href: '/hr/loans' },
      { label: 'Overtime', href: '/hr/overtime' },
      { label: 'Announcements', href: '/hr/announcements' },
      { label: 'Messages', href: '/hr/messages' },
      { label: 'Surveys', href: '/hr/surveys' },
      { label: 'Departments', href: '/hr/departments' },
      { label: 'HR Reports', href: '/hr/reports' },
      { label: 'My Portal', href: '/hr/profile' },
      { label: 'Directory', href: '/hr/directory' },
    ],
  },
  {
    group: 'IT Command Centre',
    items: [
      { label: 'IT Overview', href: '/it' },
      { label: 'Helpdesk', href: '/it/support' },
      { label: 'Devices', href: '/it/devices' },
      { label: 'QR Scanner', href: '/it/scan' },
      { label: 'Login Activity', href: '/it/security/login-activity' },
    ],
  },
];

export function CommandPalette() {  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const toggle = useCallback(() => setOpen(prev => !prev), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const handleOpen = () => toggle();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('umshub:open-command-palette', handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('umshub:open-command-palette', handleOpen);
    };
  }, [toggle]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch('');
    navigate(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl mx-4 rounded-xl border bg-card shadow-2xl overflow-hidden">
        <Command className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:py-2">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No pages found.
            </Command.Empty>

            {PALETTE_GROUPS.map(({ group, items }) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map(item => (
                  <Command.Item
                    key={item.href}
                    value={`${group} ${item.label}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{item.href}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="border-t px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span><kbd className="rounded border bg-muted px-1 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd> open</span>
            <span><kbd className="rounded border bg-muted px-1 py-0.5">Ctrl+K</kbd> toggle</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

/**
 * Trigger button rendered in AppLayout header.
 * Dispatches a custom event that CommandPalette listens to.
 */
export function CommandPaletteTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new Event('umshub:open-command-palette'));
  };

  return (
    <button
      onClick={handleClick}
      title="Open command palette (Ctrl+K)"
      aria-label="Open command palette"
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden sm:inline rounded border bg-background px-1 py-0.5 text-[10px]">Ctrl+K</kbd>
    </button>
  );
}
