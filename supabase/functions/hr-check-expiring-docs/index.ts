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
  relatedId: string,
  recipientName: string | null,
  smsType: string,
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
    message: finalMessage, sms_type: smsType,
    status: success ? "sent" : "failed",
    sent_by: null,
    related_table: "hr_employee_documents",
    related_id: relatedId,
    sms_response: smsData,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch docs with expiry dates
    const { data: docs } = await adminClient
      .from("hr_employee_documents")
      .select(`
        id, document_type, title, expiry_date, employee_id,
        hr_employees!inner(first_name, last_name, phone, user_id)
      `)
      .not("expiry_date", "is", null);

    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch HR manager phones
    const { data: hrRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "hr_manager"]);

    const hrManagerPhones: Array<{ phone: string; name: string }> = [];
    if (hrRoles && hrRoles.length > 0) {
      const hrUserIds = hrRoles.map((r: { user_id: string }) => r.user_id);
      const { data: hrProfiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, phone_number, phone")
        .in("user_id", hrUserIds);
      if (hrProfiles) {
        for (const p of hrProfiles) {
          const ph = p.phone_number ?? p.phone;
          if (ph) hrManagerPhones.push({ phone: ph, name: p.full_name || "HR Manager" });
        }
      }
    }

    const alertDays = [30, 14, 7, 1, 0];
    let processed = 0;

    for (const doc of docs) {
      const expiry = new Date(doc.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (!alertDays.includes(daysLeft) && !(daysLeft < 0 && daysLeft >= -7)) continue;

      const emp = (doc as { hr_employees: { first_name: string; last_name: string; phone: string | null; user_id: string | null } }).hr_employees;
      const empName = `${emp.first_name} ${emp.last_name}`.trim();
      const expiryStr = doc.expiry_date;

      // Dedup: skip if already sent within 20 hours
      const { data: recentLog } = await adminClient
        .from("sms_logs")
        .select("id")
        .eq("related_table", "hr_employee_documents")
        .eq("related_id", doc.id)
        .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (recentLog) continue;

      const daysLabel = daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : `${daysLeft} day(s)`;

      if (emp.phone) {
        const empMsg = daysLeft < 0
          ? `UMS HR: Your ${doc.document_type} "${doc.title}" expired ${Math.abs(daysLeft)} day(s) ago (${expiryStr}). Please renew immediately. - UMS Kenya`
          : `UMS HR: Your ${doc.document_type} "${doc.title}" expires in ${daysLeft} day(s) (${expiryStr}). Please renew. - UMS Kenya`;
        await sendSmsAndLog(emp.phone, empMsg, doc.id, empName, "doc_expiry", adminClient);

        if (emp.user_id) {
          await adminClient.from("in_app_notifications").insert({
            user_id: emp.user_id,
            title: `Document ${daysLeft <= 0 ? "Expired" : "Expiring Soon"}: ${doc.title}`,
            message: `Your ${doc.document_type} expires ${daysLeft <= 0 ? `${Math.abs(daysLeft)} day(s) ago` : `in ${daysLeft} day(s)`} on ${expiryStr}.`,
            type: "doc_expiry",
            is_read: false,
          });
        }
      }

      // Notify HR managers
      for (const hr of hrManagerPhones) {
        const hrMsg = `UMS HR: ${empName}'s ${doc.document_type} "${doc.title}" expires ${daysLabel} (${expiryStr}). Action needed. - UMS Kenya`;
        await sendSmsAndLog(hr.phone, hrMsg, doc.id, hr.name, "doc_expiry_hr", adminClient);
      }

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("hr-check-expiring-docs error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
