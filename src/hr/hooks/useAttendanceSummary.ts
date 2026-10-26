import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MonthlyAttendanceSummary = {
  employee_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  overtime_hours: number; // hours beyond 8h per day
};

/**
 * Fetches attendance for a given month (YYYY-MM) and computes per-employee summary
 * including overtime hours (clock_out - clock_in > 8h) and absent days.
 */
export function useMonthlyAttendanceSummary(month: string) {
  return useQuery({
    queryKey: ['attendance_summary', month],
    enabled: !!month,
    queryFn: async () => {
      const startDate = `${month}-01`;
      const endParts = month.split('-');
      const year = parseInt(endParts[0]);
      const mon = parseInt(endParts[1]);
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('hr_attendance')
        .select('employee_id, date, clock_in, clock_out, status')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const byEmployee: Record<string, MonthlyAttendanceSummary> = {};

      for (const row of (data || []) as any[]) {
        if (!byEmployee[row.employee_id]) {
          byEmployee[row.employee_id] = {
            employee_id: row.employee_id,
            total_days: 0, present_days: 0, absent_days: 0,
            late_days: 0, half_days: 0, leave_days: 0, overtime_hours: 0,
          };
        }
        const s = byEmployee[row.employee_id];
        s.total_days++;

        switch (row.status) {
          case 'present': s.present_days++; break;
          case 'absent': s.absent_days++; break;
          case 'late': s.late_days++; break;
          case 'half_day': s.half_days++; break;
          case 'on_leave': s.leave_days++; break;
        }

        // Calculate overtime: hours worked beyond 8
        if (row.clock_in && row.clock_out) {
          const [inH, inM] = row.clock_in.split(':').map(Number);
          const [outH, outM] = row.clock_out.split(':').map(Number);
          const hoursWorked = (outH + outM / 60) - (inH + inM / 60);
          if (hoursWorked > 8) {
            s.overtime_hours += hoursWorked - 8;
          }
        }
      }

      return byEmployee;
    },
  });
}
