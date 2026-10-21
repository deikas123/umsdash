import { useState, useEffect, useRef, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Trash2, AtSign, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface UserProfile {
  user_id: string;
  full_name: string;
}

export default function Chat() {
  const { messages, loading, sendMessage, deleteMessage, profiles } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name').then(({ data }) => {
      if (data) setAllUsers(data);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      u.user_id !== user?.id &&
      u.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
  }, [allUsers, mentionSearch, user?.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input, mentions);
    setInput('');
    setMentions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === '@') {
      setShowMentions(true);
      setMentionSearch('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && showMentions) {
      setMentionSearch(val.substring(lastAt + 1));
    }
  };

  const insertMention = (u: UserProfile) => {
    const lastAt = input.lastIndexOf('@');
    const before = lastAt >= 0 ? input.substring(0, lastAt) : input;
    setInput(`${before}@${u.full_name} `);
    setMentions(prev => [...new Set([...prev, u.user_id])]);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "'Today' HH:mm");
    if (isYesterday(d)) return format(d, "'Yesterday' HH:mm");
    return format(d, 'MMM d, HH:mm');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderContent = (content: string, msgMentions: string[]) => {
    if (!msgMentions || msgMentions.length === 0) return content;
    let result = content;
    for (const uid of msgMentions) {
      const name = profiles.get(uid) || allUsers.find(u => u.user_id === uid)?.full_name;
      if (name) {
        result = result.replace(
          new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
          `__MENTION_${uid}__`
        );
      }
    }
    const parts = result.split(/(__MENTION_[a-f0-9-]+__)/g);
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/^__MENTION_([a-f0-9-]+)__$/);
          if (match) {
            const uid = match[1];
            const name = profiles.get(uid) || allUsers.find(u => u.user_id === uid)?.full_name || 'Unknown';
            return (
              <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 mx-0.5 font-medium bg-primary/10 text-primary">
                @{name}
              </Badge>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <AppLayout title="Team Chat" description="Communicate with your team">
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        {/* Messages */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-3/4" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-3 opacity-20" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map(msg => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {getInitials(msg.profile?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-medium">{msg.profile?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className={`group relative rounded-2xl px-3.5 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-muted rounded-tl-md'}`}>
                        <p className="whitespace-pre-wrap break-words">{renderContent(msg.content, msg.mentions)}</p>
                        {isOwn && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete message?</AlertDialogTitle>
                                <AlertDialogDescription>This message will be permanently removed.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMessage(msg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-3">
            <div className="relative flex gap-2">
              <Popover open={showMentions} onOpenChange={setShowMentions}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-10 w-10 p-0 flex-shrink-0"
                    onClick={() => { setShowMentions(!showMentions); setMentionSearch(''); }}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start" side="top">
                  <div className="max-h-48 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No users found</p>
                    ) : (
                      filteredUsers.map(u => (
                        <button
                          key={u.user_id}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                          onClick={() => insertMention(u)}
                        >
                          {u.full_name}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... use @ to tag someone"
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim()} size="sm" className="h-10 w-10 p-0 flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {mentions.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Tagging:</span>
                {mentions.map(uid => (
                  <Badge key={uid} variant="secondary" className="text-[10px] py-0 px-1.5">
                    @{allUsers.find(u => u.user_id === uid)?.full_name || 'Unknown'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
