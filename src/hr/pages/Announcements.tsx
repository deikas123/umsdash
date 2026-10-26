import { useState, useEffect } from 'react';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/hr/hooks/useAnnouncements';
import { useMyReadAnnouncementIds, useMarkAnnouncementRead, useReadCountsByAnnouncement } from '@/hr/hooks/useAnnouncementReads';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Megaphone, Plus, Pin, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Announcements() {
  const { user, role: currentRole } = useAuth();
  const isAdmin = currentRole === 'hr_manager' || currentRole === 'gm';
  const { data: announcements = [], isLoading } = useAnnouncements();
  const createA = useCreateAnnouncement();
  const deleteA = useDeleteAnnouncement();
  const { data: readIds } = useMyReadAnnouncementIds();
  const markRead = useMarkAnnouncementRead();
  const { data: readCounts = {} } = useReadCountsByAnnouncement(isAdmin ? announcements.map(a => a.id) : []);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  // Auto-mark all visible announcements as read on view
  useEffect(() => {
    if (!readIds || announcements.length === 0) return;
    for (const a of announcements) {
      if (!readIds.has(a.id)) markRead.mutate(a.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements.length, readIds]);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim() || !user) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    try {
      await createA.mutateAsync({
        title: title.trim(), body: body.trim(),
        audience: 'all', pinned,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: user.id,
      });
      toast({ title: 'Announcement published' });
      setTitle(''); setBody(''); setPinned(false); setExpiresAt(''); setShowForm(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" /> Announcements</h1>
          <p className="page-subtitle">Company-wide notices and updates</p>
        </div>
        {isAdmin && <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Announcement</Button>}
      </div>

      <div className="space-y-3 mt-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No announcements yet.</div>
        ) : announcements.map(a => (
          <div key={a.id} className={`bg-card rounded-lg border shadow-sm p-5 ${a.pinned ? 'border-primary/40' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                  <h3 className="text-base font-semibold text-foreground">{a.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                  <span>Published {new Date(a.published_at).toLocaleString()}</span>
                  {a.expires_at && <span>· Expires {new Date(a.expires_at).toLocaleDateString()}</span>}
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
                      <Eye className="h-3 w-3" /> {readCounts[a.id] || 0} read
                    </span>
                  )}
                </p>
              </div>
              {isAdmin && (
                <button onClick={() => deleteA.mutate(a.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label>Body</Label><Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expires (optional)</Label>
                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 mt-6 cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
                <span className="text-sm">Pin to top</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createA.isPending}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}