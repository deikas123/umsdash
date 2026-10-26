import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { useAttendance, useCreateAttendance, useUpdateAttendance } from '@/hr/hooks/useAttendanceData';
import { ClipboardList, Plus, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import BulkAttendance from '@/hr/components/BulkAttendance';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-destructive/10 text-destructive',
  late: 'bg-warning/10 text-warning',
  half_day: 'bg-info/10 text-info',
  on_leave: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', on_leave: 'On Leave',
};

export default function Attendance() {
  const { role: currentRole } = useAuth();
  const canManage = currentRole === 'hr_manager' || currentRole === 'gm';
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data: employees = [] } = useEmployees();
  const { data: attendance = [], isLoading } = useAttendance(selectedDate);
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();

  const [showBulk, setShowBulk] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '', clock_in: '08:00', clock_out: '17:00', status: 'present' as AttendanceStatus, notes: '',
  });

  const resetForm = () => {
    setFormData({ employee_id: '', clock_in: '08:00', clock_out: '17:00', status: 'present', notes: '' });
    setEditingRecord(null);
  };

  const handleSubmit = async () => {
    if (!formData.employee_id) { toast({ title: 'Select an employee', variant: 'destructive' }); return; }
    try {
      if (editingRecord) {
        await updateAttendance.mutateAsync({
          id: editingRecord.id,
          clock_in: formData.clock_in || null,
          clock_out: formData.clock_out || null,
          status: formData.status,
          notes: formData.notes,
        });
        toast({ title: 'Attendance updated' });
      } else {
        await createAttendance.mutateAsync({
          employee_id: formData.employee_id,
          date: selectedDate,
          clock_in: formData.clock_in || null,
          clock_out: formData.clock_out || null,
          status: formData.status,
          notes: formData.notes,
        });
        toast({ title: 'Attendance recorded' });
      }
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (record: any) => {
    setFormData({
      employee_id: record.employee_id,
      clock_in: record.clock_in || '08:00',
      clock_out: record.clock_out || '17:00',
      status: record.status,
      notes: record.notes || '',
    });
    setEditingRecord(record);
    setShowForm(true);
  };

  // Summary counts
  const summary = attendance.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" /> Attendance Management
          </h1>
          <p className="text-muted-foreground mt-1">Track daily employee attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setShowBulk(true)}>
                <Users className="h-4 w-4 mr-1" /> Bulk Record
              </Button>
              <Button onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Record
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(statusLabels) as AttendanceStatus[]).map(s => (
          <div key={s} className={`rounded-lg p-3 text-center ${statusColors[s]}`}>
            <div className="text-2xl font-bold">{summary[s] || 0}</div>
            <div className="text-xs font-medium">{statusLabels[s]}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Clock In</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Clock Out</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                {canManage && <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendance.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No attendance records for this date</td></tr>
              ) : attendance.map(record => (
                <tr key={record.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {record.employees ? `${record.employees.first_name} ${record.employees.last_name}` : '—'}
                  </td>
                  <td className="p-3">{record.clock_in || '—'}</td>
                  <td className="p-3">{record.clock_out || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status as AttendanceStatus] || ''}`}>
                      {statusLabels[record.status as AttendanceStatus] || record.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{record.notes || '—'}</td>
                  {canManage && (
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Bulk Attendance — {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <BulkAttendance
            employees={employees}
            date={selectedDate}
            existingAttendance={attendance}
            onDone={() => setShowBulk(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Attendance' : 'Record Attendance'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingRecord && (
              <div>
                <Label>Employee</Label>
                <Select value={formData.employee_id} onValueChange={v => setFormData(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === 'active').map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.staff_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Clock In</Label><Input type="time" value={formData.clock_in} onChange={e => setFormData(p => ({ ...p, clock_in: e.target.value }))} /></div>
              <div><Label>Clock Out</Label><Input type="time" value={formData.clock_out} onChange={e => setFormData(p => ({ ...p, clock_out: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as AttendanceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabels) as AttendanceStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></div>
            <Button onClick={handleSubmit} className="w-full" disabled={createAttendance.isPending || updateAttendance.isPending}>
              {editingRecord ? 'Update' : 'Save'} Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
