import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" });

    const body = await req.json().catch(() => ({}));
    const new_password = typeof body.new_password === "string" ? body.new_password : "";
    if (new_password.length < 10 || new_password.length > 72) return json({ error: "Password must be 10–72 characters" });

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error } = await adminClient.auth.admin.updateUserById(user.id, {
      password: new_password,
      app_metadata: { ...(user.app_metadata ?? {}), must_change_password: false },
    });
    if (error) {
      const e = error as { code?: string; status?: number; message: string };
      if (e.code === "weak_password" || e.status === 422) {
        return json({ error: "This password is too weak or has appeared in a data leak. Please choose a different, unique password." });
      }
      if (e.code === "same_password") return json({ error: "Please choose a password different from the temporary one." });
      return json({ error: e.message });
    }
    return json({ success: true });
  } catch (error: unknown) {
    console.error("Complete password change error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});
