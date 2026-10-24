import { useState, useEffect, useRef, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, AtSign, MessageCircle, Users } from 'lucide-react';
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
  const [onlineCount] = useState(1);
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
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
    return format(d, 'MMM d, HH:mm');
  };

  const formatDateDivider = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Group messages by date for date dividers
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: typeof messages }[] = [];
    let currentDate = '';
    messages.forEach(msg => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: dateKey, msgs: [] });
      }
      groups[groups.length - 1].msgs.push(msg);
    });
    return groups;
  }, [messages]);

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
              <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 mx-0.5 font-medium bg-primary/20 text-primary">
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
      {/* Page header */}
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Chat</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Communicate with your team in real time</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="h-3 w-3" />
              <span className="text-xs">{allUsers.length} members</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
          {/* Chat header bar */}
          <div className="border-b px-4 py-2.5 flex items-center gap-2 bg-muted/20">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">General</span>
            <span className="text-xs text-muted-foreground ml-1">• {messages.length} messages</span>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className={`h-3 w-20 ${i % 2 === 0 ? 'ml-auto' : ''}`} />
                      <Skeleton className={`h-10 ${i % 2 === 0 ? 'w-48' : 'w-64'} rounded-2xl`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  icon={MessageCircle}
                  title="No messages yet"
                  description="Start the conversation with your team!"
                />
              </div>
            ) : (
              groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Date divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                      {formatDateDivider(group.msgs[0].created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-3">
                    {group.msgs.map(msg => {
                      const isOwn = msg.user_id === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                            <AvatarFallback className={`text-xs font-medium ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                              {getInitials(msg.profile?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-medium text-foreground">
                                {isOwn ? 'You' : (msg.profile?.full_name || 'Unknown')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                            </div>
                            <div className={`group relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm'
                                : 'bg-muted rounded-tl-sm'
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{renderContent(msg.content, msg.mentions)}</p>
                              {/* Hover timestamp */}
                              <span className={`absolute -bottom-4 ${isOwn ? 'right-0' : 'left-0'} text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
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
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-3 bg-muted/10">
            {mentions.length > 0 && (
              <div className="flex gap-1 mb-2 flex-wrap items-center">
                <span className="text-[10px] text-muted-foreground">Tagging:</span>
                {mentions.map(uid => (
                  <Badge
                    key={uid}
                    variant="secondary"
                    className="text-[10px] py-0 px-1.5 cursor-pointer hover:bg-destructive/10"
                    onClick={() => setMentions(prev => prev.filter(id => id !== uid))}
                  >
                    @{allUsers.find(u => u.user_id === uid)?.full_name || 'Unknown'} ×
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <Popover open={showMentions} onOpenChange={setShowMentions}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 flex-shrink-0 rounded-full"
                    onClick={() => { setShowMentions(!showMentions); setMentionSearch(''); }}
                    title="Mention someone"
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
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                          onClick={() => insertMention(u)}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(u.full_name)}
                            </AvatarFallback>
                          </Avatar>
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
                placeholder="Type a message… press @ to mention someone"
                className="flex-1 rounded-full bg-background"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0 rounded-full"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
