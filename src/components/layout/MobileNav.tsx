import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Activity, ListTodo, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Docs', href: '/docs', icon: FileText },
  { label: 'Ops', href: '/ops', icon: Activity },
  { label: 'Tasks', href: '/docs/tasks', icon: ListTodo },
  { label: 'Settings', href: '/docs/settings', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background flex items-center justify-around h-14 px-2">
      {tabs.map((tab) => {
        const active =
          location.pathname === tab.href ||
          (tab.href !== '/' && location.pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={tab.label}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
