import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, GraduationCap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

type TargetRoleOption = 'all' | 'admin' | 'staff' | 'customer';

interface TourRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  target_role: string | null;
  is_active: boolean;
  steps: unknown;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface TourForm {
  key: string;
  name: string;
  description: string;
  target_role: TargetRoleOption;
  is_active: boolean;
  display_order: number;
  steps: string;
}

const defaultForm: TourForm = {
  key: '',
  name: '',
  description: '',
  target_role: 'all',
  is_active: true,
  display_order: 1,
  steps: '[]',
};

export default function TourManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<TourRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<TourForm>(defaultForm);

  // Query
  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tour-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_definitions')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as TourRow[];
    },
  });

  // Save mutation (insert or update)
  const saveMutation = useMutation({
    mutationFn: async (payload: TourForm & { id?: string }) => {
      // Parse steps JSON
      let parsedSteps: unknown;
      try {
        parsedSteps = JSON.parse(payload.steps);
      } catch {
        throw new Error('Steps must be a valid JSON array');
      }

      const record = {
        key: payload.key.trim(),
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        target_role: payload.target_role === 'all' ? null : payload.target_role,
        is_active: payload.is_active,
        display_order: payload.display_order,
        steps: parsedSteps as Json,
      };

      if (payload.id) {
        const { error } = await supabase
          .from('tour_definitions')
          .update(record)
          .eq('id', payload.id);
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'tour_definition_updated',
          entity_type: 'tour_definition',
          entity_id: payload.id,
        });
      } else {
        const { data, error } = await supabase
          .from('tour_definitions')
          .insert(record)
          .select()
          .single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'tour_definition_updated',
          entity_type: 'tour_definition',
          entity_id: data.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tours'] });
      toast({ title: editingTour ? 'Tour updated successfully' : 'Tour created successfully' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save tour',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tour_definitions')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'tour_definition_updated',
        entity_type: 'tour_definition',
        entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tours'] });
      toast({ title: 'Tour deleted successfully' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tour',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingTour(null);
  };

  const openAddDialog = () => {
    resetForm();
    setForm((prev) => ({ ...prev, display_order: tours.length + 1 }));
    setDialogOpen(true);
  };

  const openEditDialog = (tour: TourRow) => {
    setEditingTour(tour);
    setForm({
      key: tour.key,
      name: tour.name,
      description: tour.description || '',
      target_role: (tour.target_role as TargetRoleOption) ?? 'all',
      is_active: tour.is_active,
      display_order: tour.display_order,
      steps: JSON.stringify(tour.steps, null, 2),
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.key.trim()) {
      toast({ title: 'Validation Error', description: 'Tour key is required', variant: 'destructive' });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: 'Validation Error', description: 'Tour name is required', variant: 'destructive' });
      return;
    }

    // Validate steps JSON before submitting
    try {
      JSON.parse(form.steps);
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Steps must be a valid JSON array',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate({ ...form, id: editingTour?.id });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId);
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'staff': return 'default' as const;
      case 'customer': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <AppLayout title="Tour Manager" description="Manage onboarding tours for new users">
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Tour Manager"
          description="Create and manage guided tours shown to new users after login"
          actions={
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tour
            </Button>
          }
        />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : tours.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="mx-auto h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No tours yet</p>
              <p className="text-sm">Create your first onboarding tour to guide new users.</p>
              <Button onClick={openAddDialog} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create First Tour
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead className="w-40">Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-32">Target Role</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((tour, i) => (
                    <motion.tr
                      key={tour.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="text-muted-foreground font-mono">
                        {tour.display_order}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tour.key}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tour.name}</p>
                          {tour.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {tour.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(tour.target_role)}>
                          {tour.target_role ?? 'all'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tour.is_active
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400'
                          }
                        >
                          {tour.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(tour)}
                            className="h-7 px-2 gap-1 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteDialog(tour.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTour ? 'Edit Tour' : 'Add New Tour'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tour-key">Key *</Label>
              <Input
                id="tour-key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="e.g., dashboard_intro"
                disabled={!!editingTour}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tour-name">Name *</Label>
              <Input
                id="tour-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Dashboard Introduction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tour-description">Description</Label>
              <Textarea
                id="tour-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this tour..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tour-role">Target Role</Label>
              <Select
                value={form.target_role}
                onValueChange={(val) => setForm({ ...form, target_role: val as TargetRoleOption })}
              >
                <SelectTrigger id="tour-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="tour-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="tour-active">Active</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tour-order">Display Order</Label>
              <Input
                id="tour-order"
                type="number"
                min={1}
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tour-steps">Steps (JSON array)</Label>
              <Textarea
                id="tour-steps"
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder='[{"target": "[data-tour=\"dashboard\"]", "title": "Welcome", "content": "This is your dashboard"}]'
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTour ? (
                'Update Tour'
              ) : (
                'Create Tour'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tour?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Users who have started this tour will lose their progress.
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
