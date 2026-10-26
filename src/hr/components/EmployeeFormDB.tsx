import { useState, useEffect } from 'react';
import { DbEmployee, DbDepartment, useCreateEmployee, useUpdateEmployee } from '@/hr/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: DbEmployee | null;
  departments: DbDepartment[];
  employeeCount: number;
};

type FormData = {
  staff_number: string; first_name: string; last_name: string; email: string;
  phone: string; id_number: string; kra_pin: string; nssf_no: string; nhif_no: string;
  department_id: string; designation: string; status: string;
  basic_pay: number; house_allowance: number; transport_allowance: number; other_allowance: number;
  bank_name: string; bank_branch: string; account_number: string; bank_code: string;
  join_date: string; annual_leave_days: number; used_leave_days: number;
};

const emptyForm: FormData = {
  staff_number: '', first_name: '', last_name: '', email: '',
  phone: '', id_number: '', kra_pin: '', nssf_no: '', nhif_no: '',
  department_id: '', designation: '', status: 'active',
  basic_pay: 0, house_allowance: 0, transport_allowance: 0, other_allowance: 0,
  bank_name: '', bank_branch: '', account_number: '', bank_code: '',
  join_date: '', annual_leave_days: 21, used_leave_days: 0,
};

export default function EmployeeFormDB({ open, onOpenChange, employee, departments, employeeCount }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  useEffect(() => {
    if (employee) {
      setForm({
        staff_number: employee.staff_number,
        first_name: employee.first_name, last_name: employee.last_name,
        email: employee.email, phone: employee.phone,
        id_number: employee.id_number, kra_pin: employee.kra_pin,
        nssf_no: employee.nssf_no, nhif_no: employee.nhif_no,
        department_id: employee.department_id || '',
        designation: employee.designation, status: employee.status,
        basic_pay: Number(employee.basic_pay), house_allowance: Number(employee.house_allowance),
        transport_allowance: Number(employee.transport_allowance), other_allowance: Number(employee.other_allowance),
        bank_name: employee.bank_name, bank_branch: employee.bank_branch,
        account_number: employee.account_number, bank_code: employee.bank_code,
        join_date: employee.join_date, annual_leave_days: employee.annual_leave_days,
        used_leave_days: employee.used_leave_days,
      });
    } else {
      setForm({ ...emptyForm, staff_number: `UMS${String(employeeCount + 1).padStart(3, '0')}` });
    }
  }, [employee, employeeCount, open]);

  const update = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.department_id) {
      toast({ title: 'Missing fields', description: 'Please fill in required fields.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        ...form,
        department_id: form.department_id || null,
        status: form.status as any,
      };
      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, ...payload });
        toast({ title: 'Employee updated', description: `${form.first_name} ${form.last_name} has been updated.` });
      } else {
        await createEmployee.mutateAsync(payload);
        toast({ title: 'Employee added', description: `${form.first_name} ${form.last_name} has been added.` });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const sections = [
    {
      title: 'Personal Information',
      fields: [
        { key: 'staff_number', label: 'Staff Number', type: 'text' },
        { key: 'first_name', label: 'First Name', type: 'text', required: true },
        { key: 'last_name', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email Address', type: 'email' },
        { key: 'phone', label: 'Phone Number', type: 'text' },
        { key: 'id_number', label: 'National ID Number', type: 'text' },
      ],
    },
    {
      title: 'Statutory Details',
      fields: [
        { key: 'kra_pin', label: 'KRA PIN', type: 'text' },
        { key: 'nssf_no', label: 'NSSF Number', type: 'text' },
        { key: 'nhif_no', label: 'NHIF/SHIF Number', type: 'text' },
      ],
    },
    {
      title: 'Employment Details',
      fields: [
        { key: 'designation', label: 'Designation/Job Title', type: 'text' },
        { key: 'join_date', label: 'Join Date', type: 'date' },
      ],
    },
    {
      title: 'Compensation',
      fields: [
        { key: 'basic_pay', label: 'Basic Pay (KES)', type: 'number' },
        { key: 'house_allowance', label: 'House Allowance (KES)', type: 'number' },
        { key: 'transport_allowance', label: 'Transport/Bus Fare (KES)', type: 'number' },
        { key: 'other_allowance', label: 'Other Allowance (KES)', type: 'number' },
      ],
    },
    {
      title: 'Banking Details',
      fields: [
        { key: 'bank_name', label: 'Bank Name', type: 'text' },
        { key: 'bank_branch', label: 'Bank Branch', type: 'text' },
        { key: 'account_number', label: 'Account Number', type: 'text' },
        { key: 'bank_code', label: 'Bank Code', type: 'text' },
      ],
    },
    {
      title: 'Leave Settings',
      fields: [
        { key: 'annual_leave_days', label: 'Annual Leave Days', type: 'number' },
        { key: 'used_leave_days', label: 'Used Leave Days', type: 'number' },
      ],
    },
  ];

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

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
                      <Select value={form.department_id} onValueChange={v => update('department_id', v)}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
