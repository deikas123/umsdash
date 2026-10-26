import { useState } from 'react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useEmployees, useProfiles } from '@/hr/hooks/useSupabaseData';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Departments() {
  const { role: currentRole } = useAuth();
  const { data: departments = [], isLoading } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const { data: profiles = [] } = useProfiles();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const isHrOrGm = currentRole === 'hr_manager' || currentRole === 'gm';

  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hodUserId, setHodUserId] = useState('');

  const openCreate = () => { setEditDept(null); setName(''); setDescription(''); setHodUserId(''); setShowForm(true); };
  const openEdit = (dept: any) => {
    setEditDept(dept); setName(dept.name); setDescription(dept.description || ''); setHodUserId(dept.hod_user_id || ''); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    try {
      const payload = { name: name.trim(), description: description.trim() || null, hod_user_id: hodUserId || null };
      if (editDept) {
        await updateDept.mutateAsync({ id: editDept.id, ...payload });
        toast({ title: 'Department updated' });
      } else {
        await createDept.mutateAsync(payload);
        toast({ title: 'Department created' });
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage organizational departments · {departments.length} total</p>
        </div>
        {isHrOrGm && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => {
          const deptEmployees = employees.filter(e => e.department_id === dept.id && e.status === 'active');
          const hodProfile = profiles.find(p => p.user_id === dept.hod_user_id);
          return (
            <div key={dept.id} className="bg-card rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground">{deptEmployees.length} members</p>
                  </div>
                </div>
                {isHrOrGm && (
                  <button onClick={() => openEdit(dept)} className="text-muted-foreground hover:text-primary p-1">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dept.description && <p className="text-xs text-muted-foreground mb-3">{dept.description}</p>}
              {hodProfile && (
                <p className="text-xs text-primary mb-3">HOD: {hodProfile.full_name}</p>
              )}
              <div className="space-y-1">
                {deptEmployees.slice(0, 4).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-accent-foreground">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <span className="text-foreground">{emp.first_name} {emp.last_name}</span>
                  </div>
                ))}
                {deptEmployees.length > 4 && (
                  <p className="text-xs text-muted-foreground ml-8">+{deptEmployees.length - 4} more</p>
                )}
              </div>
            </div>
          );
        })}
        {departments.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No departments found. Add departments to get started.</div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Department Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. Finance" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Head of Department (HOD)</Label>
              <Select value={hodUserId} onValueChange={setHodUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select HOD (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createDept.isPending || updateDept.isPending}>
              {editDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
