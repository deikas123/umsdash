import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  profile?: { full_name: string };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();
  const channelId = useRef(`chat-realtime-${Math.random().toString(36).slice(2)}`);

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return new Map<string, string>();
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    data?.forEach(p => map.set(p.user_id, p.full_name));
    return map;
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const profileMap = await fetchProfiles(userIds);
      setProfiles(prev => new Map([...prev, ...profileMap]));

      setMessages(
        (data || []).map(m => ({
          ...m,
          mentions: (m.mentions as string[]) || [],
          profile: { full_name: profileMap.get(m.user_id) || 'Unknown' },
        }))
      );
    } catch (error: any) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const sendMessage = async (content: string, mentions: string[] = []) => {
    if (!user || !content.trim()) return;
    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        content: content.trim(),
        mentions,
      });
      if (error) throw error;

      // Send in-app notifications to mentioned users
      if (mentions.length > 0) {
        try {
          await Promise.all(
            mentions.map((mentionedUserId) =>
              supabase.from('in_app_notifications').insert({
                user_id: mentionedUserId,
                title: 'You were mentioned in chat',
                message: content.trim(),
                type: 'mention',
                link: '/docs/chat',
                is_read: false,
              })
            )
          );
        } catch (notifError) {
          console.error('Failed to send mention notifications:', notifError);
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return { messages, loading, sendMessage, deleteMessage, profiles };
}
