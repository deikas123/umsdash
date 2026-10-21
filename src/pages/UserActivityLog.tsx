import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Activity, CalendarIcon, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  must_reset_password?: boolean;
}

interface LogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

const actionBadgeVariant = (action: string) => {
  if (action.includes('delete') || action.includes('reset')) return 'destructive' as const;
  if (action.includes('create') || action.includes('approve')) return 'default' as const;
  if (action.includes('update') || action.includes('edit')) return 'secondary' as const;
  return 'outline' as const;
};

export default function UserActivityLog() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: p }, { data: r }, { data: l }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, avatar_url, created_at, must_reset_password')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase
          .from('audit_logs')
          .select('id, action, entity_type, entity_id, details, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);
      setProfile((p as Profile) ?? null);
      setRole(r?.role ?? null);
      setLogs((l as LogEntry[]) ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const actionTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );
  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
    const to = dateRange?.to
      ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))
      : dateRange?.from
        ? new Date(new Date(dateRange.from).setHours(23, 59, 59, 999))
        : null;
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false;
      const created = new Date(log.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (q) {
        const blob = `${log.action} ${log.entity_type} ${JSON.stringify(log.details ?? '')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, entityFilter, dateRange, search]);

  const hasActiveFilters =
    actionFilter !== 'all' || entityFilter !== 'all' || !!dateRange || search.trim() !== '';

  const clearFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setDateRange(undefined);
    setSearch('');
  };

  const initials = (profile?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout title="User Activity" description="Detailed audit trail for this user">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/docs/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : !profile ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            User not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="flex items-center gap-4 py-5">
              <Avatar className="h-14 w-14">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold truncate">{profile.full_name}</h2>
                  {role && <Badge className="capitalize">{role}</Badge>}
                  {profile.must_reset_password && (
                    <Badge variant="destructive">Password reset required</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                {profile.phone && (
                  <p className="text-xs text-muted-foreground">{profile.phone}</p>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Joined</div>
                <div>{new Date(profile.created_at).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Activity ({filtered.length}
                {filtered.length !== logs.length && ` of ${logs.length}`})
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search action / details..."
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actionTypes.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {entityTypes.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 justify-start text-left font-normal',
                        !dateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL d')} – {format(dateRange.to, 'LLL d, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL d, y')
                        )
                      ) : (
                        <span>Date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {logs.length === 0
                    ? 'No recorded activity for this user.'
                    : 'No events match the current filters.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 border-b last:border-0 pb-3 last:pb-0"
                    >
                      <Badge variant={actionBadgeVariant(log.action)} className="w-fit">
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm flex-1 min-w-0">
                        <span className="text-muted-foreground">{log.entity_type}</span>
                        {log.details?.email && (
                          <span className="ml-2 text-xs">({log.details.email})</span>
                        )}
                        {log.details?.message && (
                          <span className="ml-2 text-xs italic">{log.details.message}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
