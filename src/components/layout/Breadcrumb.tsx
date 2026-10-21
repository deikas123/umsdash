import { useLocation, Link } from 'react-router-dom';

// Map URL path segments to human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  docs: 'Document Vault',
  ops: 'Operations Hub',
  dashboard: 'Dashboard',
  documents: 'Documents',
  upload: 'Upload',
  customers: 'Customers',
  users: 'Users',
  folders: 'Folders',
  tasks: 'Tasks',
  reminders: 'Reminders',
  chat: 'Team Chat',
  settings: 'Settings',
  gamification: 'My Progress',
  'my-documents': 'My Documents',
  'audit-logs': 'Audit Logs',
  categories: 'Categories',
  activity: 'Activity Feed',
  reports: 'Reports',
  notifications: 'Notifications',
  'deletion-requests': 'Deletion Requests',
  'storage-analytics': 'Storage Analytics',
  'activity-heatmap': 'Activity Heatmap',
  'database-export': 'Database Export',
  'document-expiry': 'Document Expiry',
  'in-app-notifications': 'Notifications',
  'vendor-issues': 'Vendor Issues',
  'vendor-uptime': 'Vendor Uptime',
  incidents: 'Incidents',
  passwords: 'Passwords',
  analytics: 'Analytics',
  'sms-logs': 'SMS Logs',
  escalations: 'Escalations',
  search: 'Search',
};

export function AppBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Only show breadcrumb when depth > 1 (not on root pages like /docs or /ops)
  if (segments.length <= 1) return null;

  // Build breadcrumb items
  const items = segments.map((seg, idx) => {
    const path = '/' + segments.slice(0, idx + 1).join('/');
    const label =
      SEGMENT_LABELS[seg] ||
      seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = idx === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 px-3 sm:px-4 lg:px-6 py-1.5 text-xs text-muted-foreground border-b bg-background/80"
    >
      <Link to="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      {items.map((item) => (
        <span key={item.path} className="flex items-center gap-1">
          <span className="mx-0.5">/</span>
          {item.isLast ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link to={item.path} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
