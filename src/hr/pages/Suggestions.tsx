import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuggestions, useCreateSuggestion, useUpdateSuggestion, type SuggestionCategory, type SuggestionStatus } from '@/hr/hooks/useSuggestions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Lightbulb, Send, ShieldAlert, Eye, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const categoryLabels: Record<SuggestionCategory, string> = {
  suggestion: '💡 Suggestion',
  complaint: '⚠️ Complaint',
  whistleblower: '🛡️ Whistleblower',
  compliment: '🌟 Compliment',
};

const statusColors: Record<SuggestionStatus, string> = {
  new: 'bg-info/10 text-info border-info/20',
  reviewing: 'bg-warning/10 text-warning border-warning/20',
  actioned: 'bg-success/10 text-success border-success/20',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

export default function Suggestions() {
  const { role: currentRole } = useAuth();
  const isGM = currentRole === 'gm';

  if (isGM) return <GMInbox />;
  return <SubmitView />;
}

function SubmitView() {
  const create = useCreateSuggestion();
  const [category, setCategory] = useState<SuggestionCategory>('suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (subject.trim().length < 3 || body.trim().length < 10) {
      toast({ title: 'Please add more detail', description: 'Subject (3+ chars) and body (10+ chars) are required.', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({ category, subject: subject.trim(), body: body.trim() });
      toast({ title: 'Submitted anonymously', description: 'Your message has been delivered to the GM. Thank you for speaking up.' });
      setSubject(''); setBody(''); setCategory('suggestion');
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary" /> Suggestions & Whistleblower Channel</h1>
        <p className="page-subtitle">Speak up — your message goes directly and only to the General Manager.</p>
      </div>

      <div className="bg-info/5 border border-info/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-info mt-0.5 shrink-0" />
        <div className="text-sm text-foreground">
          <p className="font-semibold mb-1">How this works</p>
          <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
            <li>Only the <strong>General Manager</strong> can read submissions. HR and HODs are excluded.</li>
            <li>The app does not show your identity — your name will not appear next to your message.</li>
            <li>For legal audit only, your user ID is recorded in the database. It is never shown in the app.</li>
            <li>Use Whistleblower for ethical, safety, or legal concerns. Use Complaint for workplace issues.</li>
          </ul>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SuggestionCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as SuggestionCategory[]).map(c => (
                  <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="Short summary..." />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea rows={8} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} placeholder="Describe what you would like to share. Be as specific as possible." />
            <p className="text-xs text-muted-foreground mt-1">{body.length} / 5000 characters</p>
          </div>
          <Button onClick={submit} disabled={create.isPending} className="gap-2 w-full sm:w-auto">
            <Send className="h-4 w-4" /> {create.isPending ? 'Submitting...' : 'Submit Anonymously'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GMInbox() {
  const { data: list = [], isLoading } = useSuggestions();
  const update = useUpdateSuggestion();
  const [filter, setFilter] = useState<'all' | SuggestionStatus>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const filtered = filter === 'all' ? list : list.filter(s => s.status === filter);
  const selectedItem = list.find(s => s.id === selected) ?? null;

  const counts = {
    new: list.filter(s => s.status === 'new').length,
    reviewing: list.filter(s => s.status === 'reviewing').length,
    actioned: list.filter(s => s.status === 'actioned').length,
    dismissed: list.filter(s => s.status === 'dismissed').length,
  };

  const updateStatus = async (status: SuggestionStatus) => {
    if (!selectedItem) return;
    try {
      await update.mutateAsync({ id: selectedItem.id, status, gm_notes: notes || selectedItem.gm_notes || undefined });
      toast({ title: `Marked ${status}` });
      setSelected(null); setNotes('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> Confidential Inbox (GM Only)</h1>
        <p className="page-subtitle">Anonymous suggestions, complaints and whistleblower reports from staff.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['new','reviewing','actioned','dismissed'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`bg-card rounded-lg border p-4 text-left hover:border-primary transition-colors ${filter===s?'border-primary':''}`}>
            <p className="text-xs text-muted-foreground uppercase">{s}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({list.length})</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No submissions in this view.</div>
        ) : filtered.map(s => (
          <button key={s.id} onClick={() => { setSelected(s.id); setNotes(s.gm_notes || ''); }} className="w-full bg-card rounded-lg border shadow-sm p-5 text-left hover:border-primary transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{categoryLabels[s.category]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[s.status]}`}>{s.status}</span>
                  <span className="text-xs text-muted-foreground">· {new Date(s.created_at).toLocaleString()}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{s.subject}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.body}</p>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes(''); } }}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span>{categoryLabels[selectedItem.category]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[selectedItem.status]}`}>{selectedItem.status}</span>
                </DialogTitle>
                <DialogDescription>Submitted {new Date(selectedItem.created_at).toLocaleString()}. Identity hidden.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Subject</Label>
                  <p className="text-base font-semibold text-foreground">{selectedItem.subject}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Body</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{selectedItem.body}</p>
                </div>
                <div>
                  <Label>GM Notes (private)</Label>
                  <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes on action taken..." />
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => updateStatus('dismissed')} disabled={update.isPending}>Dismiss</Button>
                <Button variant="outline" onClick={() => updateStatus('reviewing')} disabled={update.isPending}>Mark Reviewing</Button>
                <Button onClick={() => updateStatus('actioned')} disabled={update.isPending}>Mark Actioned</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}