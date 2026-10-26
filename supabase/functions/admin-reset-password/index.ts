import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_API_URL = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";

function normalizePhone(phone: string): string {
  let m = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (m.startsWith("0")) m = "254" + m.slice(1);
  return m;
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized" });

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Admin access required" });

    const body = await req.json().catch(() => ({}));
    const user_id = typeof body.user_id === "string" ? body.user_id : "";
    const new_password = typeof body.new_password === "string" ? body.new_password : "";
    if (!/^[0-9a-f-]{36}$/i.test(user_id)) return json({ error: "Invalid user" });
    if (new_password.length < 10 || new_password.length > 72) return json({ error: "Password must be 10–72 characters" });

    const { data: target } = await adminClient.auth.admin.getUserById(user_id);
    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
      app_metadata: { ...(target?.user?.app_metadata ?? {}), must_change_password: true },
    });
    if (error) {
      const e = error as { code?: string; status?: number; message: string };
      if (e.code === "weak_password" || e.status === 422) {
        return json({ error: "This password is too weak or has appeared in a data leak. Please choose a different, unique password." });
      }
      return json({ error: e.message });
    }

    // Post-reset: send security alert SMS + in-app notification
    try {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, phone_number, phone")
        .eq("user_id", user_id)
        .maybeSingle();

      const rawPhone: string | null = (profile?.phone_number ?? profile?.phone) || null;

      if (rawPhone) {
        const mobile = normalizePhone(rawPhone);
        const message = `UMS Hub Security Alert: Your password was reset by an administrator. Temp password: ${new_password}. Change it on login.`;

        const apiKey = Deno.env.get("SMS_API_KEY")!;
        const smsUserId = Deno.env.get("SMS_USER_ID")!;
        const smsPassword = Deno.env.get("SMS_PASSWORD")!;
        const senderId = Deno.env.get("SMS_SENDER_ID") || "UMSKENYA";

        const params = new URLSearchParams({
          userid: smsUserId,
          password: smsPassword,
          mobile,
          msg: message,
          senderid: senderId,
          msgType: "text",
          duplicatecheck: "true",
          output: "json",
          sendMethod: "quick",
        });

        let smsData: unknown = null;
        let success = false;
        try {
          const smsResponse = await fetch(SMS_API_URL, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "cache-control": "no-cache",
              "content-type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });
          smsData = await smsResponse.json();
          success = (smsData as { status?: string })?.status === "S" ||
            (smsData as { status?: string })?.status === "success" ||
            smsResponse.ok;
        } catch (smsErr) {
          smsData = { error: String(smsErr) };
        }

        await adminClient.from("sms_logs").insert({
          recipient_phone: mobile,
          recipient_name: profile?.full_name || null,
          message,
          sms_type: "password_reset",
          status: success ? "sent" : "failed",
          sent_by: caller.id,
          related_table: "auth.users",
          related_id: user_id,
          sms_response: smsData,
        });
      }

      // In-app notification regardless of phone
      await adminClient.from("in_app_notifications").insert({
        user_id,
        title: "Password reset by admin",
        message: "Your password was reset. Login and change it immediately.",
        type: "security",
        is_read: false,
      });
    } catch (notifyErr) {
      // Non-fatal — log and continue
      console.error("Post-reset notification error:", notifyErr);
    }

    return json({ success: true });
  } catch (error: unknown) {
    console.error("Admin reset password error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});
