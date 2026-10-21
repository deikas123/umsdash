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
    return json({ success: true });
  } catch (error: unknown) {
    console.error("Admin reset password error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});
