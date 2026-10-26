import { useState, useEffect } from 'react';
import { Employee, UserRole } from '@/hr/lib/types';
import { departments } from '@/hr/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type EmployeeFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSave: (employee: Employee) => void;
  nextStaffNumber: string;
};

const emptyEmployee: Omit<Employee, 'id'> = {
  staffNumber: '', firstName: '', lastName: '', email: '',
  idNumber: '', kraPin: '', nssfNo: '', nhifNo: '', phone: '',
  department: '', designation: '', role: 'staff',
  basicPay: 0, houseAllowance: 0, transportAllowance: 0, otherAllowance: 0,
  bankName: '', bankBranch: '', accountNumber: '', bankCode: '',
  joinDate: '', status: 'active', annualLeaveDays: 21, usedLeaveDays: 0,
};

export default function EmployeeForm({ open, onOpenChange, employee, onSave, nextStaffNumber }: EmployeeFormProps) {
  const [form, setForm] = useState<Omit<Employee, 'id'>>(emptyEmployee);

  useEffect(() => {
    if (employee) {
      const { id, ...rest } = employee;
      setForm(rest);
    } else {
      setForm({ ...emptyEmployee, staffNumber: nextStaffNumber });
    }
  }, [employee, nextStaffNumber, open]);

  const update = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.department) return;
    onSave({
      id: employee?.id || String(Date.now()),
      ...form,
    });
    onOpenChange(false);
  };

  const sections = [
    {
      title: 'Personal Information',
      fields: [
        { key: 'staffNumber', label: 'Staff Number', type: 'text' },
        { key: 'firstName', label: 'First Name', type: 'text', required: true },
        { key: 'lastName', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email Address', type: 'email' },
        { key: 'phone', label: 'Phone Number', type: 'text' },
        { key: 'idNumber', label: 'National ID Number', type: 'text' },
      ],
    },
    {
      title: 'Statutory Details',
      fields: [
        { key: 'kraPin', label: 'KRA PIN', type: 'text' },
        { key: 'nssfNo', label: 'NSSF Number', type: 'text' },
        { key: 'nhifNo', label: 'NHIF/SHIF Number', type: 'text' },
      ],
    },
    {
      title: 'Employment Details',
      fields: [
        { key: 'designation', label: 'Designation/Job Title', type: 'text' },
        { key: 'joinDate', label: 'Join Date', type: 'date' },
      ],
    },
    {
      title: 'Compensation',
      fields: [
        { key: 'basicPay', label: 'Basic Pay (KES)', type: 'number' },
        { key: 'houseAllowance', label: 'House Allowance (KES)', type: 'number' },
        { key: 'transportAllowance', label: 'Transport/Bus Fare (KES)', type: 'number' },
        { key: 'otherAllowance', label: 'Other Allowance (KES)', type: 'number' },
      ],
    },
    {
      title: 'Banking Details',
      fields: [
        { key: 'bankName', label: 'Bank Name', type: 'text' },
        { key: 'bankBranch', label: 'Bank Branch', type: 'text' },
        { key: 'accountNumber', label: 'Account Number', type: 'text' },
        { key: 'bankCode', label: 'Bank Code', type: 'text' },
      ],
    },
    {
      title: 'Leave Settings',
      fields: [
        { key: 'annualLeaveDays', label: 'Annual Leave Days', type: 'number' },
        { key: 'usedLeaveDays', label: 'Used Leave Days', type: 'number' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 pb-4">
            {sections.map(section => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">{section.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map(field => (
                    <div key={field.key}>
                      <Label className="text-xs text-muted-foreground">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        type={field.type}
                        value={(form as any)[field.key] ?? ''}
                        onChange={e => update(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
                {section.title === 'Employment Details' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Department <span className="text-destructive">*</span></Label>
                      <Select value={form.department} onValueChange={v => update('department', v)}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">System Role</Label>
                      <Select value={form.role} onValueChange={v => update('role', v)}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gm">General Manager</SelectItem>
                          <SelectItem value="hr">HR Manager</SelectItem>
                          <SelectItem value="hod">Head of Department</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={form.status} onValueChange={v => update('status', v)}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{employee ? 'Update Employee' : 'Add Employee'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
