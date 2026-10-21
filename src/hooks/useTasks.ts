import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  assignees?: TaskAssignee[];
  files?: TaskFile[];
  creator_name?: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  profile?: { full_name: string; email: string };
}

export interface TaskFile {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_type: 'attachment' | 'submission';
  created_at: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasksList = (tasksData || []) as Task[];

      // Fetch assignees for all tasks
      const taskIds = tasksList.map(t => t.id);
      if (taskIds.length > 0) {
        const { data: assigneesData } = await supabase
          .from('task_assignees')
          .select('*')
          .in('task_id', taskIds);

        // Fetch profiles for assignees
        const userIds = [...new Set((assigneesData || []).map(a => a.user_id))];
        const creatorIds = [...new Set(tasksList.map(t => t.created_by))];
        const allUserIds = [...new Set([...userIds, ...creatorIds])];

        let profileMap = new Map<string, { full_name: string; email: string }>();
        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', allUserIds);
          if (profiles) {
            profileMap = new Map(profiles.map(p => [p.user_id, { full_name: p.full_name, email: p.email }]));
          }
        }

        // Fetch files for all tasks
        const { data: filesData } = await supabase
          .from('task_files')
          .select('*')
          .in('task_id', taskIds);

        // Map assignees and files to tasks
        for (const task of tasksList) {
          task.assignees = (assigneesData || [])
            .filter(a => a.task_id === task.id)
            .map(a => ({ ...a, status: (a as any).status || 'pending', profile: profileMap.get(a.user_id) } as TaskAssignee));
          task.files = ((filesData || []).filter(f => f.task_id === task.id)) as TaskFile[];
          task.creator_name = profileMap.get(task.created_by)?.full_name || 'Unknown';
        }
      }

      setTasks(tasksList);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const sendSmsToUsers = async (userIds: string[], message: string, type: string) => {
    try {
      for (const uid of userIds) {
        const { data: smsPrefs } = await supabase
          .from('sms_preferences')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();

        if (smsPrefs && smsPrefs.sms_enabled && smsPrefs.phone_number) {
          const shouldSend = type === 'task' ? smsPrefs.notify_tasks : smsPrefs.notify_task_updates;
          if (shouldSend) {
            await supabase.functions.invoke('send-sms', {
              body: { mobile: smsPrefs.phone_number, message, type },
            });
          }
        }
      }
    } catch (e) {
      console.error('SMS notification error:', e);
    }
  };

  const createTask = async (task: {
    title: string;
    description?: string;
    due_date?: string;
    priority: string;
    assignee_ids: string[];
  }) => {
    if (!user) return;
    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          due_date: task.due_date || null,
          priority: task.priority as any,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign users
      if (task.assignee_ids.length > 0) {
        const { error: assignError } = await supabase
          .from('task_assignees')
          .insert(task.assignee_ids.map(uid => ({ task_id: newTask.id, user_id: uid })));
        if (assignError) throw assignError;

        // Send SMS to assignees
        sendSmsToUsers(task.assignee_ids, `New task assigned: ${task.title}${task.due_date ? ` (Due: ${new Date(task.due_date).toLocaleDateString()})` : ''}`, 'task');
      }

      toast({ title: 'Task created' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      const { error } = await supabase
        .from('tasks')
        .update({ status: status as any })
        .eq('id', id);
      if (error) throw error;
      toast({ title: `Task marked as ${status.replace('_', ' ')}` });

      // Notify all assignees about status change (except the current user)
      if (task) {
        const assigneeIds = (task.assignees || [])
          .map(a => a.user_id)
          .filter(uid => uid !== user?.id);
        if (assigneeIds.length > 0) {
          const statusLabel = status.replace('_', ' ');
          sendSmsToUsers(assigneeIds, `Task "${task.title}" has been marked as ${statusLabel}`, 'task_update');
        }
        // Also notify creator if current user is not the creator
        if (task.created_by !== user?.id) {
          sendSmsToUsers([task.created_by], `Task "${task.title}" has been marked as ${status.replace('_', ' ')}`, 'task_update');
        }
      }

      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateAssigneeStatus = async (taskId: string, assigneeUserId: string, status: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updateData: any = { status };
      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('task_assignees')
        .update(updateData)
        .eq('task_id', taskId)
        .eq('user_id', assigneeUserId);
      if (error) throw error;
      toast({ title: `Your status updated to ${status.replace('_', ' ')}` });

      // Notify the task creator about this assignee's status change
      if (task && task.created_by !== user?.id) {
        const assigneeName = task.assignees?.find(a => a.user_id === assigneeUserId)?.profile?.full_name || 'An assignee';
        sendSmsToUsers(
          [task.created_by],
          `${assigneeName} updated their status to ${status.replace('_', ' ')} on task "${task.title}"`,
          'task_update'
        );
      }

      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateTask = async (id: string, updates: { title?: string; description?: string; due_date?: string | null; priority?: string }) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updates.title,
          description: updates.description || null,
          due_date: updates.due_date || null,
          priority: updates.priority as any,
        })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Task updated' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Task deleted' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const reassignTask = async (taskId: string, newAssigneeIds: string[]) => {
    try {
      const task = tasks.find(t => t.id === taskId);

      // Remove existing assignees
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      if (deleteError) throw deleteError;

      // Add new assignees
      if (newAssigneeIds.length > 0) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(newAssigneeIds.map(uid => ({ task_id: taskId, user_id: uid })));
        if (insertError) throw insertError;

        // Send SMS to new assignees
        sendSmsToUsers(newAssigneeIds, `Task reassigned to you: ${task?.title || 'Untitled'}`, 'task');
      }

      toast({ title: 'Task reassigned' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const uploadTaskFile = async (taskId: string, file: File, uploadType: 'attachment' | 'submission') => {
    if (!user) return;
    try {
      const filePath = `${user.id}/${taskId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('task_files').insert({
        task_id: taskId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        upload_type: uploadType,
      });
      if (dbError) throw dbError;

      toast({ title: 'File uploaded' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Upload error', description: error.message, variant: 'destructive' });
    }
  };

  const downloadTaskFile = async (file: TaskFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-files')
        .createSignedUrl(file.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({ title: 'Download error', description: error.message, variant: 'destructive' });
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    updateAssigneeStatus,
    deleteTask,
    reassignTask,
    uploadTaskFile,
    downloadTaskFile,
    refetch: fetchTasks,
  };
}
