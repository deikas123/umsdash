import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Users,
  ClipboardList,
  Settings,
  FolderOpen,
  FolderLock,
  Bell,
  ListTodo,
  Trash2,
  MessageSquare,
  Activity,
  BarChart3,
  CalendarClock,
  HardDrive,
  Flame,
  DatabaseBackup,
  Search as SearchIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SUPER_ADMIN_EMAIL = "amsterntechhub@gmail.com";

type CmdItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Navigation" | "Administration" | "Personal";
  roles: Array<"admin" | "staff" | "customer">;
  superAdminOnly?: boolean;
};

const ITEMS: CmdItem[] = [
  { label: "Dashboard", path: "/docs", icon: LayoutDashboard, group: "Navigation", roles: ["admin", "staff"] },
  { label: "Upload Document", path: "/docs/upload", icon: Upload, group: "Navigation", roles: ["admin", "staff"] },
  { label: "All Documents", path: "/docs/documents", icon: FileText, group: "Navigation", roles: ["admin", "staff"] },
  { label: "Doc Expiry", path: "/docs/document-expiry", icon: CalendarClock, group: "Navigation", roles: ["admin", "staff"] },
  { label: "Search", path: "/docs/search", icon: SearchIcon, group: "Navigation", roles: ["admin", "staff"] },
  { label: "Customers", path: "/docs/customers", icon: Users, group: "Navigation", roles: ["admin", "staff"] },
  { label: "Private Folders", path: "/docs/folders", icon: FolderLock, group: "Navigation", roles: ["admin", "staff", "customer"] },
  { label: "Tasks", path: "/docs/tasks", icon: ListTodo, group: "Navigation", roles: ["admin", "staff", "customer"] },
  { label: "Reminders", path: "/docs/reminders", icon: Bell, group: "Navigation", roles: ["admin", "staff", "customer"] },
  { label: "Team Chat", path: "/docs/chat", icon: MessageSquare, group: "Navigation", roles: ["admin", "staff", "customer"] },
  { label: "My Documents", path: "/docs/my-documents", icon: FolderOpen, group: "Navigation", roles: ["customer"] },

  { label: "User Management", path: "/docs/users", icon: Users, group: "Administration", roles: ["admin"] },
  { label: "Reports", path: "/docs/reports", icon: BarChart3, group: "Administration", roles: ["admin"] },
  { label: "Activity Feed", path: "/docs/activity", icon: Activity, group: "Administration", roles: ["admin"] },
  { label: "Notifications", path: "/docs/notifications", icon: MessageSquare, group: "Administration", roles: ["admin"] },
  { label: "Deletion Requests", path: "/docs/deletion-requests", icon: Trash2, group: "Administration", roles: ["admin"] },
  { label: "Categories", path: "/docs/categories", icon: FolderOpen, group: "Administration", roles: ["admin"] },
  { label: "Audit Logs", path: "/docs/audit-logs", icon: ClipboardList, group: "Administration", roles: ["admin"] },
  { label: "Storage Analytics", path: "/docs/storage-analytics", icon: HardDrive, group: "Administration", roles: ["admin"] },
  { label: "Activity Heatmap", path: "/docs/activity-heatmap", icon: Flame, group: "Administration", roles: ["admin"] },
  { label: "Database Export", path: "/docs/database-export", icon: DatabaseBackup, group: "Administration", roles: ["admin"], superAdminOnly: true },

  { label: "Settings", path: "/docs/settings", icon: Settings, group: "Personal", roles: ["admin", "staff", "customer"] },
];

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role, user, profile } = useAuth();
  const isSuperAdmin = (user?.email ?? profile?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(() => {
    const visible = ITEMS.filter((i) =>
      (role ? i.roles.includes(role) : false) && (!i.superAdminOnly || isSuperAdmin)
    );
    return {
      Navigation: visible.filter((i) => i.group === "Navigation"),
      Administration: visible.filter((i) => i.group === "Administration"),
      Personal: visible.filter((i) => i.group === "Personal"),
    };
  }, [role, isSuperAdmin]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-2 text-muted-foreground hidden sm:inline-flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Quick search</span>
        <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {shortcut}
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8 sm:hidden"
        aria-label="Quick search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a page or feature..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {(["Navigation", "Administration", "Personal"] as const).map((group, idx) => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <div key={group}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.path}
                      value={`${item.label} ${item.path}`}
                      onSelect={() => go(item.path)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
