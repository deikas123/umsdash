import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useNotificationCounts() {
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  const fetchCounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');
      if (tasksCount) setPendingTasksCount(tasksCount);

      const { count: remindersCount } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (remindersCount) setPendingRemindersCount(remindersCount);

      if (isAdmin) {
        const { count: deletionsCount } = await supabase
          .from('deletion_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (deletionsCount) setPendingDeletionsCount(deletionsCount);
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    
    const tasksChannel = supabase
      .channel('tasks-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchCounts())
      .subscribe();

    const remindersChannel = supabase
      .channel('reminders-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => fetchCounts())
      .subscribe();

    const deletionsChannel = supabase
      .channel('deletions-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_requests' }, () => fetchCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(remindersChannel);
      supabase.removeChannel(deletionsChannel);
    };
  }, [user]);

  return {
    pendingTasksCount,
    pendingRemindersCount,
    pendingDeletionsCount,
    loading,
    refetch: fetchCounts,
  };
}
