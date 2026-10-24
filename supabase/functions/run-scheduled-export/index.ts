// run-scheduled-export edge function stub
// Runs a scheduled export and emails the result.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { schedule_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: schedule, error } = await supabase
      .from("export_schedules")
      .select("*")
      .eq("id", schedule_id)
      .single();
    if (error || !schedule) throw new Error("Schedule not found");

    console.log("[run-scheduled-export] Running schedule:", schedule.name, schedule.export_type, schedule.format);

    // Update last_run_at
    await supabase
      .from("export_schedules")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", schedule_id);

    // TODO: generate actual export file and email to schedule.email_to
    return new Response(
      JSON.stringify({ success: true, schedule_id, message: "Export queued (stub)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
