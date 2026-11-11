import { useState } from 'react';
import { useItHardwareInventory, useCreateItHardware, useUpdateItHardware, useDeleteItHardware, DbItHardware } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

type HwCategory = 'desktop'|'laptop'|'printer'|'router'|'switch'|'server'|'monitor'|'ups'|'external_drive'|'phone'|'other';
type HwStatus   = 'in_use'|'in_storage'|'under_repair'|'retired'|'lost';

type FormState = { asset_id:string; name:string; category:HwCategory; manufacturer:string; model:string; serial_number:string; purchase_date:string; purchase_cost:number; assigned_to:string; location:string; status:HwStatus; warranty_expiry:string; notes:string };
const blank: FormState = { asset_id:'',name:'',category:'other',manufacturer:'',model:'',serial_number:'',purchase_date:'',purchase_cost:0,assigned_to:'',location:'',status:'in_storage',warranty_expiry:'',notes:'' };

const statusClass = (s:string) => ({ in_use:'bg-green-100 text-green-800',in_storage:'bg-blue-100 text-blue-800',under_repair:'bg-yellow-100 text-yellow-800',retired:'bg-muted text-muted-foreground',lost:'bg-red-100 text-red-800' }[s] ?? '');

export default function HardwareInventory() {
  const { data: items = [], isLoading } = useItHardwareInventory();
  const create = useCreateItHardware();
  const update = useUpdateItHardware();
  const del = useDeleteItHardware();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItHardware | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [deleteTarget, setDeleteTarget] = useState<DbItHardware | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(i => `${i.asset_id} ${i.name} ${i.manufacturer} ${i.model} ${i.category}`.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (i: DbItHardware) => { setEditTarget(i); setForm({ asset_id:i.asset_id,name:i.name,category:i.category,manufacturer:i.manufacturer,model:i.model,serial_number:i.serial_number,purchase_date:i.purchase_date??'',purchase_cost:i.purchase_cost,assigned_to:i.assigned_to,location:i.location,status:i.status,warranty_expiry:i.warranty_expiry??'',notes:i.notes??'' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.asset_id || !form.name) { toast({ title: 'Asset ID and name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, purchase_date: form.purchase_date || null, warranty_expiry: form.warranty_expiry || null };
      if (editTarget) { await update.mutateAsync({ id: editTarget.id, ...payload }); toast({ title: 'Item updated' }); }
      else { await create.mutateAsync(payload); toast({ title: 'Item added' }); }
      setShowForm(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const categories: HwCategory[] = ['desktop','laptop','printer','router','switch','server','monitor','ups','external_drive','phone','other'];
  const statuses: HwStatus[] = ['in_use','in_storage','under_repair','retired','lost'];

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Hardware Inventory</h1><p className="page-subtitle">All IT assets — laptops, printers, routers, monitors, UPS… · {items.length} items</p></div>
        <Button className="gap-2" onClick={() => { setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Asset</Button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">{['Asset ID','Name','Category','Manufacturer/Model','Location','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm">{i.asset_id}</td>
                <td className="px-4 py-3 text-sm font-medium">{i.name}</td>
                <td className="px-4 py-3 text-sm capitalize">{i.category.replace('_',' ')}</td>
                <td className="px-4 py-3 text-sm">{i.manufacturer} {i.model}</td>
                <td className="px-4 py-3 text-sm">{i.location || '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(i.status)}`}>{i.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(i)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No assets found.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Asset' : 'Add Asset'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {([['asset_id','Asset ID','text'],['name','Name','text'],['manufacturer','Manufacturer','text'],['model','Model','text'],['serial_number','Serial Number','text'],['assigned_to','Assigned To','text'],['location','Location','text'],['purchase_date','Purchase Date','date'],['warranty_expiry','Warranty Expiry','date'],['notes','Notes','text']] as [keyof FormState,string,string][]).map(([k,l,t])=>(
              <div key={k} className={k==='notes'?'col-span-2':''}><Label className="text-xs">{l}</Label><Input type={t} value={form[k] as string} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
            ))}
            <div><Label className="text-xs">Purchase Cost (KES)</Label><Input type="number" value={form.purchase_cost} onChange={e=>setForm(f=>({...f,purchase_cost:Number(e.target.value)}))} /></div>
            <div><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v as HwCategory}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c.replace('_',' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as HwStatus}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map(s=><SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={()=>setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Asset</AlertDialogTitle><AlertDialogDescription>Remove {deleteTarget?.name}?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async()=>{if(!deleteTarget)return;await del.mutateAsync(deleteTarget.id);setDeleteTarget(null);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
