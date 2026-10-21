import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_API_URL = "https://sms.textsms.co.ke/api/services/sendsms/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apikey = Deno.env.get("TEXTSMS_API_KEY");
    const partnerID = Deno.env.get("TEXTSMS_PARTNER_ID");
    const shortcode = Deno.env.get("TEXTSMS_SHORTCODE");

    if (!apikey || !partnerID || !shortcode) {
      throw new Error("SMS credentials not configured");
    }

    const { mobile, message, type, recipientName } = await req.json();

    if (!mobile || !message) {
      return new Response(
        JSON.stringify({ error: "mobile and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number to 254 format
    let normalizedMobile = mobile.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (normalizedMobile.startsWith("+")) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    if (normalizedMobile.startsWith("0")) {
      normalizedMobile = "254" + normalizedMobile.substring(1);
    }

    console.log(`Sending SMS to ${normalizedMobile}: ${message} (type: ${type || "general"})`);

    const smsResponse = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey,
        partnerID,
        message,
        shortcode,
        mobile: normalizedMobile,
      }),
    });

    const result = await smsResponse.json();
    console.log("SMS API response:", JSON.stringify(result));

    // Log the SMS using service role to bypass RLS for sent_by
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("sms_logs").insert({
      sent_by: user.id,
      recipient_phone: normalizedMobile,
      recipient_name: recipientName || null,
      message,
      sms_type: type || "general",
      status: result?.["response-code"] === "0200" || result?.success ? "delivered" : "failed",
      api_response: result,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMS error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
