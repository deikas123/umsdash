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
  relatedTable: string | null,
  relatedId: string | null,
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
    userid: userId,
    password: smsPassword,
    mobile,
    msg: finalMessage,
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
  } catch (e) {
    smsData = { error: String(e) };
  }

  await adminClient.from("sms_logs").insert({
    recipient_phone: mobile,
    recipient_name: recipientName,
    message: finalMessage,
    sms_type: smsType,
    status: success ? "sent" : "failed",
    sent_by: null,
    related_table: relatedTable,
    related_id: relatedId,
    sms_response: smsData,
  });
}

async function insertInApp(
  userId: string,
  title: string,
  message: string,
  type: string,
  link: string | null,
  adminClient: ReturnType<typeof createClient>,
): Promise<void> {
  await adminClient.from("in_app_notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    link,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { event, record_id } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: "event is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -----------------------------------------------------------------------
    // leave_submitted
    // -----------------------------------------------------------------------
    if (event === "leave_submitted") {
      const { data: leave } = await adminClient
        .from("hr_leave_requests")
        .select(`
          id, leave_type, start_date, end_date, employee_id,
          hr_employees!inner(full_name, phone, user_id, department_id)
        `)
        .eq("id", record_id)
        .maybeSingle();

      if (!leave) throw new Error(`leave request ${record_id} not found`);

      const emp = (leave as { hr_employees: { full_name: string; phone: string | null; user_id: string | null; department_id: string | null } }).hr_employees;
      const empName = emp.full_name;
      const empPhone = emp.phone;
      const empUserId = emp.user_id;

      // SMS to employee
      if (empPhone) {
        await sendSms(
          empPhone,
          `UMS Hub: Your ${leave.leave_type} leave request (${leave.start_date} to ${leave.end_date}) has been submitted and is pending approval.`,
          "hr_leave_requests",
          record_id,
          empName,
          "leave_submitted",
          adminClient,
        );
      }
      if (empUserId) {
        await insertInApp(
          empUserId,
          "Leave Request Submitted",
          `Your ${leave.leave_type} leave request from ${leave.start_date} to ${leave.end_date} is pending approval.`,
          "leave",
          null,
          adminClient,
        );
      }

      // SMS to HOD
      if (emp.department_id) {
        const { data: dept } = await adminClient
          .from("hr_departments")
          .select("head_employee_id")
          .eq("id", emp.department_id)
          .maybeSingle();

        if (dept?.head_employee_id && dept.head_employee_id !== leave.employee_id) {
          const { data: hod } = await adminClient
            .from("hr_employees")
            .select("full_name, phone, user_id")
            .eq("id", dept.head_employee_id)
            .maybeSingle();

          if (hod?.phone) {
            await sendSms(
              hod.phone,
              `UMS Hub: ${empName} has submitted a ${leave.leave_type} leave request (${leave.start_date} to ${leave.end_date}). Pending your approval.`,
              "hr_leave_requests",
              record_id,
              hod.full_name,
              "leave_submitted",
              adminClient,
            );
          }
          if (hod?.user_id) {
            await insertInApp(
              hod.user_id,
              "Leave Request Pending Approval",
              `${empName} submitted a ${leave.leave_type} leave request from ${leave.start_date} to ${leave.end_date}.`,
              "leave",
              null,
              adminClient,
            );
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // leave_status_changed
    // -----------------------------------------------------------------------
    else if (event === "leave_status_changed") {
      const { data: leave } = await adminClient
        .from("hr_leave_requests")
        .select(`
          id, leave_type, start_date, end_date, status,
          hr_employees!inner(full_name, phone, user_id)
        `)
        .eq("id", record_id)
        .maybeSingle();

      if (!leave) throw new Error(`leave request ${record_id} not found`);

      const emp = (leave as { hr_employees: { full_name: string; phone: string | null; user_id: string | null } }).hr_employees;

      if (emp.phone) {
        await sendSms(
          emp.phone,
          `UMS Hub: Your ${leave.leave_type} leave request (${leave.start_date} to ${leave.end_date}) has been ${leave.status}.`,
          "hr_leave_requests",
          record_id,
          emp.full_name,
          "leave_status_changed",
          adminClient,
        );
      }
      if (emp.user_id) {
        await insertInApp(
          emp.user_id,
          "Leave Request Updated",
          `Your ${leave.leave_type} leave request from ${leave.start_date} to ${leave.end_date} has been ${leave.status}.`,
          "leave",
          null,
          adminClient,
        );
      }
    }

    // -----------------------------------------------------------------------
    // overtime_submitted
    // -----------------------------------------------------------------------
    else if (event === "overtime_submitted") {
      const { data: ot } = await adminClient
        .from("hr_overtime_requests")
        .select(`
          id, overtime_date, hours_requested, employee_id,
          hr_employees!inner(full_name, phone, user_id, department_id)
        `)
        .eq("id", record_id)
        .maybeSingle();

      if (!ot) throw new Error(`overtime request ${record_id} not found`);

      const emp = (ot as { hr_employees: { full_name: string; phone: string | null; user_id: string | null; department_id: string | null } }).hr_employees;

      if (emp.phone) {
        await sendSms(
          emp.phone,
          `UMS Hub: Your overtime request for ${ot.overtime_date} (${ot.hours_requested}hrs) has been submitted and is pending approval.`,
          "hr_overtime_requests",
          record_id,
          emp.full_name,
          "overtime_submitted",
          adminClient,
        );
      }
      if (emp.user_id) {
        await insertInApp(
          emp.user_id,
          "Overtime Request Submitted",
          `Your overtime request for ${ot.overtime_date} (${ot.hours_requested} hrs) is pending approval.`,
          "overtime",
          null,
          adminClient,
        );
      }

      // SMS to HOD
      if (emp.department_id) {
        const { data: dept } = await adminClient
          .from("hr_departments")
          .select("head_employee_id")
          .eq("id", emp.department_id)
          .maybeSingle();

        if (dept?.head_employee_id && dept.head_employee_id !== ot.employee_id) {
          const { data: hod } = await adminClient
            .from("hr_employees")
            .select("full_name, phone, user_id")
            .eq("id", dept.head_employee_id)
            .maybeSingle();

          if (hod?.phone) {
            await sendSms(
              hod.phone,
              `UMS Hub: ${emp.full_name} has submitted an overtime request for ${ot.overtime_date} (${ot.hours_requested}hrs). Pending your approval.`,
              "hr_overtime_requests",
              record_id,
              hod.full_name,
              "overtime_submitted",
              adminClient,
            );
          }
          if (hod?.user_id) {
            await insertInApp(
              hod.user_id,
              "Overtime Request Pending Approval",
              `${emp.full_name} submitted an overtime request for ${ot.overtime_date} (${ot.hours_requested} hrs).`,
              "overtime",
              null,
              adminClient,
            );
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // overtime_status_changed
    // -----------------------------------------------------------------------
    else if (event === "overtime_status_changed") {
      const { data: ot } = await adminClient
        .from("hr_overtime_requests")
        .select(`
          id, overtime_date, hours_requested, status,
          hr_employees!inner(full_name, phone, user_id)
        `)
        .eq("id", record_id)
        .maybeSingle();

      if (!ot) throw new Error(`overtime request ${record_id} not found`);

      const emp = (ot as { hr_employees: { full_name: string; phone: string | null; user_id: string | null } }).hr_employees;

      if (emp.phone) {
        await sendSms(
          emp.phone,
          `UMS Hub: Your overtime request for ${ot.overtime_date} (${ot.hours_requested}hrs) has been ${ot.status}.`,
          "hr_overtime_requests",
          record_id,
          emp.full_name,
          "overtime_status_changed",
          adminClient,
        );
      }
      if (emp.user_id) {
        await insertInApp(
          emp.user_id,
          "Overtime Request Updated",
          `Your overtime request for ${ot.overtime_date} (${ot.hours_requested} hrs) has been ${ot.status}.`,
          "overtime",
          null,
          adminClient,
        );
      }
    }

    // -----------------------------------------------------------------------
    // announcement_published
    // -----------------------------------------------------------------------
    else if (event === "announcement_published") {
      const { data: ann } = await adminClient
        .from("hr_announcements")
        .select("id, title, content, audience")
        .eq("id", record_id)
        .maybeSingle();

      if (!ann) throw new Error(`announcement ${record_id} not found`);

      // Fetch active employees with a user_id to check sms_preferences
      const { data: employees } = await adminClient
        .from("hr_employees")
        .select("id, full_name, phone, user_id, department_id")
        .eq("status", "active");

      if (!employees || employees.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter by audience (all | department:<id>)
      const audience: string = (ann as { audience?: string }).audience || "all";
      const targetEmployees = audience === "all"
        ? employees
        : employees.filter((e: { department_id: string | null }) =>
          audience.startsWith("department:") ? e.department_id === audience.split(":")[1] : true
        );

      const msgBase = `UMS Hub Announcement: ${ann.title} — ${ann.content}`;

      for (const emp of targetEmployees) {
        if (!emp.phone) continue;

        // Check sms_preferences.notify_announcements (default: true if no row)
        if (emp.user_id) {
          const { data: prefs } = await adminClient
            .from("sms_preferences")
            .select("notify_announcements")
            .eq("user_id", emp.user_id)
            .maybeSingle();

          if (prefs && prefs.notify_announcements === false) continue;
        }

        await sendSms(
          emp.phone,
          msgBase,
          "hr_announcements",
          record_id,
          emp.full_name,
          "announcement",
          adminClient,
        );

        if (emp.user_id) {
          await insertInApp(
            emp.user_id,
            `Announcement: ${ann.title}`,
            ann.content,
            "announcement",
            null,
            adminClient,
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // document_uploaded
    // -----------------------------------------------------------------------
    else if (event === "document_uploaded") {
      const { data: doc } = await adminClient
        .from("hr_employee_documents")
        .select(`
          id, document_name, employee_id,
          hr_employees!inner(full_name, phone, user_id)
        `)
        .eq("id", record_id)
        .maybeSingle();

      if (!doc) throw new Error(`document ${record_id} not found`);

      const emp = (doc as { hr_employees: { full_name: string; phone: string | null; user_id: string | null } }).hr_employees;

      if (emp.phone) {
        await sendSms(
          emp.phone,
          `UMS Hub: A document "${doc.document_name}" has been uploaded to your profile. Login to view it.`,
          "hr_employee_documents",
          record_id,
          emp.full_name,
          "document_uploaded",
          adminClient,
        );
      }
      if (emp.user_id) {
        await insertInApp(
          emp.user_id,
          "Document Uploaded",
          `A document "${doc.document_name}" has been uploaded to your profile.`,
          "document",
          null,
          adminClient,
        );
      }
    }

    // -----------------------------------------------------------------------
    // task_assigned
    // -----------------------------------------------------------------------
    else if (event === "task_assigned") {
      const { user_id, task_id } = body;
      if (!user_id || !task_id) throw new Error("user_id and task_id are required for task_assigned");

      // Check sms_preferences.notify_tasks (default: true if no row)
      const { data: prefs } = await adminClient
        .from("sms_preferences")
        .select("notify_tasks")
        .eq("user_id", user_id)
        .maybeSingle();

      if (prefs && prefs.notify_tasks === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "notify_tasks disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, phone_number, phone")
        .eq("user_id", user_id)
        .maybeSingle();

      const phone = (profile?.phone_number ?? profile?.phone) || null;
      const fullName = profile?.full_name || "User";

      const { data: task } = await adminClient
        .from("tasks")
        .select("title")
        .eq("id", task_id)
        .maybeSingle();

      const taskTitle = task?.title || "a task";

      if (phone) {
        await sendSms(
          phone,
          `UMS Hub: You have been assigned a task: "${taskTitle}". Login to view details.`,
          "tasks",
          task_id,
          fullName,
          "task_assigned",
          adminClient,
        );
      }

      await insertInApp(
        user_id,
        "New Task Assigned",
        `You have been assigned: "${taskTitle}". Login to view details.`,
        "task",
        null,
        adminClient,
      );
    }

    else {
      return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("hr-notify-sms error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
