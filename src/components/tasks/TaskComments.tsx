import { useState, useEffect, useRef } from 'react';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Send, Trash2, AtSign } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskCommentsProps {
  taskId: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { comments, loading, addComment, deleteComment } = useTaskComments(taskId);
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name').then(({ data }) => {
      if (data) setAllUsers(data);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const filteredUsers = allUsers.filter(u =>
    u.user_id !== user?.id &&
    u.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  const insertMention = (u: UserProfile) => {
    const lastAt = newComment.lastIndexOf('@');
    const before = lastAt >= 0 ? newComment.substring(0, lastAt) : newComment;
    setNewComment(`${before}@${u.full_name} `);
    setShowMentions(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(@\w[\w\s]*?\b)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.substring(1);
        const matchedUser = allUsers.find(u => u.full_name.toLowerCase() === name.toLowerCase());
        if (matchedUser) {
          return (
            <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1 mx-0.5 bg-primary/10 text-primary">
              {part}
            </Badge>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Discussion ({comments.length})</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : comments.length > 0 ? (
        <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map(c => {
            const isOwn = c.user_id === user?.id;
            return (
              <div key={c.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                  <AvatarFallback className={`text-[10px] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {getInitials(c.profile?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] group relative`}>
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-medium">{c.profile?.full_name}</span>
                    <span className="text-[10px] text-muted-foreground" title={format(new Date(c.created_at), 'PPp')}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={`rounded-xl px-3 py-1.5 text-sm ${isOwn ? 'bg-primary/10 rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    <p className="whitespace-pre-wrap break-words text-[13px]">{renderContent(c.content)}</p>
                  </div>
                  {isOwn && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-2.5 w-2.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>This comment will be permanently removed.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteComment(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <MessageSquare className="h-8 w-8 mx-auto mb-1 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No comments yet. Start the discussion!</p>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => { setShowMentions(!showMentions); setMentionSearch(''); }}>
              <AtSign className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start" side="top">
            <div className="max-h-36 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No users found</p>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.user_id}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                    onClick={() => insertMention(u)}
                  >
                    {u.full_name}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Textarea
          placeholder="Add a comment... use @ to mention someone"
          value={newComment}
          onChange={e => {
            setNewComment(e.target.value);
            const lastAt = e.target.value.lastIndexOf('@');
            if (lastAt >= 0 && showMentions) {
              setMentionSearch(e.target.value.substring(lastAt + 1));
            }
          }}
          className="min-h-[48px] max-h-[100px] text-sm flex-1"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            if (e.key === '@') { setShowMentions(true); setMentionSearch(''); }
          }}
        />
        <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()} className="h-8 w-8 p-0 flex-shrink-0">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
