import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSurveys, useActiveSurveys, useMyParticipation,
  useCreateSurvey, useUpdateSurvey, useDeleteSurvey,
  useSubmitSurveyResponse, useSurveyResponses, useSurveyParticipantCount,
  type Survey, type SurveyQuestion,
} from '@/hr/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ClipboardCheck, Plus, Trash2, Send, BarChart3, CheckCircle2, Lock, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function genId() { return Math.random().toString(36).slice(2, 9); }

export default function Surveys() {
  const { role: currentRole } = useAuth();
  const isAdmin = currentRole === 'hr_manager' || currentRole === 'gm';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" /> Pulse Surveys</h1>
        <p className="page-subtitle">Quick anonymous surveys to measure team engagement.</p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="take" className="mt-2">
          <TabsList>
            <TabsTrigger value="take">Take Surveys</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="take" className="mt-4"><TakeSurveys /></TabsContent>
          <TabsContent value="manage" className="mt-4"><ManageSurveys /></TabsContent>
          <TabsContent value="results" className="mt-4"><Results /></TabsContent>
        </Tabs>
      ) : (
        <div className="mt-2"><TakeSurveys /></div>
      )}
    </div>
  );
}

function TakeSurveys() {
  const { data: surveys = [], isLoading } = useActiveSurveys();
  const { data: participated = new Set<string>() } = useMyParticipation();
  const [open, setOpen] = useState<Survey | null>(null);

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (surveys.length === 0) return <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No active surveys right now.</div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.map(s => {
          const done = participated.has(s.id);
          return (
            <div key={s.id} className="bg-card rounded-lg border shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                {done && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Done</span>}
              </div>
              {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
              <p className="text-xs text-muted-foreground mb-3">{(s.questions as any[])?.length ?? 0} question(s) · ~{Math.max(1, Math.ceil(((s.questions as any[])?.length ?? 0) * 0.5))} min</p>
              <Button onClick={() => setOpen(s)} disabled={done} variant={done ? 'outline' : 'default'} className="gap-2 w-full">
                {done ? 'Already submitted' : <><Send className="h-4 w-4" /> Take Survey</>}
              </Button>
            </div>
          );
        })}
      </div>
      <TakeDialog survey={open} onClose={() => setOpen(null)} />
    </>
  );
}

function TakeDialog({ survey, onClose }: { survey: Survey | null; onClose: () => void }) {
  const submit = useSubmitSurveyResponse();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const questions = (survey?.questions ?? []) as SurveyQuestion[];

  const handleSubmit = async () => {
    if (!survey) return;
    try {
      await submit.mutateAsync({ survey_id: survey.id, answers });
      toast({ title: 'Submitted anonymously', description: 'Your responses have been recorded with no link to your identity.' });
      setAnswers({}); onClose();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!survey} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {survey && (
          <>
            <DialogHeader>
              <DialogTitle>{survey.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2"><Lock className="h-3 w-3" /> Your responses are fully anonymous.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              {questions.map((q, idx) => (
                <div key={q.id}>
                  <Label className="block mb-2"><span className="text-muted-foreground mr-2">Q{idx + 1}.</span> {q.text}</Label>
                  {q.type === 'rating' && (
                    <div className="flex gap-2">
                      {Array.from({ length: q.scale ?? 5 }, (_, i) => i + 1).map(n => (
                        <button key={n} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: n }))} className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${answers[q.id] === n ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                          <Star className={`h-4 w-4 ${answers[q.id] === n ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  )}
                  {q.type === 'choice' && (
                    <div className="space-y-1.5">
                      {q.options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted">
                          <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <Textarea rows={3} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submit.isPending}>{submit.isPending ? 'Submitting...' : 'Submit Anonymously'}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageSurveys() {
  const { data: surveys = [] } = useSurveys();
  const create = useCreateSurvey();
  const update = useUpdateSurvey();
  const del = useDeleteSurvey();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([{ id: genId(), type: 'rating', text: 'How are you feeling about work this week?', scale: 5 }]);
  const [reminderChannel, setReminderChannel] = useState<'none'|'inapp'|'sms'|'both'>('inapp');
  const [reminderDay, setReminderDay] = useState<string>('');
  const [reminderInterval, setReminderInterval] = useState<string>('');

  const addQ = (type: SurveyQuestion['type']) => {
    if (type === 'rating') setQuestions(q => [...q, { id: genId(), type: 'rating', text: '', scale: 5 }]);
    else if (type === 'text') setQuestions(q => [...q, { id: genId(), type: 'text', text: '' }]);
    else setQuestions(q => [...q, { id: genId(), type: 'choice', text: '', options: ['Yes', 'No'] }]);
  };

  const handleCreate = async () => {
    if (!title.trim() || questions.length === 0) {
      toast({ title: 'Title and at least one question are required', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        questions: questions as any,
        status: 'draft',
        reminder_channel: reminderChannel,
        reminder_day_of_month: reminderDay ? Number(reminderDay) : null,
        reminder_interval_days: reminderInterval ? Number(reminderInterval) : null,
      } as any);
      toast({ title: 'Survey created', description: 'Open it and click "Activate" to send to staff.' });
      setOpen(false); setTitle(''); setDescription('');
      setQuestions([{ id: genId(), type: 'rating', text: 'How are you feeling about work this week?', scale: 5 }]);
      setReminderChannel('inapp'); setReminderDay(''); setReminderInterval('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Survey</Button>
      </div>

      <div className="space-y-3">
        {surveys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No surveys yet.</div>
        ) : surveys.map(s => (
          <div key={s.id} className="bg-card rounded-lg border shadow-sm p-5 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-success/10 text-success border-success/20' : s.status === 'draft' ? 'bg-muted text-muted-foreground border-border' : 'bg-info/10 text-info border-info/20'}`}>{s.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{(s.questions as any[])?.length ?? 0} questions · created {new Date(s.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              {s.status === 'draft' && <Button size="sm" onClick={() => update.mutate({ id: s.id, status: 'active' })}>Activate</Button>}
              {s.status === 'active' && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: s.id, status: 'closed' })}>Close</Button>}
              <button onClick={() => { if (confirm(`Delete "${s.title}" and all responses?`)) del.mutate(s.id); }} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Pulse Survey</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Q1 Engagement Pulse" /></div>
            <div><Label>Description (optional)</Label><Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="border rounded-md p-3 bg-muted/30 space-y-3">
              <Label className="text-sm font-semibold">Monthly Reminder Settings</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Notify staff via</Label>
                  <Select value={reminderChannel} onValueChange={(v) => setReminderChannel(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No reminders</SelectItem>
                      <SelectItem value="inapp">In-app badge only</SelectItem>
                      <SelectItem value="sms">SMS only</SelectItem>
                      <SelectItem value="both">In-app + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Day of month (1-28)</Label>
                  <Input type="number" min={1} max={28} value={reminderDay} onChange={e => setReminderDay(e.target.value)} className="mt-1" placeholder="e.g. 1" />
                </div>
                <div>
                  <Label className="text-xs">Repeat every (days)</Label>
                  <Input type="number" min={1} max={60} value={reminderInterval} onChange={e => setReminderInterval(e.target.value)} className="mt-1" placeholder="e.g. 7" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Day-of-month sends on that date each month. Repeat-every-N-days sends recurring nudges to staff who haven't responded. Set both, either, or neither.</p>
            </div>
            <div>
              <Label>Questions</Label>
              <div className="space-y-3 mt-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-card border">{q.type}</span>
                      <button onClick={() => setQuestions(qs => qs.filter(x => x.id !== q.id))} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <Input value={q.text} onChange={e => setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))} placeholder="Question text..." />
                    {q.type === 'choice' && (
                      <Input value={q.options.join(', ')} onChange={e => setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) } as SurveyQuestion : x))} placeholder="Option 1, Option 2, Option 3" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => addQ('rating')}>+ Rating</Button>
                <Button size="sm" variant="outline" onClick={() => addQ('choice')}>+ Multiple Choice</Button>
                <Button size="sm" variant="outline" onClick={() => addQ('text')}>+ Free Text</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>Create Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Results() {
  const { data: surveys = [] } = useSurveys();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const survey = surveys.find(s => s.id === selectedId) ?? null;
  const { data: responses = [] } = useSurveyResponses(selectedId);
  const { data: participantCount = 0 } = useSurveyParticipantCount(selectedId);

  const aggregates = useMemo(() => {
    if (!survey) return [];
    const qs = (survey.questions ?? []) as SurveyQuestion[];
    return qs.map(q => {
      const all = responses.map(r => (r.answers as any)?.[q.id]).filter(v => v !== undefined && v !== null && v !== '');
      if (q.type === 'rating') {
        const nums = all.map(Number).filter(n => !isNaN(n));
        const avg = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
        const dist: Record<number, number> = {};
        for (const n of nums) dist[n] = (dist[n] || 0) + 1;
        return { q, kind: 'rating' as const, count: nums.length, avg, dist };
      }
      if (q.type === 'choice') {
        const dist: Record<string, number> = {};
        for (const v of all) dist[String(v)] = (dist[String(v)] || 0) + 1;
        return { q, kind: 'choice' as const, count: all.length, dist };
      }
      return { q, kind: 'text' as const, answers: all.map(String) };
    });
  }, [survey, responses]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Label className="m-0">Select survey:</Label>
        <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choose..." /></SelectTrigger>
          <SelectContent>
            {surveys.map(s => <SelectItem key={s.id} value={s.id}>{s.title} ({s.status})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!survey ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border"><BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />Select a survey to view results.</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-5">
            <h2 className="text-lg font-semibold text-foreground">{survey.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{participantCount} participant{participantCount === 1 ? '' : 's'} · {responses.length} response{responses.length === 1 ? '' : 's'}</p>
          </div>
          {aggregates.map(({ q, kind, ...rest }) => (
            <div key={q.id} className="bg-card rounded-lg border shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{q.text}</h3>
              {kind === 'rating' && (
                <div>
                  <p className="text-3xl font-bold text-primary mb-2">{(rest as any).avg.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {(q as any).scale ?? 5}</span></p>
                  <div className="space-y-1.5">
                    {Object.entries((rest as any).dist).sort((a, b) => Number(b[0]) - Number(a[0])).map(([rating, count]) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-xs w-6 text-muted-foreground">{rating}</span>
                        <div className="flex-1 h-3 bg-muted rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${((count as number) / (rest as any).count) * 100}%` }} /></div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {kind === 'choice' && (
                <div className="space-y-1.5">
                  {Object.entries((rest as any).dist).map(([opt, count]) => (
                    <div key={opt} className="flex items-center gap-2">
                      <span className="text-sm w-32 truncate">{opt}</span>
                      <div className="flex-1 h-3 bg-muted rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${((count as number) / (rest as any).count) * 100}%` }} /></div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count as number}</span>
                    </div>
                  ))}
                </div>
              )}
              {kind === 'text' && (
                <div className="space-y-2">
                  {(rest as any).answers.length === 0 ? <p className="text-sm text-muted-foreground italic">No responses yet.</p>
                    : (rest as any).answers.map((a: string, i: number) => <p key={i} className="text-sm bg-muted/50 rounded p-2 border">{a}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}