import { useState } from 'react';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '@/hr/hooks/useHolidays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function HolidayCalendar() {
  const { data: holidays = [], isLoading } = useHolidays();
  const createH = useCreateHoliday();
  const deleteH = useDeleteHoliday();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!date || !name.trim()) {
      toast({ title: 'Missing fields', description: 'Date and name are required.', variant: 'destructive' });
      return;
    }
    try {
      await createH.mutateAsync({ date, name: name.trim(), is_recurring: false });
      toast({ title: 'Holiday added' });
      setDate(''); setName('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteH.mutateAsync(id);
      toast({ title: 'Holiday removed' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  // Group by year
  const byYear: Record<string, typeof holidays> = {};
  for (const h of holidays) {
    const y = h.date.slice(0, 4);
    (byYear[y] ||= []).push(h);
  }
  const years = Object.keys(byYear).sort();

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border shadow-sm p-5">
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Add Holiday
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Holiday Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. Mashujaa Day" />
          </div>
          <Button onClick={handleAdd} disabled={createH.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground">Loading...</div>
      ) : years.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground bg-card rounded-lg border">No holidays configured.</div>
      ) : (
        years.map(year => (
          <div key={year} className="bg-card rounded-lg border shadow-sm">
            <div className="px-5 py-3 border-b flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{year}</h3>
              <span className="text-xs text-muted-foreground">({byYear[year].length} holidays)</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {byYear[year].map(h => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-foreground tabular-nums w-32">{h.date}</td>
                    <td className="px-4 py-2.5 text-foreground">{h.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{h.is_recurring ? 'Recurring annually' : 'One-time'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleDelete(h.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}