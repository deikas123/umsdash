import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCategories, Document } from '@/hooks/useDocuments';

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  onSaved: () => void;
}

export function EditDocumentDialog({ open, onOpenChange, document, onSaved }: EditDocumentDialogProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    is_private: false,
  });
  const [saving, setSaving] = useState(false);
  const { categories } = useCategories();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setForm({
        title: document.title,
        description: document.description || '',
        category_id: document.category_id,
        is_private: document.is_private,
      });
    }
  }, [open, document]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id,
          is_private: form.is_private,
        })
        .eq('id', document.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Document updated successfully' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update document', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="mb-1 block">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1 block">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div>
            <Label className="mb-1 block">Category</Label>
            <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Private (admin-only)</Label>
            <Switch checked={form.is_private} onCheckedChange={v => setForm(f => ({ ...f, is_private: v }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
