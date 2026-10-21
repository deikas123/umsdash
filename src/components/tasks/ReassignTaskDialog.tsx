import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';

interface ReassignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  currentAssigneeIds: string[];
  onReassign: (taskId: string, newAssigneeIds: string[]) => Promise<void>;
}

interface StaffProfile {
  user_id: string;
  full_name: string;
  email: string;
}

export function ReassignTaskDialog({ open, onOpenChange, taskId, currentAssigneeIds, onReassign }: ReassignTaskDialogProps) {
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentAssigneeIds);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    setSelectedIds(currentAssigneeIds);
    async function fetchStaff() {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email');
      if (data) setStaffProfiles(data);
    }
    fetchStaff();
  }, [open, currentAssigneeIds]);

  const toggle = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onReassign(taskId, selectedIds);
    setSaving(false);
    onOpenChange(false);
  };

  const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...currentAssigneeIds].sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reassign Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Select users to assign this task to:</p>
          <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
            {staffProfiles.filter(p => p.user_id !== user?.id).map(p => {
              const isCurrentAssignee = currentAssigneeIds.includes(p.user_id);
              return (
                <label key={p.user_id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                  <Checkbox
                    checked={selectedIds.includes(p.user_id)}
                    onCheckedChange={() => toggle(p.user_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{p.full_name}</span>
                    <span className="text-xs text-muted-foreground block truncate">{p.email}</span>
                  </div>
                  {isCurrentAssignee && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <User className="h-3 w-3 mr-1" />Current
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
