/**
 * IT → People → Access Groups
 * IT-specific groups (it_access_groups). Members link to hr_employees.
 */
import { useState } from 'react';
import { useItAccessGroups, useCreateItAccessGroup, useUpdateItAccessGroup, useDeleteItAccessGroup, useItEmployeeGroups, useAddEmployeeToGroup, useRemoveEmployeeFromGroup, DbItAccessGroup } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export default function AccessGroups() {
  const { data: groups = [], isLoading } = useItAccessGroups();
  const { data: memberships = [] } = useItEmployeeGroups();
  const { data: employees = [] } = useEmployees();   // ← HR employees
  const create = useCreateItAccessGroup();
  const update = useUpdateItAccessGroup();
  const del = useDeleteItAccessGroup();
  const addMember = useAddEmployeeToGroup();
  const removeMember = useRemoveEmployeeFromGroup();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItAccessGroup | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<DbItAccessGroup | null>(null);
  const [manageGroup, setManageGroup] = useState<DbItAccessGroup | null>(null);
  const [addEmpId, setAddEmpId] = useState('');
  const [saving, setSaving] = useState(false);

  const memberCount = (gid: string) => memberships.filter(m => m.group_id === gid).length;

  const groupMembers = (gid: string) =>
    memberships
      .filter(m => m.group_id === gid)
      .map(m => employees.find(e => e.id === m.employee_id))
      .filter(Boolean) as typeof employees;

  const availableToAdd = (gid: string) =>
    employees.filter(e => !memberships.some(m => m.group_id === gid && m.employee_id === e.id));

  const openCreate = () => { setEditTarget(null); setForm({ name: '', description: '' }); setShowForm(true); };
  const openEdit = (g: DbItAccessGroup) => { setEditTarget(g); setForm({ name: g.name, description: g.description || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editTarget) { await update.mutateAsync({ id: editTarget.id, ...form }); toast({ title: 'Group updated' }); }
      else { await create.mutateAsync(form); toast({ title: 'Group created' }); }
      setShowForm(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleAddMember = async () => {
    if (!addEmpId || !manageGroup) return;
    try {
      await addMember.mutateAsync({ employee_id: addEmpId, group_id: manageGroup.id });
      setAddEmpId('');
      toast({ title: 'Member added' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleRemoveMember = async (empId: string) => {
    if (!manageGroup) return;
    try { await removeMember.mutateAsync({ employee_id: empId, group_id: manageGroup.id }); toast({ title: 'Member removed' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Access Groups</h1>
          <p className="page-subtitle">IT access groups · members pulled from HR employee list · {groups.length} groups</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Add Group</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.id} className="bg-card rounded-lg border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{g.name}</h3>
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setManageGroup(g); setAddEmpId(''); }} className="text-muted-foreground hover:text-primary p-1" title="Manage members">
                  <Users className="h-4 w-4" />
                </button>
                <button onClick={() => openEdit(g)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => setDeleteTarget(g)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{memberCount(g.id)} members</p>
            <div className="flex flex-wrap gap-1">
              {groupMembers(g.id).slice(0, 4).map(e => (
                <Badge key={e.id} variant="secondary" className="text-xs">{e.first_name} {e.last_name}</Badge>
              ))}
              {memberCount(g.id) > 4 && (
                <Badge variant="outline" className="text-xs">+{memberCount(g.id) - 4} more</Badge>
              )}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted-foreground col-span-3 py-8 text-center">No access groups yet. Create one to get started.</p>
        )}
      </div>

      {/* Group form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Group' : 'Add Group'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage members — using HR employee list */}
      <Dialog open={!!manageGroup} onOpenChange={() => setManageGroup(null)}>
        <DialogContent className="max-w-lg">
          {manageGroup && (
            <>
              <DialogHeader><DialogTitle>Members — {manageGroup.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Select value={addEmpId} onValueChange={setAddEmpId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Add an employee…" /></SelectTrigger>
                    <SelectContent>
                      {availableToAdd(manageGroup.id).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} — {(e as any).hr_departments?.name ?? e.department_id ?? '—'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} disabled={!addEmpId}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {groupMembers(manageGroup.id).map(e => (
                    <Badge
                      key={e.id}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveMember(e.id)}
                      title="Click to remove"
                    >
                      {e.first_name} {e.last_name} ×
                    </Badge>
                  ))}
                  {groupMembers(manageGroup.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>Delete {deleteTarget?.name}? All memberships will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (!deleteTarget) return; await del.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
