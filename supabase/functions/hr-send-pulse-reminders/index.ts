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

async function sendSmsAndLog(
  phone: string,
  message: string,
  surveyId: string,
  recipientName: string | null,
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
    recipient_phone: mobile, recipient_name: recipientName,
    message: finalMessage, sms_type: "survey_reminder",
    status: success ? "sent" : "failed",
    sent_by: null,
    related_table: "hr_surveys",
    related_id: surveyId,
    sms_response: smsData,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    // Find active surveys that allow SMS reminders
    const { data: surveys } = await adminClient
      .from("hr_surveys")
      .select("id, title, ends_at, reminder_channel, reminder_day_of_month, reminder_interval_days, last_reminder_at")
      .eq("status", "active")
      .in("reminder_channel", ["sms", "both"]);

    if (!surveys || surveys.length === 0) {
      return new Response(JSON.stringify({ success: true, surveysProcessed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const survey of surveys) {
      // Check if survey is still open
      if (survey.ends_at && new Date(survey.ends_at) < now) continue;

      // Determine if reminder is due today
      let reminderDue = false;
      if (survey.reminder_interval_days) {
        const lastReminder = survey.last_reminder_at ? new Date(survey.last_reminder_at) : null;
        if (!lastReminder) {
          reminderDue = true;
        } else {
          const daysSinceLast = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
          reminderDue = daysSinceLast >= survey.reminder_interval_days;
        }
      } else if (survey.reminder_day_of_month) {
        reminderDue = now.getDate() === survey.reminder_day_of_month;
      }

      if (!reminderDue) continue;

      const endsAtStr = survey.ends_at ? new Date(survey.ends_at).toLocaleDateString("en-KE") : "open-ended";

      // Find employees who haven't responded yet
      const { data: pending } = await adminClient
        .from("hr_employees")
        .select("id, first_name, last_name, phone, user_id")
        .eq("status", "active")
        .not("phone", "is", null)
        .neq("phone", "");

      if (!pending || pending.length === 0) continue;

      // Get user_ids who have already responded
      const { data: participated } = await adminClient
        .from("hr_survey_participation")
        .select("user_id")
        .eq("survey_id", survey.id);

      const participatedUserIds = new Set((participated || []).map((p: { user_id: string }) => p.user_id));

      for (const emp of pending) {
        // Skip if already responded
        if (emp.user_id && participatedUserIds.has(emp.user_id)) continue;

        // Check sms_preferences
        if (emp.user_id) {
          const { data: prefs } = await adminClient
            .from("sms_preferences")
            .select("sms_enabled")
            .eq("user_id", emp.user_id)
            .maybeSingle();
          if (prefs && prefs.sms_enabled === false) continue;
        }

        const empName = `${emp.first_name} ${emp.last_name}`.trim();
        const msg = `UMS HR Survey: '${survey.title}' needs your response. Please complete by ${endsAtStr}. Login: https://umspanel.netlify.app - UMS Kenya`;

        await sendSmsAndLog(emp.phone, msg, survey.id, empName, adminClient);

        if (emp.user_id) {
          await adminClient.from("in_app_notifications").insert({
            user_id: emp.user_id,
            title: `Survey Reminder: ${survey.title}`,
            message: `Please complete the survey '${survey.title}' by ${endsAtStr}.`,
            type: "survey_reminder",
            is_read: false,
          });
        }

        totalSent++;
      }

      // Update last_reminder_at for this survey
      await adminClient
        .from("hr_surveys")
        .update({ last_reminder_at: now.toISOString() })
        .eq("id", survey.id);
    }

    return new Response(JSON.stringify({ success: true, totalSent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("hr-send-pulse-reminders error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
