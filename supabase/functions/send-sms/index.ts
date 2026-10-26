import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HostPinnacle SMS Gateway
const SMS_API_URL = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";

/** Normalize Kenyan phone number to 254XXXXXXXXX format */
function normalizePhone(phone: string): string {
  let m = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (m.startsWith("+")) m = m.substring(1);
  if (m.startsWith("0")) m = "254" + m.substring(1);
  return m;
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HostPinnacle credentials
    const apiKey = Deno.env.get("SMS_API_KEY");
    const userId = Deno.env.get("SMS_USER_ID");
    const password = Deno.env.get("SMS_PASSWORD");
    const senderId = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";

    if (!apiKey || !userId || !password) {
      throw new Error("SMS credentials not configured. Set SMS_API_KEY, SMS_USER_ID, SMS_PASSWORD in Supabase secrets.");
    }

    const { mobile, message, type, recipientName } = await req.json();

    if (!mobile || !message) {
      return new Response(
        JSON.stringify({ error: "mobile and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedMobile = normalizePhone(mobile);
    console.log(`Sending SMS to ${normalizedMobile}: ${message} (type: ${type || "general"})`);

    // HostPinnacle POST request
    const params = new URLSearchParams({
      userid: userId,
      password: password,
      mobile: normalizedMobile,
      msg: message,
      senderid: senderId,
      msgType: "text",
      duplicatecheck: "true",
      output: "json",
      sendMethod: "quick",
    });

    const smsResponse = await fetch(SMS_API_URL, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await smsResponse.json();
    console.log("SMS API response:", JSON.stringify(result));

    const success = result?.status === "S" || result?.status === "success" || smsResponse.ok;

    // Log using service role to bypass RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("sms_logs").insert({
      sent_by: user.id,
      recipient_phone: normalizedMobile,
      recipient_name: recipientName || null,
      message,
      sms_type: type || "general",
      status: success ? "delivered" : "failed",
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
