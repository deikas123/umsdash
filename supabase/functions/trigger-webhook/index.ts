// trigger-webhook edge function stub
// POSTs to a webhook URL with HMAC-SHA256 signature header.

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
    const { webhook_id, event, payload } = await req.json();

    // Fetch webhook from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const whRes = await fetch(`${supabaseUrl}/rest/v1/webhooks?id=eq.${webhook_id}&select=*`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const [webhook] = await whRes.json();
    if (!webhook) throw new Error("Webhook not found");

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

    // Compute HMAC signature
    let signature = "";
    if (webhook.secret) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const deliveryRes = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-UMSHub-Signature": signature,
        "X-UMSHub-Event": event,
      },
      body,
    });

    return new Response(
      JSON.stringify({ success: true, status: deliveryRes.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
