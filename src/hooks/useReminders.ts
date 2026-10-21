import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'completed' | 'snoozed';
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchReminders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      setReminders((data || []) as Reminder[]);
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const createReminder = async (reminder: {
    title: string;
    description?: string;
    reminder_date: string;
    recurrence: string;
  }) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: reminder.title,
        description: reminder.description || null,
        reminder_date: reminder.reminder_date,
        recurrence: reminder.recurrence,
      });
      if (error) throw error;
      toast({ title: 'Reminder created' });
      fetchReminders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Reminder updated' });
      fetchReminders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Reminder deleted' });
      fetchReminders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return { reminders, loading, createReminder, updateReminder, deleteReminder, refetch: fetchReminders };
}
