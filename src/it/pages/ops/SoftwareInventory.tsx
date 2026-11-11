import { useState } from 'react';
import { useItSoftwareInventory, useCreateItSoftware, useDeleteItSoftware, useItSoftwareCatalogue, useCreateItSoftwareCatalogue, useDeleteItSoftwareCatalogue, useItDevices } from '@/it/hooks/useItData';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type SwStatus = 'installed'|'missing'|'update_available'|'unauthorised';
const statusVariant = (s: string) => ({ installed:'default',missing:'secondary',update_available:'secondary',unauthorised:'destructive' } as Record<string,any>)[s] ?? 'outline';

export default function SoftwareInventory() {
  const { data: inventory = [], isLoading } = useItSoftwareInventory();
  const { data: catalogue = [] } = useItSoftwareCatalogue();
  const { data: devices = [] } = useItDevices();
  const createInv = useCreateItSoftware();
  const deleteInv = useDeleteItSoftware();
  const createCat = useCreateItSoftwareCatalogue();
  const deleteCat = useDeleteItSoftwareCatalogue();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [invForm, setInvForm] = useState({ device_id: '', name: '', version: '', status: 'installed' as SwStatus });
  const [catForm, setCatForm] = useState({ name: '', vendor: '', category: '', current_version: '', approved: true });
  const [saving, setSaving] = useState(false);

  const filtered = inventory.filter(i => `${i.name} ${i.version}`.toLowerCase().includes(search.toLowerCase()));
  const devName = (id: string) => devices.find(d => d.id === id)?.asset_id ?? '—';

  const handleSaveInv = async () => {
    if (!invForm.device_id || !invForm.name) { toast({ title: 'Device and name required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await createInv.mutateAsync(invForm); toast({ title: 'Software record added' }); setShowForm(false); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleSaveCat = async () => {
    if (!catForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await createCat.mutateAsync(catForm); toast({ title: 'Catalogue entry added' }); setShowCatForm(false); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Software Inventory</h1><p className="page-subtitle">Installed software and approved catalogue</p></div>
      <Tabs defaultValue="inventory">
        <TabsList className="mb-6"><TabsTrigger value="inventory">Device Inventory</TabsTrigger><TabsTrigger value="catalogue">Approved Catalogue</TabsTrigger></TabsList>

        <TabsContent value="inventory">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div>
            <Button className="gap-2" onClick={()=>setShowForm(true)}><Plus className="h-4 w-4" /> Add Record</Button>
          </div>
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50">{['Device','Name','Version','Status','Last Seen',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(i=>(
                  <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm">{devName(i.device_id)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{i.name}</td>
                    <td className="px-4 py-3 text-sm">{i.version || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(i.status)} className="text-xs capitalize">{i.status.replace('_',' ')}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(i.last_seen).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><button onClick={async()=>{await deleteInv.mutateAsync(i.id);toast({title:'Removed'});}} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0&&<div className="text-center py-12 text-muted-foreground">No software records.</div>}
          </div>
        </TabsContent>

        <TabsContent value="catalogue">
          <div className="flex justify-end mb-4"><Button className="gap-2" onClick={()=>setShowCatForm(true)}><Plus className="h-4 w-4"/>Add to Catalogue</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogue.map(c=>(
              <div key={c.id} className="bg-card rounded-lg border p-4 shadow-sm flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.name}</span>
                    <Badge variant={c.approved?'default':'destructive'} className="text-xs">{c.approved?'Approved':'Restricted'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.vendor} · {c.category} · v{c.current_version}</p>
                </div>
                <button onClick={async()=>{await deleteCat.mutateAsync(c.id);toast({title:'Removed'});}} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Inventory form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Software Record</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label className="text-xs">Device</Label><Select value={invForm.device_id} onValueChange={v=>setInvForm(f=>({...f,device_id:v}))}><SelectTrigger><SelectValue placeholder="Select device"/></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Name</Label><Input value={invForm.name} onChange={e=>setInvForm(f=>({...f,name:e.target.value}))}/></div>
            <div><Label className="text-xs">Version</Label><Input value={invForm.version} onChange={e=>setInvForm(f=>({...f,version:e.target.value}))}/></div>
            <div><Label className="text-xs">Status</Label><Select value={invForm.status} onValueChange={v=>setInvForm(f=>({...f,status:v as SwStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="installed">Installed</SelectItem><SelectItem value="missing">Missing</SelectItem><SelectItem value="update_available">Update Available</SelectItem><SelectItem value="unauthorised">Unauthorised</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSaveInv} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalogue form */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add to Catalogue</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label className="text-xs">Name</Label><Input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/></div>
            <div><Label className="text-xs">Vendor</Label><Input value={catForm.vendor} onChange={e=>setCatForm(f=>({...f,vendor:e.target.value}))}/></div>
            <div><Label className="text-xs">Category</Label><Input value={catForm.category} onChange={e=>setCatForm(f=>({...f,category:e.target.value}))}/></div>
            <div><Label className="text-xs">Current Version</Label><Input value={catForm.current_version} onChange={e=>setCatForm(f=>({...f,current_version:e.target.value}))}/></div>
            <div><Label className="text-xs">Approved</Label><Select value={catForm.approved?'yes':'no'} onValueChange={v=>setCatForm(f=>({...f,approved:v==='yes'}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="yes">Approved</SelectItem><SelectItem value="no">Restricted</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowCatForm(false)}>Cancel</Button><Button onClick={handleSaveCat} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
