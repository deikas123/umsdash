import { useState } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useDepartments, DbEmployee } from '@/hr/hooks/useSupabaseData';
import { Search, Plus, Eye, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import EmployeeFormDB from '@/hr/components/EmployeeFormDB';

export default function Employees() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<DbEmployee | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<DbEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbEmployee | null>(null);

  const filtered = employees.filter(emp => {
    const matchesSearch = `${emp.first_name} ${emp.last_name} ${emp.staff_number} ${emp.designation}`
      .toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'all' || emp.department_id === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee.mutateAsync(deleteTarget.id);
      toast({ title: 'Employee removed', description: `${deleteTarget.first_name} ${deleteTarget.last_name} has been removed.`, variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const roleColors: Record<string, string> = {
    gm: 'bg-primary/10 text-primary border-primary/20',
    hr: 'bg-success/10 text-success border-success/20',
    hod: 'bg-warning/10 text-warning border-warning/20',
    staff: 'bg-muted text-muted-foreground border-border',
  };

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return '—';
    return departments.find(d => d.id === deptId)?.name || '—';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage staff records and information · {employees.length} total</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditEmployee(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Staff #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Designation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-foreground">{emp.staff_number}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{emp.departments?.name || getDeptName(emp.department_id)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{emp.designation}</td>
                <td className="px-4 py-3">
                  {emp.status === 'active' ? (
                    <span className="flex items-center gap-1 text-xs text-success"><UserCheck className="h-3 w-3" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-destructive"><UserX className="h-3 w-3" /> {emp.status}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setSelectedEmployee(emp); setShowDetail(true); }} className="text-muted-foreground hover:text-primary transition-colors p-1" title="View">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setEditEmployee(emp); setShowForm(true); }} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(emp)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No employees found</div>}
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmployee.first_name} {selectedEmployee.last_name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[
                  ['Staff Number', selectedEmployee.staff_number],
                  ['ID Number', selectedEmployee.id_number],
                  ['KRA PIN', selectedEmployee.kra_pin],
                  ['NSSF No', selectedEmployee.nssf_no],
                  ['NHIF No', selectedEmployee.nhif_no],
                  ['Department', selectedEmployee.departments?.name || '—'],
                  ['Designation', selectedEmployee.designation],
                  ['Phone', selectedEmployee.phone],
                  ['Email', selectedEmployee.email],
                  ['Bank', `${selectedEmployee.bank_name} - ${selectedEmployee.bank_branch}`],
                  ['Account', selectedEmployee.account_number],
                  ['Bank Code', selectedEmployee.bank_code],
                  ['Join Date', selectedEmployee.join_date],
                  ['Status', selectedEmployee.status],
                  ['Basic Pay', `KES ${Number(selectedEmployee.basic_pay).toLocaleString()}`],
                  ['House Allowance', `KES ${Number(selectedEmployee.house_allowance).toLocaleString()}`],
                  ['Transport Allowance', `KES ${Number(selectedEmployee.transport_allowance).toLocaleString()}`],
                  ['Other Allowance', `KES ${Number(selectedEmployee.other_allowance).toLocaleString()}`],
                  ['Annual Leave Days', `${selectedEmployee.annual_leave_days}`],
                  ['Leave Balance', `${selectedEmployee.annual_leave_days - selectedEmployee.used_leave_days} days`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => { setShowDetail(false); setEditEmployee(selectedEmployee); setShowForm(true); }}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Employee Form */}
      <EmployeeFormDB
        open={showForm}
        onOpenChange={setShowForm}
        employee={editEmployee}
        departments={departments}
        employeeCount={employees.length}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteTarget?.first_name} {deleteTarget?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
