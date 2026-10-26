import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyThreads, useThreadMessages, useSendMessage, useGetOrCreateThread, useMarkThreadRead, useUserDirectory } from '@/hr/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Plus, Search, Check, CheckCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function initials(name?: string | null) {
  if (!name) return '??';
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '??';
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

export default function Messages() {
  const { user } = useAuth();
  const { data: threads = [], isLoading } = useMyThreads();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  // Auto-select first thread when list loads
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) setActiveThreadId(threads[0].id);
  }, [threads, activeThreadId]);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" /> Messages</h1>
        <p className="page-subtitle">Direct messages with colleagues, HR, and managers.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr]" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        {/* Threads sidebar */}
        <div className="border-r flex flex-col min-h-0">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            <Button size="sm" variant="outline" onClick={() => setShowNewChat(true)} className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> New</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowNewChat(true)}>Start chatting</Button>
              </div>
            ) : threads.map(t => (
              <button key={t.id} onClick={() => setActiveThreadId(t.id)} className={`w-full text-left px-4 py-3 border-b flex items-center gap-3 hover:bg-muted/50 transition-colors ${activeThreadId === t.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">{initials(t.other?.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{t.other?.full_name || 'Unknown'}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(t.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.unread > 0 ? <span className="text-primary font-semibold">{t.unread} new message{t.unread === 1 ? '' : 's'}</span> : 'Tap to open'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex flex-col min-h-0">
          {activeThread ? (
            <ChatPanel threadId={activeThread.id} otherName={activeThread.other?.full_name ?? 'Unknown'} otherInitials={initials(activeThread.other?.full_name)} myUserId={user!.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start messaging.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} onCreated={(threadId) => { setActiveThreadId(threadId); setShowNewChat(false); }} />
    </div>
  );
}

function ChatPanel({ threadId, otherName, otherInitials, myUserId }: { threadId: string; otherName: string; otherInitials: string; myUserId: string }) {
  const { data: messages = [], isLoading } = useThreadMessages(threadId);
  const send = useSendMessage();
  const markRead = useMarkThreadRead();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Mark thread read on open + when new messages arrive
  useEffect(() => {
    markRead.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, messages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await send.mutateAsync({ thread_id: threadId, body });
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
      setText(body);
    }
  };

  return (
    <>
      <div className="px-5 py-3 border-b flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">{otherInitials}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{otherName}</p>
          <p className="text-xs text-muted-foreground">Direct message</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello 👋</p>
        ) : messages.map(m => {
          const mine = m.sender_id === myUserId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border rounded-bl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {mine && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t p-3 flex items-center gap-2 shrink-0">
        <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a message..." />
        <Button onClick={handleSend} disabled={!text.trim() || send.isPending} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </>
  );
}

function NewChatDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (threadId: string) => void }) {
  const { data: users = [] } = useUserDirectory();
  const getOrCreate = useGetOrCreateThread();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.full_name ?? '').toLowerCase().includes(q));
  }, [users, search]);

  const startChat = async (userId: string) => {
    try {
      const thread = await getOrCreate.mutateAsync(userId);
      onCreated(thread.id);
      setSearch('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Start a new chat</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No users found.</p>
          ) : filtered.map(u => (
            <button key={u.user_id} onClick={() => startChat(u.user_id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-left">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">{initials(u.full_name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.full_name || 'Unnamed'}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}