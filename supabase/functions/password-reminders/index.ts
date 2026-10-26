import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [14, 7, 2, 0];

function normalize(phone: string) {
  let m = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (m.startsWith("0")) m = "254" + m.slice(1);
  return m;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("SMS_API_KEY");
    const SMS_USER_ID = Deno.env.get("SMS_USER_ID");
    const SMS_PASSWORD = Deno.env.get("SMS_PASSWORD");
    const SENDER_ID = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";
    if (!KEY || !SMS_USER_ID || !SMS_PASSWORD) throw new Error("SMS credentials not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: passwords, error } = await supabase
      .from("passwords")
      .select("id, system_name, assigned_to, expiry_date, phone_number, last_notified_at, owner_user_id, backup_user_id");
    if (error) throw error;

    const userIds = new Set<string>();
    (passwords || []).forEach((p) => { if (p.owner_user_id) userIds.add(p.owner_user_id); if (p.backup_user_id) userIds.add(p.backup_user_id); });
    const { data: profiles } = userIds.size
      ? await supabase.from("profiles").select("user_id, phone_number").in("user_id", [...userIds])
      : { data: [] as { user_id: string; phone_number: string | null }[] };
    const phoneOf = new Map((profiles || []).map((p) => [p.user_id, p.phone_number]));

    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const now = new Date();
    const results: unknown[] = [];

    for (const pw of passwords || []) {
      const exp = new Date(pw.expiry_date + "T00:00:00Z");
      const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86400000);
      // Reminder days before expiry, then a daily reminder while overdue (up to 14 days)
      const due = REMINDER_DAYS.includes(daysLeft) || (daysLeft < 0 && daysLeft >= -14);
      if (!due) continue;
      if (pw.last_notified_at && (now.getTime() - new Date(pw.last_notified_at).getTime()) / 3600000 < 20) continue;

      const who = pw.assigned_to || "unassigned";
      const message =
        daysLeft < 0 ? `UMS OVERDUE: Password for ${pw.system_name} (${who}) EXPIRED ${-daysLeft} day(s) ago. Renew it now.`
        : daysLeft === 0 ? `UMS ALERT: Password for ${pw.system_name} (${who}) EXPIRES TODAY. Please update immediately.`
        : daysLeft <= 2 ? `UMS WARNING: Password for ${pw.system_name} (${who}) expires in ${daysLeft} DAYS (${pw.expiry_date}).`
        : `UMS REMINDER: Password for ${pw.system_name} (${who}) expires in ${daysLeft} days (${pw.expiry_date}).`;

      const phones = new Set<string>();
      if (pw.phone_number) phones.add(normalize(pw.phone_number));
      const ownerPhone = pw.owner_user_id ? phoneOf.get(pw.owner_user_id) : null;
      if (ownerPhone) phones.add(normalize(ownerPhone));
      // Backup person is only alerted in the final 2 days or when overdue
      const backupPhone = pw.backup_user_id ? phoneOf.get(pw.backup_user_id) : null;
      if (backupPhone && daysLeft <= 2) phones.add(normalize(backupPhone));

      // In-app notifications
      const inApp = [pw.owner_user_id, daysLeft <= 2 ? pw.backup_user_id : null].filter(Boolean) as string[];
      if (inApp.length) {
        await supabase.from("notifications").insert([...new Set(inApp)].map((user_id) => ({
          user_id, title: `Password ${daysLeft < 0 ? "overdue" : "expiring"}: ${pw.system_name}`, body: message, link: "/passwords",
        })));
      }

      for (const mobile of phones) {
        let status = "failed"; let resp: unknown = null;
        try {
          const smsParams = new URLSearchParams({
            userid: SMS_USER_ID,
            password: SMS_PASSWORD,
            mobile,
            msg: message,
            senderid: SENDER_ID,
            msgType: "text",
            duplicatecheck: "true",
            output: "json",
            sendMethod: "quick",
          });
          const r = await fetch("https://smsportal.hostpinnacle.co.ke/SMSApi/send", {
            method: "POST",
            headers: { "apikey": KEY, "cache-control": "no-cache", "content-type": "application/x-www-form-urlencoded" },
            body: smsParams.toString(),
          });
          resp = await r.json().catch(() => null);
          status = r.ok ? "sent" : "failed";
        } catch (e) { resp = { error: String(e) }; }
        await supabase.from("sms_logs").insert({ recipient_phone: mobile, message, status, sms_response: resp, related_table: "passwords", related_id: pw.id, sent_by: null });
      }

      await supabase.from("passwords").update({ notified: true, last_notified_at: now.toISOString() }).eq("id", pw.id);
      results.push({ id: pw.id, system: pw.system_name, daysLeft, sms: phones.size, inApp: inApp.length });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Password reminder error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
