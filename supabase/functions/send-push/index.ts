// send-push edge function stub
// Accepts { subscription, title, body, url } and logs the push payload.
// Replace with real Web Push API calls (e.g. using web-push npm package) when ready.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscription, title, body, url } = await req.json();
    console.log("[send-push] Push payload:", { subscription, title, body, url });
    // TODO: integrate real Web Push API here using OCR_API_KEY or PUSH_VAPID_PRIVATE_KEY
    return new Response(
      JSON.stringify({ success: true, message: "Push notification queued (stub)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
