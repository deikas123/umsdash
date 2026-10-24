import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Download, Loader2, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, FileArchive, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

type ProgressEvent = { phase: string; message: string; pct: number };
type ValidationCheck = { item: string; expected: string | number; actual: string | number; ok: boolean; note?: string };
type DoneEvent = {
  filename: string;
  size_bytes: number;
  signed_url: string;
  validation: { ok: boolean; checks: ValidationCheck[]; missing: string[] };
  manifest: Record<string, unknown>;
};

export default function DatabaseExport() {
  const { profile, user } = useAuth();
  const isSuperAdmin = (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL
    || (profile?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;

  const [includeFiles, setIncludeFiles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [log, setLog] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="max-w-2xl">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              The Database Export tool is restricted to the system super-admin
              account ({SUPER_ADMIN_EMAIL}).
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLog([]);
    setProgress({ phase: 'start', message: 'Connecting…', pct: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/export-database`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ includeFiles }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Export failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done: DoneEvent | null = null;
      let errMsg: string | null = null;

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          if (!raw.trim() || raw.startsWith(':')) continue;
          const lines = raw.split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (event === 'progress') {
              const p = payload as ProgressEvent;
              setProgress(p);
              setLog((prev) => [...prev.slice(-40), p]);
            } else if (event === 'done') {
              done = payload as DoneEvent;
            } else if (event === 'error') {
              errMsg = (payload as { message?: string }).message ?? 'Unknown error';
            }
          } catch { /* ignore malformed event */ }
        }
      }

      if (errMsg) throw new Error(errMsg);
      if (!done) throw new Error('Stream ended without a completion event.');

      setResult(done);

      const link = document.createElement('a');
      link.href = done.signed_url;
      link.download = done.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: done.validation.ok ? 'Export ready' : 'Export ready (with warnings)',
        description: `${done.filename} · ${(done.size_bytes / 1024 / 1024).toFixed(2)} MB`,
        variant: done.validation.ok ? 'default' : 'destructive',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      toast({ title: 'Export failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <AppLayout>
      <motion.div
        className="space-y-6 max-w-4xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Database Export"
          description="Full backup: schema, data, relationships, storage files, edge functions, and an LLM-ready knowledge pack."
        />

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sensitive data</AlertTitle>
          <AlertDescription>
            The export contains every record and uploaded file. Download links
            expire after 30 minutes. Store the ZIP securely and delete it when
            no longer needed.
          </AlertDescription>
        </Alert>

        {/* Build Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              Build Export
            </CardTitle>
            <CardDescription>
              Streams progress in real time. Every artifact is validated before
              the download link is issued.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="include-files"
                checked={includeFiles}
                onCheckedChange={(v) => setIncludeFiles(v === true)}
                disabled={loading}
              />
              <div className="space-y-1">
                <Label htmlFor="include-files" className="cursor-pointer font-medium">
                  Include storage files
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bundles every file from <code className="bg-muted px-1 rounded text-xs">documents</code>,{' '}
                  <code className="bg-muted px-1 rounded text-xs">task-files</code>, and{' '}
                  <code className="bg-muted px-1 rounded text-xs">avatars</code>.
                  Disable for a faster, data-only export.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-3">
              <p className="font-medium text-foreground">The ZIP contains</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-muted-foreground text-xs">
                {[
                  ['schema.sql', 'Full DDL: tables, enums, FKs, indexes, functions, triggers, RLS'],
                  ['data/<table>.sql', 'Per-table SQL + all-data.sql + full.sql'],
                  ['knowledge/relationships.jsonl', 'FK graph'],
                  ['knowledge/documents.jsonl', 'Document + profile knowledge packs'],
                  ['edge_functions/', 'Every Deno function source + config.toml'],
                  ['storage/', 'Raw files from every bucket'],
                  ['validation.json', 'Integrity report + SUMMARY.md'],
                  ['LLM_CONTEXT.md', 'Manifest, README, and LLM context pack'],
                ].map(([file, desc]) => (
                  <li key={file} className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <span><code className="font-mono">{file}</code> — {desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleExport}
              disabled={loading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building export…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Export Database</>
              )}
            </Button>

            {/* Progress section */}
            <AnimatePresence>
              {progress && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        <span className="font-semibold text-sm capitalize">
                          {progress.phase.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold tabular-nums px-3 py-1">
                        {progress.pct}%
                      </Badge>
                    </div>
                    <Progress value={progress.pct} className="h-3" />
                    <p className="text-sm text-muted-foreground">{progress.message}</p>
                  </div>

                  {log.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export log</span>
                      </div>
                      <ScrollArea className="h-44 rounded-lg border bg-black/5 dark:bg-white/5 p-3">
                        <ul className="space-y-1 text-xs font-mono">
                          {log.map((l, i) => (
                            <li key={i} className="text-muted-foreground flex gap-2">
                              <span className="text-primary font-bold tabular-nums w-10 flex-shrink-0">
                                {String(l.pct).padStart(3, ' ')}%
                              </span>
                              <span className="uppercase text-foreground/60 w-24 flex-shrink-0 truncate">
                                {l.phase}
                              </span>
                              <span className="flex-1">{l.message}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Export failed</AlertTitle>
                <AlertDescription className="break-all">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Result Card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Card className={result.validation.ok ? 'border-green-500/50' : 'border-yellow-500/50'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.validation.ok ? (
                      <><CheckCircle2 className="h-5 w-5 text-green-600" /> Validation passed</>
                    ) : (
                      <><AlertTriangle className="h-5 w-5 text-yellow-600" /> Completed with warnings</>
                    )}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3">
                    <span>{result.filename}</span>
                    <Badge variant="secondary">{(result.size_bytes / 1024 / 1024).toFixed(2)} MB</Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Link valid 30 minutes
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild variant="default" size="lg">
                    <a href={result.signed_url} download={result.filename}>
                      <Download className="mr-2 h-4 w-4" /> Download ZIP
                    </a>
                  </Button>

                  <div>
                    <p className="text-sm font-medium mb-2">
                      Validation checks
                      <Badge variant="secondary" className="ml-2">{result.validation.checks.length}</Badge>
                    </p>
                    <ScrollArea className="h-64 rounded-lg border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-2">Item</th>
                            <th className="text-left p-2">Expected</th>
                            <th className="text-left p-2">Actual</th>
                            <th className="text-left p-2 w-20">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.validation.checks.map((c, i) => (
                            <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="p-2 font-mono">{c.item}</td>
                              <td className="p-2 text-muted-foreground">{c.expected}</td>
                              <td className="p-2 text-muted-foreground">{c.actual}</td>
                              <td className="p-2">
                                {c.ok ? (
                                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">Fail</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>

                  {result.validation.missing.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Missing items ({result.validation.missing.length})</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-xs max-h-40 overflow-auto mt-1 space-y-0.5">
                          {result.validation.missing.map((m, i) => (
                            <li key={i}><code>{m}</code></li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
}
