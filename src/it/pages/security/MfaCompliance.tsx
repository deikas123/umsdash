import { useItMfaCompliance, useUpsertItMfaCompliance } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function MfaCompliance() {
  const { data: mfa = [], isLoading } = useItMfaCompliance();
  const { data: employees = [] } = useEmployees();
  const upsert = useUpsertItMfaCompliance();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id:'',enrolled:true,method:'' });
  const [saving, setSaving] = useState(false);

  const enrolled = mfa.filter(m=>m.enrolled).length;
  const pct = employees.length > 0 ? Math.round((enrolled / employees.length) * 100) : 0;
  const empName = (id:string) => employees.find(e=>e.id===id) ? `${employees.find(e=>e.id===id)!.first_name} ${employees.find(e=>e.id===id)!.last_name}` : '—';
  const mfaMap = Object.fromEntries(mfa.map(m=>[m.employee_id,m]));

  const handleSave = async () => {
    if (!form.employee_id) { toast({ title:'Select employee', variant:'destructive' }); return; }
    setSaving(true);
    try { await upsert.mutateAsync({ employee_id:form.employee_id, enrolled:form.enrolled, method:form.method, enrolled_at:form.enrolled?new Date().toISOString():null }); toast({ title:'MFA record updated' }); setShowForm(false); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">MFA Compliance</h1><p className="page-subtitle">Multi-factor authentication status per employee</p></div>
        <Button className="gap-2" onClick={()=>setShowForm(true)}>Update MFA Record</Button>
      </div>

      <div className="bg-card rounded-lg border p-6 shadow-sm mb-6 max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">MFA Enrolment</h2>
          <span className="text-2xl font-bold">{pct}%</span>
        </div>
        <Progress value={pct} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">{enrolled} of {employees.length} employees enrolled</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Employee','MFA Enrolled','Method','Enrolled At','Last Verified'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {employees.map(emp=>{
              const rec = mfaMap[emp.id];
              return (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p><p className="text-xs text-muted-foreground">{emp.email}</p></td>
                  <td className="px-4 py-3">{rec ? (rec.enrolled ? <CheckCircle className="h-4 w-4 text-success"/> : <XCircle className="h-4 w-4 text-destructive"/>) : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-sm">{rec?.method||'—'}</td>
                  <td className="px-4 py-3 text-sm">{rec?.enrolled_at ? new Date(rec.enrolled_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm">{rec?.last_verified ? new Date(rec.last_verified).toLocaleDateString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employees.length===0&&<div className="text-center py-12 text-muted-foreground">No employees in directory.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update MFA Record</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label className="text-xs">Employee</Label><Select value={form.employee_id} onValueChange={v=>setForm(f=>({...f,employee_id:v}))}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Enrolled</Label><Select value={form.enrolled?'yes':'no'} onValueChange={v=>setForm(f=>({...f,enrolled:v==='yes'}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Method (e.g. Authenticator App, SMS)</Label><Input value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
