import { useState, useEffect } from 'react';
import { DbEmployee, DbDepartment, useCreateEmployee, useUpdateEmployee } from '@/hr/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, UserPlus, Loader2, ArrowRight } from 'lucide-react';
import type { AppRole } from '@/contexts/AuthContext';

type AppId = 'docs' | 'ops' | 'hr';

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

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'staff',      label: 'Staff' },
  { value: 'hod',        label: 'Head of Department' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'gm',         label: 'General Manager' },
  { value: 'it_staff',   label: 'IT Staff' },
  { value: 'it_admin',   label: 'IT Admin' },
  { value: 'admin',      label: 'System Admin' },
];

const APP_OPTIONS: { id: AppId; label: string }[] = [
  { id: 'docs', label: 'Document Vault' },
  { id: 'ops',  label: 'Operations Hub' },
  { id: 'hr',   label: 'HR Hub' },
];

export default function EmployeeFormDB({ open, onOpenChange, employee, departments, employeeCount }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // Step 2 — system account creation
  const [step, setStep] = useState<'form' | 'account' | 'done'>('form');
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null);
  const [acctEmail, setAcctEmail] = useState('');
  const [acctPassword, setAcctPassword] = useState('');
  const [acctRole, setAcctRole] = useState<AppRole>('staff');
  const [acctApps, setAcctApps] = useState<AppId[]>(['docs', 'hr']);
  const [acctCreating, setAcctCreating] = useState(false);
  const [createdUserName, setCreatedUserName] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset everything when dialog closes
      setStep('form');
      setNewEmployeeId(null);
      setAcctEmail('');
      setAcctPassword('');
      setAcctRole('staff');
      setAcctApps(['docs', 'hr']);
    }
  }, [open]);

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
      const payload = { ...form, department_id: form.department_id || null, status: form.status as any };
      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, ...payload });
        toast({ title: 'Employee updated', description: `${form.first_name} ${form.last_name} has been updated.` });
        onOpenChange(false);
      } else {
        const result = await createEmployee.mutateAsync(payload);
        const empId = (result as any)?.id ?? null;
        setNewEmployeeId(empId);
        setAcctEmail(form.email);
        setCreatedUserName(`${form.first_name} ${form.last_name}`);
        toast({ title: 'Employee added', description: `${form.first_name} ${form.last_name} has been added.` });
        // Go to step 2 — offer to create system account
        setStep('account');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateAccount = async () => {
    if (!acctEmail || !acctPassword) {
      toast({ title: 'Email and password are required', variant: 'destructive' });
      return;
    }
    if (acctPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setAcctCreating(true);
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: acctEmail,
        password: acctPassword,
        options: { data: { full_name: createdUserName } },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create auth user');

      const newUserId = authData.user.id;

      // 2. Create/update profile linked to HR employee
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { user_id: newUserId, full_name: createdUserName, email: acctEmail, hr_employee_id: newEmployeeId },
          { onConflict: 'user_id' },
        );
      if (profileError) throw profileError;

      // 3. Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: acctRole });
      if (roleError) throw roleError;

      // 4. Grant app access
      if (acctApps.length > 0) {
        await supabase.from('user_app_access').upsert(
          acctApps.map(appId => ({ user_id: newUserId, app_id: appId, granted_by: null })),
          { onConflict: 'user_id,app_id' },
        );
      }

      // 5. Audit log
      await supabase.from('audit_logs').insert({
        action: 'user_created',
        entity_type: 'user',
        entity_id: newUserId,
        details: { email: acctEmail, role: acctRole, apps: acctApps, source: 'hr_employee_form' },
      });

      toast({ title: `Account created for ${createdUserName}`, description: `${acctEmail} · ${acctRole}` });
      setStep('done');
    } catch (err: any) {
      toast({ title: 'Account creation failed', description: err.message, variant: 'destructive' });
    } finally {
      setAcctCreating(false);
    }
  };

  const toggleApp = (appId: AppId) => {
    setAcctApps(prev => prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]);
  };

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">

        {/* ── STEP 1: Employee form ───────────────────────────────────────── */}
        {step === 'form' && (
          <>
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
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : employee
                    ? 'Update Employee'
                    : <><span>Add Employee</span><ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 2: Create system account ──────────────────────────────── */}
        {step === 'account' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Create System Account</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{createdUserName}</span> has been added.
                    Set up their login credentials and permissions now.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Login credentials */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">Login Credentials</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email address</Label>
                    <Input
                      type="email"
                      value={acctEmail}
                      onChange={e => setAcctEmail(e.target.value)}
                      placeholder="employee@umskenya.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Temporary password</Label>
                    <PasswordInput
                      value={acctPassword}
                      onChange={e => setAcctPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">The employee should change this on first login.</p>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">System Role</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAcctRole(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        acctRole === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
                      {acctRole === opt.value && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* App access */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">Module Access</h3>
                <div className="grid grid-cols-3 gap-3">
                  {APP_OPTIONS.map(app => (
                    <label
                      key={app.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        acctApps.includes(app.id)
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-background border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <Checkbox
                        checked={acctApps.includes(app.id)}
                        onCheckedChange={() => toggleApp(app.id)}
                      />
                      <span className="text-sm font-medium">{app.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Skip for now
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Done without account</Button>
                <Button onClick={handleCreateAccount} disabled={acctCreating || !acctEmail || !acctPassword}>
                  {acctCreating
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                    : <><UserPlus className="h-4 w-4 mr-2" />Create Account</>}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Success ─────────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>All done!</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
              <div>
                <p className="text-lg font-semibold">{createdUserName}</p>
                <p className="text-sm text-muted-foreground mt-1">Employee record created and system account set up.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <Badge variant="secondary">{acctEmail}</Badge>
                <Badge variant="outline" className="capitalize">{acctRole.replace('_', ' ')}</Badge>
                {acctApps.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
              </div>
              <p className="text-xs text-muted-foreground">
                They can now log in at <span className="font-medium">dash.umskenya.com</span> with their email and the temporary password.
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
