import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgSettings, useUpdateOrgSetting } from '@/hooks/useOrgSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useDocuments';

type Template = { id: string; name: string; category: string; description: string };

export default function DocumentTemplates() {
  const { isAdmin } = useAuth();
  const { settings } = useOrgSettings();
  const updateSetting = useUpdateOrgSetting();
  const { toast } = useToast();
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '' });

  const templates: Template[] = settings.doc_templates ?? [];

  const save = async () => {
    let updated: Template[];
    if (editId) {
      updated = templates.map(t => t.id === editId ? { ...t, ...form } : t);
    } else {
      updated = [...templates, { id: crypto.randomUUID(), ...form }];
    }
    try {
      await updateSetting.mutateAsync({ key: 'doc_templates', value: updated });
      toast({ title: editId ? 'Template updated' : 'Template created' });
      setOpen(false); setEditId(null); setForm({ name: '', category: '', description: '' });
    } catch {
      toast({ title: 'Error saving template', variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    await updateSetting.mutateAsync({ key: 'doc_templates', value: updated });
    toast({ title: 'Template deleted' });
  };

  const handleEdit = (t: Template) => {
    setEditId(t.id); setForm({ name: t.name, category: t.category, description: t.description }); setOpen(true);
  };

  if (!isAdmin) return <AppLayout title="Document Templates"><p className="text-muted-foreground">Admin access required.</p></AppLayout>;

  return (
    <AppLayout title="Document Templates" description="Manage upload templates for consistent document categorisation">
      <PageHeader
        title="Document Templates"
        description="Templates pre-fill the upload form to guide staff on document categorisation."
        actions={<Button size="sm" onClick={() => { setEditId(null); setForm({ name: '', category: '', description: '' }); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Add Template</Button>}
      />
      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No templates yet. Create one to help staff upload consistently.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category || 'No category'}</p>
                    {t.description && <p className="text-sm mt-1">{t.description}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Template' : 'Add Template'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Template Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. KYC Document" /></div>
            <div>
              <Label className="text-xs">Default Category</Label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Description</Label><Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description for uploaders" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={updateSetting.isPending || !form.name}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
