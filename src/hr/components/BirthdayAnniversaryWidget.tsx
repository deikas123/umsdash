// src/hr/components/BirthdayAnniversaryWidget.tsx
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cake, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  hire_date: string | null;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function BirthdayAnniversaryWidget() {
  const today = new Date();
  const mmdd = `${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const currentYear = today.getFullYear();
  const todayStr = today.toISOString().slice(0, 10);
  const notifKey = `umshub_bday_notif_${todayStr}`;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['birthday-anniversary-widget'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, date_of_birth, hire_date');
      return (data as Employee[]) ?? [];
    },
  });

  const birthdays = employees.filter(
    e => e.date_of_birth && e.date_of_birth.slice(5, 10) === mmdd
  );

  const anniversaries = employees.filter(e => {
    if (!e.hire_date) return false;
    const hireYear = parseInt(e.hire_date.slice(0, 4), 10);
    return e.hire_date.slice(5, 10) === mmdd && hireYear < currentYear;
  });

  // Send in-app notifications for HR once per day
  useEffect(() => {
    if (birthdays.length === 0) return;

    let already = false;
    try {
      already = !!localStorage.getItem(notifKey);
    } catch {}
    if (already) return;

    async function sendNotifications() {
      try {
        // Get HR user IDs
        const { data: hrRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['hr', 'hr_manager', 'admin']);

        const hrUserIds = [...new Set((hrRoles ?? []).map((r: any) => r.user_id as string))];
        if (hrUserIds.length === 0) return;

        const inserts = hrUserIds.flatMap(uid =>
          birthdays.map(emp => ({
            user_id: uid,
            title: `🎂 Birthday: ${emp.first_name} ${emp.last_name}`,
            message: `Today is ${emp.first_name}'s birthday. Consider sending them a message!`,
            is_read: false,
          }))
        );

        await supabase.from('in_app_notifications').insert(inserts);

        try { localStorage.setItem(notifKey, '1'); } catch {}
      } catch {}
    }

    sendNotifications();
  }, [birthdays.length, notifKey]);

  if (birthdays.length === 0 && anniversaries.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 mb-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Cake className="h-4 w-4 text-pink-500" />
        Today's Celebrations
      </h3>

      {birthdays.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            🎂 Birthdays
          </p>
          <div className="space-y-1.5">
            {birthdays.map(emp => (
              <div
                key={emp.id}
                className="flex items-center gap-2 rounded-lg bg-pink-50 dark:bg-pink-900/20 px-3 py-2"
              >
                <span className="text-pink-500 text-base">🎂</span>
                <span className="text-sm font-medium text-foreground">
                  {emp.first_name} {emp.last_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {anniversaries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <PartyPopper className="h-3 w-3" /> Work Anniversaries
          </p>
          <div className="space-y-1.5">
            {anniversaries.map(emp => {
              const years = currentYear - parseInt((emp.hire_date ?? '').slice(0, 4), 10);
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2"
                >
                  <span className="text-emerald-500 text-base">🎊</span>
                  <span className="text-sm font-medium text-foreground">
                    {emp.first_name} {emp.last_name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {years} yr{years !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
