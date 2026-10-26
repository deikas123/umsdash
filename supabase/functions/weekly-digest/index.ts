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

function truncate(msg: string, max = 160): string {
  return msg.length > max ? msg.slice(0, max - 3) + "..." : msg;
}

async function sendSms(
  phone: string,
  message: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<void> {
  const mobile = normalizePhone(phone);
  const finalMessage = truncate(message);
  const apiKey = Deno.env.get("SMS_API_KEY")!;
  const userId = Deno.env.get("SMS_USER_ID")!;
  const smsPassword = Deno.env.get("SMS_PASSWORD")!;
  const senderId = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";

  const params = new URLSearchParams({
    userid: userId, password: smsPassword, mobile,
    msg: finalMessage, senderid: senderId,
    msgType: "text", duplicatecheck: "true", output: "json", sendMethod: "quick",
  });

  let smsData: unknown = null;
  let success = false;
  try {
    const r = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "apikey": apiKey, "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    smsData = await r.json();
    success = (smsData as { status?: string })?.status === "S" ||
      (smsData as { status?: string })?.status === "success" || r.ok;
  } catch (e) {
    smsData = { error: String(e) };
  }

  await adminClient.from("sms_logs").insert({
    recipient_phone: mobile, message: finalMessage,
    sms_type: "weekly_digest", status: success ? "sent" : "failed",
    sent_by: null, sms_response: smsData,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch all active employees with phones
    const { data: employees } = await adminClient
      .from("hr_employees")
      .select("id, user_id, first_name, last_name, phone")
      .eq("status", "active")
      .not("phone", "is", null)
      .neq("phone", "");

    if (!employees || employees.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dateStr = now.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

    // Global counts (same for all employees in the digest)
    const [leaveRes, overtimeRes, announcementsRes] = await Promise.all([
      adminClient.from("hr_leave_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending_hod", "pending_hr", "pending_gm"]),
      adminClient.from("hr_overtime_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      adminClient.from("hr_announcements")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
    ]);

    const pendingLeave = leaveRes.count ?? 0;
    const pendingOvertime = overtimeRes.count ?? 0;
    const newAnnouncements = announcementsRes.count ?? 0;

    let sent = 0;
    for (const emp of employees) {
      // Check sms_preferences
      if (emp.user_id) {
        const { data: prefs } = await adminClient
          .from("sms_preferences")
          .select("sms_enabled")
          .eq("user_id", emp.user_id)
          .maybeSingle();
        if (prefs && prefs.sms_enabled === false) continue;
      }

      // Skip if all zeros
      if (pendingLeave === 0 && pendingOvertime === 0 && newAnnouncements === 0) continue;

      const name = `${emp.first_name} ${emp.last_name}`.trim() || "Team";
      const msg = truncate(
        `UMS Weekly (${dateStr}): Hi ${name}! Leave pending: ${pendingLeave} | Overtime pending: ${pendingOvertime} | New announcements: ${newAnnouncements}. Login: https://umspanel.netlify.app - UMS Kenya`
      );

      await sendSms(emp.phone, msg, adminClient);
      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("weekly-digest error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
