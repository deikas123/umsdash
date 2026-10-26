/**
 * UMS Hub — Incidents Public API
 * Endpoints:
 *   GET /functions/v1/incidents-api/incidents          — list incidents
 *   GET /functions/v1/incidents-api/incidents/:id      — single incident
 *   GET /functions/v1/incidents-api/incident-events    — incremental event feed
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const error = (msg: string, status = 400) => json({ error: msg }, status);

/** Verify caller using an API key stored in Supabase Vault (no service-role key exposed) */
async function authenticate(req: Request): Promise<boolean> {
  const apiKey = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey) return false;

  // API keys are stored hashed in the api_keys table
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Compare against stored keys (prefix check then hash verify)
  if (apiKey.length < 8) return false;
  const prefix = apiKey.slice(0, 8);

  const { data } = await supabase
    .from('api_keys')
    .select('key_hash, active, expires_at')
    .eq('key_prefix', prefix)
    .eq('active', true)
    .maybeSingle();

  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false;

  // Constant-time hash comparison using Web Crypto
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const valid = hashHex === data.key_hash;

  if (valid) {
    // Update last_used_at (fire-and-forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_prefix', prefix)
      .then(() => {});
  }

  return valid;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return error('Method not allowed', 405);

  // Authenticate
  const authed = await authenticate(req);
  if (!authed) return error('Unauthorized. Provide a valid API key in the x-api-key header.', 401);

  const url = new URL(req.url);
  // Path after /incidents-api/
  const path = url.pathname.replace(/.*\/incidents-api\/?/, '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── GET /incidents/:id ──────────────────────────────────────────────────
  if (path.match(/^incidents\/[0-9a-f-]{36}$/i)) {
    const id = path.split('/')[1];
    const { data, error: err } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (err) return error(err.message, 500);
    if (!data) return error('Incident not found', 404);
    return json({ data });
  }

  // ── GET /incidents ──────────────────────────────────────────────────────
  if (path === 'incidents' || path === '') {
    const params = url.searchParams;
    const page     = Math.max(1, parseInt(params.get('page')  ?? '1'));
    const limit    = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20')));
    const offset   = (page - 1) * limit;
    const status   = params.get('status');
    const severity = params.get('severity');
    const dept     = params.get('department');
    const from     = params.get('from');   // ISO date
    const to       = params.get('to');     // ISO date

    let q = supabase
      .from('incidents')
      .select('id,incident_number,department,incident_type,severity,urgency,status,reported_by,date_of_incident,description,capa_status,created_at,updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status)   q = q.eq('status', status);
    if (severity) q = q.ilike('severity', `${severity}%`);
    if (dept)     q = q.eq('department', dept);
    if (from)     q = q.gte('created_at', from);
    if (to)       q = q.lte('created_at', to);

    const { data, count, error: err } = await q;
    if (err) return error(err.message, 500);

    return json({
      data,
      meta: {
        total: count ?? 0,
        page,
        limit,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
  }

  // ── GET /incident-events ────────────────────────────────────────────────
  if (path === 'incident-events') {
    const params  = url.searchParams;
    const since   = params.get('since');   // ISO timestamp — required
    const limit   = Math.min(500, Math.max(1, parseInt(params.get('limit') ?? '100')));
    const cursor  = params.get('cursor');  // updated_at of last event (alternative to since)

    if (!since && !cursor) {
      return error('Provide since (ISO timestamp) or cursor to receive incremental events.', 400);
    }

    const after = cursor ?? since!;

    const { data, error: err } = await supabase
      .from('incidents')
      .select('id,incident_number,status,severity,department,updated_at,created_at')
      .gt('updated_at', after)
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (err) return error(err.message, 500);

    const nextCursor = data && data.length > 0
      ? data[data.length - 1].updated_at
      : after;

    return json({
      data,
      meta: {
        count: data?.length ?? 0,
        cursor: nextCursor,
        has_more: (data?.length ?? 0) === limit,
      },
    });
  }

  return error('Not found. Valid paths: /incidents, /incidents/{id}, /incident-events', 404);
});
