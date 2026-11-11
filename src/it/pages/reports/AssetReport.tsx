import { useItDevices, useItHardwareInventory } from '@/it/hooks/useItData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))','hsl(var(--accent))','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316'];

export default function AssetReport() {
  const { data: devices = [] } = useItDevices();
  const { data: hardware = [] } = useItHardwareInventory();

  // Devices by status
  const devStatus = ['active','offline','maintenance','retired'].map(s => ({ name:s, count:devices.filter(d=>d.status===s).length }));
  // Devices by department
  const depts = [...new Set(devices.map(d=>d.department||'Unknown'))];
  const devDept = depts.map(d => ({ name:d, count:devices.filter(dev=>dev.department===d||(d==='Unknown'&&!dev.department)).length }));
  // Hardware by category
  const cats = [...new Set(hardware.map(h=>h.category))];
  const hwCat = cats.map(c => ({ name:c.replace('_',' '), count:hardware.filter(h=>h.category===c).length }));
  // Hardware by status
  const hwStatus = ['in_use','in_storage','under_repair','retired','lost'].map(s => ({ name:s.replace('_',' '), count:hardware.filter(h=>h.status===s).length }));

  const totalCost = hardware.reduce((s,h)=>s+Number(h.purchase_cost||0),0);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Asset Report</h1><p className="page-subtitle">Device and hardware inventory overview</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ['Registered Devices', devices.length, ''],
          ['Hardware Assets', hardware.length, ''],
          ['Devices Active', devices.filter(d=>d.status==='active').length, 'text-green-600'],
          ['Total Asset Value', `KES ${totalCost.toLocaleString()}`, 'text-primary'],
        ].map(([l,v,c])=>(
          <Card key={l as string}><CardContent className="p-5"><p className={`text-2xl font-bold ${c}`}>{v}</p><p className="text-sm text-muted-foreground">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Devices by Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={devStatus}><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]}/></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Hardware by Category</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={hwCat} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e=>`${e.name} (${e.count})`} labelLine={false} fontSize={11}>
              {hwCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie><Legend/></PieChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Devices by Department</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={devDept} layout="vertical"><XAxis type="number" tick={{fontSize:12}}/><YAxis dataKey="name" type="category" width={120} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" fill="hsl(var(--accent))" radius={[0,4,4,0]}/></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Hardware by Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hwStatus}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
