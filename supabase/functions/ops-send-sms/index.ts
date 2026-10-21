import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TEXTSMS_API_KEY = Deno.env.get("TEXTSMS_API_KEY");
    if (!TEXTSMS_API_KEY) throw new Error("TEXTSMS_API_KEY is not configured");

    const TEXTSMS_PARTNER_ID = Deno.env.get("TEXTSMS_PARTNER_ID");
    if (!TEXTSMS_PARTNER_ID) throw new Error("TEXTSMS_PARTNER_ID is not configured");

    const { phone, message, related_table, related_id } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mobile = phone.replace(/\s+/g, "").replace(/^\+/, "");
    if (mobile.startsWith("0")) mobile = "254" + mobile.slice(1);

    const smsResponse = await fetch("https://sms.textsms.co.ke/api/services/sendsms/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: TEXTSMS_API_KEY,
        partnerID: TEXTSMS_PARTNER_ID,
        message,
        shortcode: "UMS PREPAID",
        mobile,
      }),
    });

    const smsData = await smsResponse.json();
    const success = smsResponse.ok;

    // Log the SMS
    await adminClient.from("sms_logs").insert({
      recipient_phone: mobile,
      message,
      status: success ? "sent" : "failed",
      sms_response: smsData,
      related_table: related_table || null,
      related_id: related_id || null,
      sent_by: user.id,
    });

    if (!success) {
      throw new Error(`TextSMS API failed [${smsResponse.status}]: ${JSON.stringify(smsData)}`);
    }

    return new Response(JSON.stringify({ success: true, data: smsData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("SMS send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
