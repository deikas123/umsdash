import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, FileText, Users, User, Terminal, FileX, ArrowRight,
} from 'lucide-react';

// ── result shape ──────────────────────────────────────────────────────────────
interface SearchHit {
  id: string;
  label: string;
  subLabel: string;
  href: string;
  icon: typeof FileText;
}
interface SearchResults {
  documents: SearchHit[];
  customers: SearchHit[];
  people: SearchHit[];
  it: SearchHit[];
}

const EMPTY: SearchResults = { documents: [], customers: [], people: [], it: [] };

function escapeIlike(term: string): string {
  // Supabase ilike treats _ and % as wildcards; escape them so literal values match.
  return term.replace(/[_%\\]/g, (m) => `\\${m}`);
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const debouncedQ = useDebouncedValue(q, 250);

  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = debouncedQ.trim();
    if (!term) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const like = `%${escapeIlike(term)}%`;

    const docsQuery = supabase
      .from('documents')
      .select('id, title, file_name, description, customer:customers(full_name)')
      .or(`title.ilike.${like},file_name.ilike.${like},description.ilike.${like}`)
      .limit(20);

    const customersQuery = supabase
      .from('customers')
      .select('id, full_name, account_number, email, phone')
      .or(`full_name.ilike.${like},account_number.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(20);

    const peopleQuery = supabase
      .from('hr_employees')
      .select('id, first_name, last_name, staff_number, email, designation')
      .or(`first_name.ilike.${like},last_name.ilike.${like},staff_number.ilike.${like},email.ilike.${like},designation.ilike.${like}`)
      .limit(20);

    const ticketsQuery = supabase
      .from('it_tickets')
      .select('id, ticket_id, title, description')
      .or(`ticket_id.ilike.${like},title.ilike.${like},description.ilike.${like}`)
      .limit(20);

    const devicesQuery = supabase
      .from('it_devices')
      .select('id, asset_id, device_name, manufacturer, model')
      .or(`asset_id.ilike.${like},device_name.ilike.${like},manufacturer.ilike.${like},model.ilike.${like}`)
      .limit(20);

    Promise.all([docsQuery, customersQuery, peopleQuery, ticketsQuery, devicesQuery])
      .then(([docs, customers, people, tickets, devices]) => {
        if (cancelled) return;
        const documents: SearchHit[] = ((docs.data as any[]) ?? []).map((d) => ({
          id: d.id,
          label: d.title || d.file_name || 'Untitled document',
          subLabel: d.customer?.full_name || d.file_name || 'Document Vault',
          href: '/docs/documents',
          icon: FileText,
        }));
        const custHits: SearchHit[] = ((customers.data as any[]) ?? []).map((c) => ({
          id: c.id,
          label: c.full_name || 'Unknown customer',
          subLabel: [c.account_number, c.email, c.phone].filter(Boolean).join(' · ') || 'Customer',
          href: '/docs/customers',
          icon: Users,
        }));
        const peopleHits: SearchHit[] = ((people.data as any[]) ?? []).map((p) => ({
          id: p.id,
          label: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Unknown',
          subLabel: [p.staff_number, p.designation].filter(Boolean).join(' · ') || 'Employee',
          href: '/hr/directory',
          icon: User,
        }));
        const ticketHits: SearchHit[] = ((tickets.data as any[]) ?? []).map((t) => ({
          id: t.id,
          label: t.title || t.ticket_id || 'IT ticket',
          subLabel: t.ticket_id ? `Ticket ${t.ticket_id}` : 'IT ticket',
          href: '/it/support',
          icon: Terminal,
        }));
        const deviceHits: SearchHit[] = ((devices.data as any[]) ?? []).map((d) => ({
          id: d.id,
          label: d.device_name || d.asset_id || 'IT device',
          subLabel: [d.asset_id, d.manufacturer, d.model].filter(Boolean).join(' · ') || 'IT device',
          href: '/it/devices',
          icon: Terminal,
        }));

        setResults({
          documents,
          customers: custHits,
          people: peopleHits,
          it: [...ticketHits, ...deviceHits],
        });
      })
      .catch(() => {
        if (!cancelled) setResults(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const onQueryChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const total =
    results.documents.length + results.customers.length +
    results.people.length + results.it.length;

  const renderHits = (hits: SearchHit[]) =>
    hits.length === 0 ? null : (
      <div className="grid gap-2 sm:grid-cols-2">
        {hits.map((hit) => (
          <button
            key={`${hit.href}-${hit.id}`}
            onClick={() => navigate(hit.href)}
            className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <hit.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{hit.label}</p>
              <p className="text-xs text-muted-foreground truncate">{hit.subLabel}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    );

  const HitSection = ({ title, hits, limit }: { title: string; hits: SearchHit[]; limit?: number }) => {
    if (hits.length === 0) return null;
    const shown = limit ? hits.slice(0, limit) : hits;
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{hits.length}</Badge>
        </div>
        {renderHits(shown)}
      </div>
    );
  };

  return (
    <AppLayout title="Global Search" description="Search across every module">
      <div className="max-w-4xl mx-auto">
        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search documents, customers, people, IT tickets and devices…"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-10 h-11 text-base"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              searching…
            </span>
          )}
        </div>

        {!debouncedQ.trim() ? (
          <EmptyState
            icon={Search}
            title="Search the whole platform"
            description="Start typing to find documents, customers, employees, IT tickets and devices in one place."
          />
        ) : !loading && total === 0 ? (
          <EmptyState
            icon={FileX}
            title="No results found"
            description={`Nothing matched "${debouncedQ.trim()}". Try a different term.`}
          />
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="gap-1 text-xs">
                All {total > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{total}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs">
                Documents {results.documents.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{results.documents.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-1 text-xs">
                Customers {results.customers.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{results.customers.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-1 text-xs">
                People {results.people.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{results.people.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="it" className="gap-1 text-xs">
                IT {results.it.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{results.it.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-1">
              <HitSection title="Documents" hits={results.documents} limit={3} />
              <HitSection title="Customers" hits={results.customers} limit={3} />
              <HitSection title="People" hits={results.people} limit={3} />
              <HitSection title="IT (tickets & devices)" hits={results.it} limit={3} />
              {total === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">No matches yet.</p>
              )}
            </TabsContent>

            <TabsContent value="documents">
              {results.documents.length ? renderHits(results.documents) : (
                <EmptyState icon={FileText} title="No documents matched" description="Try a different title, file name or description." />
              )}
            </TabsContent>

            <TabsContent value="customers">
              {results.customers.length ? renderHits(results.customers) : (
                <EmptyState icon={Users} title="No customers matched" description="Try a different name, account number, email or phone." />
              )}
            </TabsContent>

            <TabsContent value="people">
              {results.people.length ? renderHits(results.people) : (
                <EmptyState icon={User} title="No people matched" description="Try a different name, staff number, email or designation." />
              )}
            </TabsContent>

            <TabsContent value="it">
              {results.it.length ? renderHits(results.it) : (
                <EmptyState icon={Terminal} title="No IT records matched" description="Try a different ticket id, title, asset id or device name." />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
