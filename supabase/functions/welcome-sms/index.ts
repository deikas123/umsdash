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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { user_id, full_name, email, password, phone } = await req.json();

    if (!phone || phone.trim() === "") {
      return new Response(JSON.stringify({ skipped: true, reason: "no phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check sms_preferences — treat missing row as enabled
    const { data: prefs } = await adminClient
      .from("sms_preferences")
      .select("sms_enabled")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefs && prefs.sms_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "sms_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mobile = normalizePhone(phone);
    const message = `Welcome to UMS Hub, ${full_name}! Email: ${email}, Temp password: ${password}. Login and change it immediately.`;

    const apiKey = Deno.env.get("SMS_API_KEY")!;
    const userId = Deno.env.get("SMS_USER_ID")!;
    const smsPassword = Deno.env.get("SMS_PASSWORD")!;
    const senderId = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";

    const params = new URLSearchParams({
      userid: userId,
      password: smsPassword,
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
      recipient_name: full_name || null,
      message,
      sms_type: "welcome",
      status: success ? "sent" : "failed",
      sent_by: null,
      related_table: "auth.users",
      related_id: user_id,
      sms_response: smsData,
    });

    // Insert in-app notification
    await adminClient.from("in_app_notifications").insert({
      user_id,
      title: "Welcome to UMS Hub",
      message: `Your account has been created. Email: ${email}. Please log in and change your password immediately.`,
      type: "welcome",
      is_read: false,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("welcome-sms error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
