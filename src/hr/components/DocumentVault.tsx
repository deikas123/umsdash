import { useState } from 'react';
import { useEmployeeDocuments, useCreateEmployeeDocument, useDeleteEmployeeDocument, getDocumentStatus, daysUntilExpiry } from '@/hr/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileText, Trash2, Download, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DOC_TYPES = [
  { v: 'contract', l: 'Employment Contract' },
  { v: 'work_permit', l: 'Work Permit' },
  { v: 'id_copy', l: 'ID Copy' },
  { v: 'kra_pin', l: 'KRA PIN Certificate' },
  { v: 'certification', l: 'Certification / Qualification' },
  { v: 'medical', l: 'Medical Certificate' },
  { v: 'nssf_shif', l: 'NSSF / SHIF Card' },
  { v: 'other', l: 'Other' },
];

function statusPill(status: ReturnType<typeof getDocumentStatus>, days: number | null) {
  if (status === 'expired') return <span className="text-xs px-2 py-0.5 rounded-full border bg-destructive/10 text-destructive border-destructive/30">Expired {days !== null ? `${Math.abs(days)}d ago` : ''}</span>;
  if (status === 'expiring') return <span className="text-xs px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/30">Expires in {days}d</span>;
  if (status === 'valid') return <span className="text-xs px-2 py-0.5 rounded-full border bg-success/10 text-success border-success/30">Valid</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">No expiry</span>;
}

export default function DocumentVault({ employeeId }: { employeeId: string }) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } = useEmployeeDocuments(employeeId);
  const createDoc = useCreateEmployeeDocument();
  const deleteDoc = useDeleteEmployeeDocument();

  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => { setDocType('contract'); setTitle(''); setIssueDate(''); setExpiryDate(''); setNotes(''); setFile(null); };

  const handleUpload = async () => {
    if (!file) { toast({ title: 'No file selected', variant: 'destructive' }); return; }
    if (!title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${employeeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('employee-documents').upload(path, file);
      if (upErr) throw upErr;
      await createDoc.mutateAsync({
        employee_id: employeeId,
        document_type: docType,
        title: title.trim(),
        file_url: path,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notes: notes || null,
        uploaded_by: user.id,
      });
      toast({ title: 'Document uploaded' });
      reset();
      setShowForm(false);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage.from('employee-documents').createSignedUrl(path, 60);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Document Vault</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Upload</Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Title', 'Type', 'Issued', 'Expires', 'Status', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No documents uploaded yet.</td></tr>
            ) : docs.map(d => {
              const st = getDocumentStatus(d.expiry_date);
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium text-foreground">{d.title}</td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize">{DOC_TYPES.find(t => t.v === d.document_type)?.l || d.document_type}</td>
                  <td className="px-3 py-2.5 text-foreground tabular-nums">{d.issue_date || '—'}</td>
                  <td className="px-3 py-2.5 text-foreground tabular-nums">{d.expiry_date || '—'}</td>
                  <td className="px-3 py-2.5">{statusPill(st, daysUntilExpiry(d.expiry_date))}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => handleDownload(d.file_url, d.title)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Download"><Download className="h-4 w-4" /></button>
                    <button onClick={() => deleteDoc.mutate({ id: d.id, filePath: d.file_url })} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Employment Contract 2024" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              {expiryDate && new Date(expiryDate) < new Date() && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> This date is in the past — the document will be marked as expired.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}