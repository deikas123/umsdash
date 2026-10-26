import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMS_API_URL = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";

function normalizePhone(phone: string): string {
  let m = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (m.startsWith("0")) m = "254" + m.slice(1);
  return m;
}

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

    // HostPinnacle credentials
    const apiKey = Deno.env.get("SMS_API_KEY");
    const userId = Deno.env.get("SMS_USER_ID");
    const password = Deno.env.get("SMS_PASSWORD");
    const senderId = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";

    if (!apiKey || !userId || !password) throw new Error("SMS credentials not configured");

    const { phone, message, related_table, related_id } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mobile = normalizePhone(phone);

    const params = new URLSearchParams({
      userid: userId,
      password: password,
      mobile,
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

    const smsData = await smsResponse.json();
    const success = smsData?.status === "S" || smsData?.status === "success" || smsResponse.ok;

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
      throw new Error(`SMS API failed [${smsResponse.status}]: ${JSON.stringify(smsData)}`);
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
