import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/hr/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export type MessageThread = Tables<'message_threads'>;
export type Message = Tables<'messages'>;

/** Threads where the current user participates, with the other user's profile and last message. */
export function useMyThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_threads', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: threads, error } = await supabase
        .from('hr_message_threads')
        .select('*')
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;

      const otherIds = Array.from(new Set((threads || []).map(t => t.user_a === user!.id ? t.user_b : t.user_a)));
      if (otherIds.length === 0) return [] as Array<MessageThread & { other: { user_id: string; full_name: string | null; avatar_url: string | null } | null; unread: number }>;

      // Fetch other users' profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Fetch unread counts (messages addressed to me, not yet read)
      const threadIds = (threads || []).map(t => t.id);
      const { data: unreadMsgs } = await supabase
        .from('hr_messages')
        .select('thread_id, sender_id, read_at')
        .in('thread_id', threadIds)
        .neq('sender_id', user!.id)
        .is('read_at', null);
      const unreadCounts: Record<string, number> = {};
      for (const m of unreadMsgs || []) unreadCounts[m.thread_id] = (unreadCounts[m.thread_id] || 0) + 1;

      return (threads || []).map(t => {
        const otherId = t.user_a === user!.id ? t.user_b : t.user_a;
        return {
          ...t,
          other: profileMap.get(otherId) ?? { user_id: otherId, full_name: 'Unknown User', avatar_url: null },
          unread: unreadCounts[t.id] || 0,
        };
      });
    },
  });
}

/** Total unread message count for the current user (across all threads). */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread_message_count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Find all my threads first
      const { data: threads } = await supabase
        .from('hr_message_threads')
        .select('id')
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
      const ids = (threads || []).map(t => t.id);
      if (ids.length === 0) return 0;
      const { count, error } = await supabase
        .from('hr_messages')
        .select('*', { count: 'exact', head: true })
        .in('thread_id', ids)
        .neq('sender_id', user!.id)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Get or create a thread between current user and another user. Constraint requires user_a < user_b. */
export function useGetOrCreateThread() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      if (otherUserId === user.id) throw new Error("Cannot message yourself");
      // Sort the two ids so user_a < user_b (enforced by CHECK constraint)
      const [user_a, user_b] = [user.id, otherUserId].sort();

      // Try to find existing
      const { data: existing } = await supabase
        .from('hr_message_threads')
        .select('*')
        .eq('user_a', user_a)
        .eq('user_b', user_b)
        .maybeSingle();
      if (existing) return existing as MessageThread;

      // Otherwise insert
      const { data, error } = await supabase
        .from('hr_message_threads')
        .insert({ user_a, user_b })
        .select()
        .single();
      if (error) throw error;
      return data as MessageThread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_threads'] });
    },
  });
}

/** Messages in a thread with realtime subscription. */
export function useThreadMessages(threadId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['thread_messages', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_messages')
        .select('*')
        .eq('thread_id', threadId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['thread_messages', threadId] });
          qc.invalidateQueries({ queryKey: ['my_threads', user?.id] });
          qc.invalidateQueries({ queryKey: ['unread_message_count', user?.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc, user?.id]);

  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('hr_messages')
        .insert({ thread_id: input.thread_id, sender_id: user.id, body: input.body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['thread_messages', vars.thread_id] });
      qc.invalidateQueries({ queryKey: ['my_threads', user?.id] });
    },
  });
}

/** Mark every message in a thread (not sent by me) as read. */
export function useMarkThreadRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (thread_id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('hr_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', thread_id)
        .neq('sender_id', user.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_threads', user?.id] });
      qc.invalidateQueries({ queryKey: ['unread_message_count', user?.id] });
    },
  });
}

/** Searchable list of users (from profiles) for starting new chats. */
export function useUserDirectory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_directory', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, employee_id')
        .neq('user_id', user!.id)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}