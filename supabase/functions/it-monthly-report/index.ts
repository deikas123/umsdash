// supabase/functions/it-monthly-report/index.ts
// Deno Edge Function — generates and stores a monthly IT report snapshot.
// Deploy with: supabase functions deploy it-monthly-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(supabaseUrl, serviceKey);

  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const period = `${year}-${month}`;

  // Fetch raw data
  const [ticketsRes, devicesRes] = await Promise.all([
    supabase.from('it_helpdesk_tickets').select('status, priority'),
    supabase.from('it_devices').select('status'),
  ]);

  const tickets = ticketsRes.data ?? [];
  const devices = devicesRes.data ?? [];

  const summary = {
    period,
    generated_at: now.toISOString(),
    tickets_total: tickets.length,
    tickets_open: tickets.filter((t: any) => !['closed', 'resolved'].includes(t.status)).length,
    tickets_resolved: tickets.filter((t: any) => ['resolved', 'closed'].includes(t.status)).length,
    tickets_critical: tickets.filter((t: any) => t.priority === 'critical').length,
    devices_total: devices.length,
    devices_active: devices.filter((d: any) => d.status === 'active').length,
    devices_offline: devices.filter((d: any) => d.status === 'offline').length,
  };

  const { data, error } = await supabase
    .from('it_report_snapshots')
    .insert({
      report_type: 'monthly',
      period,
      summary,
      generated_by: null,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, snapshot: data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
