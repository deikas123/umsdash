import { useEmployeeDocuments, daysUntilExpiry } from '@/hr/hooks/useDocuments';
import { FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ExpiringDocsWidget() {
  const { data: docs = [] } = useEmployeeDocuments();

  const expiring = docs
    .filter(d => d.expiry_date)
    .map(d => ({ ...d, daysLeft: daysUntilExpiry(d.expiry_date) ?? 0 }))
    .filter(d => d.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-warning" /> Documents Expiring Soon
        </h2>
        <Link to="/profile" className="text-xs text-primary hover:underline">Manage →</Link>
      </div>
      <div className="p-4 space-y-2">
        {expiring.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No documents expiring in the next 30 days.</p>
        ) : expiring.map(d => (
          <div key={d.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
              <p className="text-xs text-muted-foreground truncate">{d.employees?.first_name} {d.employees?.last_name} · {d.employees?.staff_number}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${d.daysLeft < 0 ? 'bg-destructive/10 text-destructive' : d.daysLeft <= 7 ? 'bg-warning/20 text-warning' : 'bg-warning/10 text-warning'}`}>
              {d.daysLeft < 0 ? `Expired ${Math.abs(d.daysLeft)}d` : d.daysLeft === 0 ? 'Expires today' : `${d.daysLeft}d left`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}