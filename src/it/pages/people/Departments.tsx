/**
 * IT → People → Departments
 * Read-only view over hr_departments. Edits should happen in HR Hub.
 * Shows employee counts and IT-relevant info.
 */
import { useDepartments } from '@/hr/hooks/useSupabaseData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Departments() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const navigate = useNavigate();

  const empCount = (deptId: string) => employees.filter(e => e.department_id === deptId).length;
  const activeCount = (deptId: string) => employees.filter(e => e.department_id === deptId && e.status === 'active').length;

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">
            Sourced from HR Hub · {departments.length} departments —
            manage departments in <button onClick={() => navigate('/hr/departments')} className="text-primary underline">HR Hub</button>
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6 text-sm text-blue-800 dark:text-blue-200">
        This is a read-only view of departments from HR Hub. To add, edit or remove departments, go to HR Hub → Departments.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d.id} className="bg-card rounded-lg border p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{d.name}</h3>
                {d.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex gap-4">
                <div>
                  <p className="text-lg font-bold">{empCount(d.id)}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{activeCount(d.id)}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/it/people/directory')}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View staff <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No departments found. Add them in HR Hub.
          </div>
        )}
      </div>
    </div>
  );
}
