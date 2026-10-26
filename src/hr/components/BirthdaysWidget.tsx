import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { daysUntilBirthday } from '@/hr/lib/dateHelpers';
import { Cake, Trophy } from 'lucide-react';

export default function BirthdaysWidget() {
  const { data: employees = [] } = useEmployees();
  const today = new Date();

  const withDob = employees
    .filter(e => e.status === 'active' && (e as any).date_of_birth)
    .map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      department: e.departments?.name || '—',
      dob: (e as any).date_of_birth as string,
      daysUntil: daysUntilBirthday((e as any).date_of_birth as string, today),
    }));

  const thisWeek = withDob.filter(e => e.daysUntil <= 7).sort((a, b) => a.daysUntil - b.daysUntil);
  const thisMonth = withDob
    .filter(e => e.daysUntil > 7 && e.daysUntil <= 31)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Work anniversaries — based on join_date
  const withAnniv = employees
    .filter(e => e.status === 'active' && e.join_date)
    .map(e => {
      const daysUntil = daysUntilBirthday(e.join_date, today);
      const yearsCompleted = Math.max(0, today.getFullYear() - new Date(e.join_date).getFullYear() + (daysUntil === 0 ? 0 : daysUntil < 30 ? 1 : 0));
      return {
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        department: e.departments?.name || '—',
        joinDate: e.join_date,
        daysUntil,
        years: yearsCompleted,
      };
    })
    .filter(a => a.daysUntil <= 31 && a.years >= 1)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-5 py-4 border-b">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Cake className="h-4 w-4 text-accent-foreground" /> Birthdays & Anniversaries
        </h2>
      </div>
      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">This Week</p>
          {thisWeek.length === 0 ? (
            <p className="text-xs text-muted-foreground">No birthdays this week</p>
          ) : thisWeek.map(b => (
            <div key={b.id} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.department}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${b.daysUntil === 0 ? 'bg-success/20 text-success font-bold' : 'bg-muted text-muted-foreground'}`}>
                {b.daysUntil === 0 ? '🎂 Today' : `in ${b.daysUntil}d`}
              </span>
            </div>
          ))}
        </div>
        {thisMonth.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Later This Month</p>
            {thisMonth.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between py-1">
                <p className="text-sm text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground">in {b.daysUntil}d</p>
              </div>
            ))}
          </div>
        )}
        {withAnniv.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5"><Trophy className="h-3 w-3" /> Work Anniversaries</p>
            {withAnniv.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.years} year{a.years === 1 ? '' : 's'} · {a.department}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${a.daysUntil === 0 ? 'bg-accent text-accent-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
                  {a.daysUntil === 0 ? `🏆 ${a.years}y today!` : `in ${a.daysUntil}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}