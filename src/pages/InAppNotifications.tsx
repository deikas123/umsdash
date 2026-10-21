import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Search, CheckCheck, Trash2, FileText, ListTodo, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useNavigate } from 'react-router-dom';

const typeIcon = (type: string) => {
  switch (type) {
    case 'task': return <ListTodo className="h-4 w-4 text-blue-500" />;
    case 'document': return <FileText className="h-4 w-4 text-emerald-500" />;
    case 'reminder': return <Bell className="h-4 w-4 text-amber-500" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function InAppNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useInAppNotifications();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const navigate = useNavigate();

  const types = useMemo(() => Array.from(new Set(notifications.map(n => n.type))), [notifications]);

  const filtered = notifications.filter(n => {
    const matchesSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    const matchesRead = readFilter === 'all' ||
      (readFilter === 'unread' && !n.is_read) ||
      (readFilter === 'read' && n.is_read);
    return matchesSearch && matchesType && matchesRead;
  });

  return (
    <AppLayout title="Notifications" description="All your in-app notifications">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{notifications.length - unreadCount}</p>
              <p className="text-xs text-muted-foreground">Read</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground">You're all caught up</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <Card key={n.id} className={`transition ${!n.is_read ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{typeIcon(n.type)}</div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium">{n.title}</span>
                        <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                        {!n.is_read && <Badge className="text-[10px]">New</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground" title={format(new Date(n.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {!n.is_read && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markAsRead(n.id)}>
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNotification(n.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
