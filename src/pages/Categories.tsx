import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, FolderOpen, Tag } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface CategoryForm {
  name: string;
  description: string;
  display_order: number;
  color: string;
}

const CATEGORY_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

export default function Categories() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categories, loading } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryForm>({
    name: '',
    description: '',
    display_order: 0,
    color: '#3b82f6',
  });

  const resetForm = () => {
    setForm({ name: '', description: '', display_order: 0, color: '#3b82f6' });
    setEditingId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setForm((prev) => ({
      ...prev,
      display_order: categories.length + 1,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (category: typeof categories[0]) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
      color: category.color || '#3b82f6',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('document_categories')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            display_order: form.display_order,
            color: form.color,
          })
          .eq('id', editingId);

        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'category_updated',
          entity_type: 'document_category',
          entity_id: editingId,
          details: { name: form.name },
        });

        toast({ title: 'Category updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('document_categories')
          .insert({
            name: form.name.trim(),
            description: form.description.trim() || null,
            display_order: form.display_order,
            color: form.color,
          })
          .select()
          .single();

        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'category_created',
          entity_type: 'document_category',
          entity_id: data.id,
          details: { name: form.name },
        });

        toast({ title: 'Category created successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save category',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      // Check if category has documents
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', deletingId);

      if (count && count > 0) {
        toast({
          title: 'Cannot delete category',
          description: `This category contains ${count} document(s). Move or delete them first.`,
          variant: 'destructive',
        });
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'category_deleted',
        entity_type: 'document_category',
        entity_id: deletingId,
      });

      toast({ title: 'Category deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <AppLayout title="Category Management" description="Manage document categories">
      {/* Header action */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {loading ? '...' : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </span>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FolderOpen className="mx-auto h-14 w-14 mb-4 opacity-30" />
            <p className="font-medium text-base">No categories yet</p>
            <p className="text-sm mt-1">Create your first category to start organizing documents.</p>
            <Button className="mt-4" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, idx) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color swatch */}
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(category.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: category.color || '#3b82f6', color: category.color || '#3b82f6' }}>
                      Order #{category.display_order}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      <FolderOpen className="inline h-3 w-3 mr-1" />
                      Documents
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Invoices"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                min={1}
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Category Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === colorOption.value
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    onClick={() => setForm({ ...form, color: colorOption.value })}
                    title={colorOption.name}
                  />
                ))}
              </div>
              {/* Preview */}
              <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.color }} />
                <span className="text-sm font-medium">{form.name || 'Category Name'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                'Update Category'
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Categories with documents cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
