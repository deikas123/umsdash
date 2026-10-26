import { useState } from 'react';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Users, Search, Building2, Briefcase, Phone, Mail } from 'lucide-react';

export default function StaffDirectory() {
  const { data: employees = [], isLoading } = useEmployees();
  const [search, setSearch] = useState('');

  const activeEmployees = employees.filter(e => e.status === 'active');
  const filtered = activeEmployees.filter(e => {
    const term = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(term) ||
      e.last_name.toLowerCase().includes(term) ||
      (e.departments?.name || '').toLowerCase().includes(term) ||
      e.designation.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff Directory</h1>
        <p className="page-subtitle">Browse colleagues' names, departments, and designations</p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, department, or designation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading directory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No employees found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <div key={emp.id} className="bg-card rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {emp.first_name[0]}{emp.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.staff_number}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.departments?.name || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.designation || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{emp.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
