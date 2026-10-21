import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Esc = { id: string; title: string; current_level: number; status: string; assigned_to: string | null; created_by: string | null; source_table: string };

async function levels() {
  const { data } = await db.from("escalation_levels").select("*").order("level");
  return data || [];
}

async function deadlineFor(level: number) {
  const l = (await levels()).find((x: any) => x.level === level);
  return l?.hours_to_next ? new Date(Date.now() + l.hours_to_next * 3600_000).toISOString() : null;
}

async function recipients(e: Esc): Promise<string[]> {
  const ids = new Set<string>();
  const lv = (await levels()).find((x: any) => x.level === e.current_level);
  if (e.current_level === 1 || !lv?.target_role) {
    if (e.assigned_to) ids.add(e.assigned_to);
    else if (e.created_by) ids.add(e.created_by);
  }
  if (lv?.target_role) {
    const roles = lv.target_role === "manager" ? ["manager", "admin"] : ["admin"];
    const { data } = await db.from("user_roles").select("user_id").in("role", roles);
    (data || []).forEach((r) => ids.add(r.user_id));
  }
  if (e.assigned_to) ids.add(e.assigned_to);
  return [...ids];
}

async function logEvent(escId: string, event_type: string, actor: string | null, note: string | null, from?: number, to?: number) {
  await db.from("escalation_events").insert({ escalation_id: escId, event_type, actor_id: actor, note, from_level: from ?? null, to_level: to ?? null });
}

async function sendSms(phone: string, message: string, escId: string, actor: string | null) {
  const key = Deno.env.get("TEXTSMS_API_KEY");
  const partner = Deno.env.get("TEXTSMS_PARTNER_ID");
  let mobile = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (mobile.startsWith("0")) mobile = "254" + mobile.slice(1);
  let status = "failed";
  let resp: unknown = null;
  try {
    if (!key || !partner) throw new Error("SMS not configured");
    const r = await fetch("https://sms.textsms.co.ke/api/services/sendsms/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: key, partnerID: partner, message, shortcode: "UMS PREPAID", mobile }),
    });
    resp = await r.json().catch(() => null);
    const code = (resp as any)?.responses?.[0]?.["respose-code"];
    status = r.ok && (code === undefined || code === 200) ? "sent" : "failed";
  } catch (err) {
    resp = { error: String(err) };
  }
  await db.from("sms_logs").insert({ recipient_phone: mobile, message, status, sms_response: resp, related_table: "escalations", related_id: escId, sent_by: actor });
  return status;
}

async function notify(e: Esc, title: string, body: string, actor: string | null) {
  const ids = await recipients(e);
  if (!ids.length) {
    await logEvent(e.id, "notified", null, "No recipients found for this level");
    return;
  }
  await db.from("notifications").insert(ids.map((user_id) => ({ user_id, title, body, link: `/escalations?id=${e.id}` })));
  const { data: profiles } = await db.from("profiles").select("user_id, full_name, phone_number").in("user_id", ids);
  let sent = 0, failed = 0, noPhone = 0;
  for (const p of profiles || []) {
    if (!p.phone_number) { noPhone++; continue; }
    (await sendSms(p.phone_number, `[UMS ESCALATION] ${title}\n${body}`.slice(0, 450), e.id, actor)) === "sent" ? sent++ : failed++;
  }
  noPhone += ids.length - (profiles?.length || 0);
  await logEvent(e.id, "notified", null, `In-app: ${ids.length} user(s). SMS sent: ${sent}, failed: ${failed}, no phone: ${noPhone}`);
}

async function move(e: Esc, to: number, actor: string | null, note: string | null, auto: boolean) {
  const from = e.current_level;
  const level_deadline = await deadlineFor(to);
  await db.from("escalations").update({ current_level: to, status: "open", level_deadline, updated_at: new Date().toISOString() }).eq("id", e.id);
  await logEvent(e.id, auto ? "auto_escalated" : "escalated", actor, note, from, to);
  const lv = (await levels()).find((x: any) => x.level === to);
  await notify({ ...e, current_level: to }, `${e.title} escalated to ${lv?.name || "Level " + to}`, auto ? "Not handled in time — escalated automatically." : (note || "Escalated manually."), actor);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "tick") {
      const maxLevel = Math.max(...(await levels()).map((l: any) => l.level));
      const { data: due } = await db.from("escalations").select("*").eq("status", "open").lt("level_deadline", new Date().toISOString());
      let moved = 0;
      for (const e of due || []) {
        if (e.current_level >= maxLevel) continue;
        await move(e, e.current_level + 1, null, null, true);
        moved++;
      }
      return json({ success: true, moved });
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const { data: { user } } = await createClient(url, anonKey, { global: { headers: { Authorization: auth } } }).auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const note = body.note ? String(body.note).slice(0, 1000) : null;

    if (action === "create") {
      const source_table = String(body.source_table);
      if (!["incidents", "vendor_issues"].includes(source_table)) return json({ error: "Invalid source" }, 400);
      const title = String(body.title || "").slice(0, 200);
      if (!title || !body.source_id) return json({ error: "Missing title or record" }, 400);
      const { data: existing } = await db.from("escalations").select("id").eq("source_id", body.source_id).neq("status", "resolved").maybeSingle();
      if (existing) return json({ error: "This record already has an active escalation." }, 200);
      const { data: e, error } = await db.from("escalations").insert({
        source_table, source_id: body.source_id, title, assigned_to: body.assigned_to || null,
        created_by: user.id, level_deadline: await deadlineFor(1),
      }).select().single();
      if (error) throw error;
      await logEvent(e.id, "created", user.id, note, undefined, 1);
      await notify(e, `New escalation: ${title}`, note || "You have been assigned an escalation.", user.id);
      return json({ success: true, id: e.id });
    }

    const { data: e } = await db.from("escalations").select("*").eq("id", body.id).maybeSingle();
    if (!e) return json({ error: "Escalation not found" }, 200);

    if (action === "escalate") {
      const maxLevel = Math.max(...(await levels()).map((l: any) => l.level));
      if (e.current_level >= maxLevel) return json({ error: "Already at the highest level." }, 200);
      await move(e, e.current_level + 1, user.id, note, false);
    } else if (action === "acknowledge") {
      await db.from("escalations").update({ status: "acknowledged", level_deadline: null, updated_at: new Date().toISOString() }).eq("id", e.id);
      await logEvent(e.id, "acknowledged", user.id, note);
      await notify(e, `${e.title} acknowledged`, note || "Someone is now working on it.", user.id);
    } else if (action === "resolve") {
      await db.from("escalations").update({ status: "resolved", resolved_at: new Date().toISOString(), level_deadline: null, updated_at: new Date().toISOString() }).eq("id", e.id);
      await logEvent(e.id, "resolved", user.id, note);
      await notify(e, `${e.title} resolved`, note || "The escalation has been resolved.", user.id);
    } else if (action === "reopen") {
      await db.from("escalations").update({ status: "open", resolved_at: null, level_deadline: await deadlineFor(e.current_level), updated_at: new Date().toISOString() }).eq("id", e.id);
      await logEvent(e.id, "reopened", user.id, note);
      await notify(e, `${e.title} reopened`, note || "The escalation was reopened.", user.id);
    } else if (action === "comment") {
      if (!note) return json({ error: "Comment is empty" }, 200);
      await logEvent(e.id, "comment", user.id, note);
    } else {
      return json({ error: "Unknown action" }, 400);
    }
    return json({ success: true });
  } catch (err) {
    console.error("escalations error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
