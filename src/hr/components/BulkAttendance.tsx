import { useState, useMemo } from 'react';
import { DbEmployee } from '@/hr/hooks/useSupabaseData';
import { DbAttendance, useCreateAttendance } from '@/hr/hooks/useAttendanceData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Users } from 'lucide-react';
import { smsAttendanceMarkedAbsent } from '@/hr/lib/smsTemplates';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', on_leave: 'On Leave',
};

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-destructive/10 text-destructive',
  late: 'bg-warning/10 text-warning',
  half_day: 'bg-info/10 text-info',
  on_leave: 'bg-muted text-muted-foreground',
};

type BulkRow = {
  employee_id: string;
  clock_in: string;
  clock_out: string;
  status: AttendanceStatus;
  notes: string;
};

interface Props {
  employees: DbEmployee[];
  date: string;
  existingAttendance: DbAttendance[];
  onDone: () => void;
}

export default function BulkAttendance({ employees, date, existingAttendance, onDone }: Props) {
  const createAttendance = useCreateAttendance();
  const [submitting, setSubmitting] = useState(false);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const alreadyRecorded = new Set(existingAttendance.map(a => a.employee_id));
  const unrecorded = activeEmployees.filter(e => !alreadyRecorded.has(e.id));

  const [rows, setRows] = useState<Record<string, BulkRow>>(() => {
    const init: Record<string, BulkRow> = {};
    unrecorded.forEach(e => {
      init[e.id] = { employee_id: e.id, clock_in: '08:00', clock_out: '17:00', status: 'present', notes: '' };
    });
    return init;
  });

  const updateRow = (id: string, field: keyof BulkRow, value: string) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const setAllStatus = (status: AttendanceStatus) => {
    setRows(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[id] = { ...next[id], status }; });
      return next;
    });
  };

  const handleSubmit = async () => {
    const entries = Object.values(rows);
    if (entries.length === 0) { toast({ title: 'No employees to record' }); return; }
    setSubmitting(true);
    try {
      for (const row of entries) {
        await createAttendance.mutateAsync({
          employee_id: row.employee_id,
          date,
          clock_in: row.clock_in || null,
          clock_out: row.clock_out || null,
          status: row.status,
          notes: row.notes,
        });
      }
      // SMS employees marked absent
      for (const entry of entries) {
        if (entry.status === 'absent') {
          const emp = employees.find(e => e.id === entry.employee_id);
          if (emp?.phone) smsAttendanceMarkedAbsent(emp.phone, emp.first_name, date);
        }
      }
      toast({ title: 'Bulk attendance saved', description: `${entries.length} records created.` });
      onDone();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (unrecorded.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-10 w-10 mx-auto mb-2 text-success" />
        <p>All active employees already have attendance records for this date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unrecorded.length} employees without records</p>
        <div className="flex gap-2">
          <span className="text-xs text-muted-foreground self-center">Set all:</span>
          {(Object.keys(statusLabels) as AttendanceStatus[]).map(s => (
            <Button key={s} variant="outline" size="sm" className="text-xs h-7" onClick={() => setAllStatus(s)}>
              {statusLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground">Employee</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-24">Clock In</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-24">Clock Out</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-32">Status</th>
              <th className="text-left p-2 font-medium text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {unrecorded.map(emp => {
              const row = rows[emp.id];
              if (!row) return null;
              return (
                <tr key={emp.id} className="hover:bg-muted/30">
                  <td className="p-2 font-medium whitespace-nowrap">
                    {emp.first_name} {emp.last_name}
                    <span className="text-xs text-muted-foreground ml-1">({emp.staff_number})</span>
                  </td>
                  <td className="p-2">
                    <Input type="time" value={row.clock_in} onChange={e => updateRow(emp.id, 'clock_in', e.target.value)} className="h-8 text-xs" />
                  </td>
                  <td className="p-2">
                    <Input type="time" value={row.clock_out} onChange={e => updateRow(emp.id, 'clock_out', e.target.value)} className="h-8 text-xs" />
                  </td>
                  <td className="p-2">
                    <Select value={row.status} onValueChange={v => updateRow(emp.id, 'status', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusLabels) as AttendanceStatus[]).map(s => (
                          <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input value={row.notes} onChange={e => updateRow(emp.id, 'notes', e.target.value)} className="h-8 text-xs" placeholder="Optional" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        <Users className="h-4 w-4 mr-1" />
        {submitting ? 'Saving...' : `Save All ${unrecorded.length} Records`}
      </Button>
    </div>
  );
}
