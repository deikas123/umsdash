import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TEXTSMS_API_KEY = Deno.env.get("TEXTSMS_API_KEY");
    if (!TEXTSMS_API_KEY) throw new Error("TEXTSMS_API_KEY is not configured");
    const TEXTSMS_PARTNER_ID = Deno.env.get("TEXTSMS_PARTNER_ID");
    if (!TEXTSMS_PARTNER_ID) throw new Error("TEXTSMS_PARTNER_ID is not configured");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { type, data } = await req.json();

    // Get admin/manager phone numbers from profiles + user_roles
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "manager"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No admins/managers to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get phone numbers from passwords table (assigned users with phone numbers)
    // We'll also check profiles for any stored phone info
    const adminUserIds = roles.map((r) => r.user_id);

    // Try to get phone numbers: check passwords table for any entries by these users
    const { data: passwordEntries } = await adminClient
      .from("passwords")
      .select("phone_number, user_id")
      .in("user_id", adminUserIds)
      .not("phone_number", "is", null);

    // Deduplicate phone numbers per user
    const phoneMap = new Map<string, string>();
    (passwordEntries || []).forEach((p: any) => {
      if (p.phone_number && !phoneMap.has(p.user_id)) {
        phoneMap.set(p.user_id, p.phone_number);
      }
    });

    let message = "";
    let relatedTable = "";
    let relatedId = "";

    if (type === "new_incident") {
      message = `[UMS ALERT] New Incident Report: ${data.incident_number || "N/A"}\nType: ${data.incident_type || "N/A"}\nSeverity: ${data.severity || "N/A"}\nDept: ${data.department || "N/A"}\nReported by: ${data.reported_by || "N/A"}`;
      relatedTable = "incidents";
      relatedId = data.id || "";
    } else if (type === "vendor_status_change") {
      message = `[UMS ALERT] Vendor Issue Status Change\nVendor: ${data.vendor || "N/A"}\nSystem: ${data.system_name || "N/A"}\nNew Status: ${data.new_status || "N/A"}\nIssue: ${(data.issue || "").substring(0, 80)}`;
      relatedTable = "vendor_issues";
      relatedId = data.id || "";
    } else {
      return new Response(JSON.stringify({ error: "Unknown notification type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phones = Array.from(phoneMap.values());
    if (phones.length === 0) {
      // Log that we tried but no phones available
      await adminClient.from("sms_logs").insert({
        recipient_phone: "no-recipients",
        message,
        status: "skipped",
        sms_response: { reason: "No admin/manager phone numbers found" },
        related_table: relatedTable,
        related_id: relatedId || null,
        sent_by: user.id,
      });
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No phone numbers configured for admins/managers" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    for (const phone of phones) {
      let mobile = phone.replace(/\s+/g, "").replace(/^\+/, "");
      if (mobile.startsWith("0")) mobile = "254" + mobile.slice(1);

      try {
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

        await adminClient.from("sms_logs").insert({
          recipient_phone: mobile,
          message,
          status: success ? "sent" : "failed",
          sms_response: smsData,
          related_table: relatedTable,
          related_id: relatedId || null,
          sent_by: user.id,
        });

        if (success) sentCount++;
      } catch (smsErr) {
        console.error("SMS send error for", mobile, smsErr);
        await adminClient.from("sms_logs").insert({
          recipient_phone: mobile,
          message,
          status: "failed",
          sms_response: { error: String(smsErr) },
          related_table: relatedTable,
          related_id: relatedId || null,
          sent_by: user.id,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: phones.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Notify SMS error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
