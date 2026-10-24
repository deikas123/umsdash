# API & Integrations

## Edge Functions

All Edge Functions are Deno-based and deployed to `https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/<name>`. They are invoked from the frontend via `supabase.functions.invoke(name, { body })`. Every function handles CORS preflight (`OPTIONS`) and verifies the caller's JWT before acting.

---

### `admin-create-user`

**Purpose**: Create a new Supabase Auth user from the admin panel without requiring an email invite flow.

**Method**: `POST`

**Auth**: Requires admin role (verified against `user_roles` table).

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "strongpassword123",
  "full_name": "Jane Doe",
  "role": "staff"
}
```

**Response**:
```json
{ "user": { "id": "uuid", "email": "..." } }
```
or `{ "error": "message" }` on failure.

**Notes**: Uses `auth.admin.createUser` with `email_confirm: true`. If `role` differs from default, updates `user_roles` record.

---

### `admin-reset-password`

**Purpose**: Admin resets another user's password and flags their account for mandatory password change on next login.

**Method**: `POST`

**Auth**: Requires admin role.

**Request body**:
```json
{
  "user_id": "uuid",
  "new_password": "temporary1234"
}
```

**Response**: `{ "success": true }` or `{ "error": "message" }`

**Notes**: Sets `app_metadata.must_change_password = true` on the target user. Password must be 10–72 characters.

---

### `admin-update-email`

**Purpose**: Admin changes another user's email address, bypassing the normal email-confirmation flow.

**Method**: `POST`

**Auth**: Requires admin role.

**Request body**:
```json
{
  "user_id": "uuid",
  "new_email": "newemail@example.com"
}
```

**Response**: `{ "success": true }` or `{ "error": "message" }`

---

### `complete-password-change`

**Purpose**: Called by a user who has been forced to change their password. Updates the password and clears the `must_change_password` flag.

**Method**: `POST`

**Auth**: Requires authenticated user JWT.

**Request body**:
```json
{
  "new_password": "newstrongpassword123"
}
```

**Response**: `{ "success": true }` or `{ "error": "message" }`

---

### `escalations`

**Purpose**: Handles escalation lifecycle operations — create, advance level, assign, resolve, and auto-advance overdue escalations via cron.

**Method**: `POST`

**Auth**: Authenticated user JWT.

**Actions**: Dispatched via `action` field in the request body:
- `create` — opens a new escalation linked to a `vendor_issues` or `incidents` record
- `advance` — moves to the next escalation level and sends SMS to target-role users
- `assign` — assigns escalation to a specific user
- `resolve` — marks escalation resolved
- `auto_advance` — called by Supabase cron; advances all escalations past their `level_deadline`

**SMS**: Uses TextSMS Kenya. Phone numbers normalized to `254XXXXXXXXX` format. Shortcode: `UMS PREPAID`.

---

### `export-database`

**Purpose**: Generates a full ZIP archive containing schema DDL, data as SQL INSERT statements, and storage bucket file listings. Uploads the ZIP to the `db-exports` private bucket. Streams progress via Server-Sent Events (SSE).

**Method**: `POST`

**Auth**: Restricted to `amsterntechhub@gmail.com` (super admin check).

**Response**: SSE stream of progress events, then a final signed URL for the ZIP download (valid 5 minutes).

**Included tables**: All `public` tables in FK-safe insertion order.

**Included buckets**: `documents`, `task-files`, `avatars`

---

### `notify-sms`

**Purpose**: Sends an SMS notification to one or more users based on their `sms_preferences` settings (task/reminder notifications).

**Method**: `POST`

**Auth**: Authenticated user JWT.

**Request body**:
```json
{
  "type": "task_assigned",
  "user_ids": ["uuid1", "uuid2"],
  "message": "You have been assigned a new task."
}
```

---

### `ocr-extract`

**Purpose**: Downloads a document from the `documents` storage bucket and extracts its text content, storing the result in `document_text_content` for full-text search.

**Method**: `POST`

**Auth**: Authenticated user JWT (service role key used internally).

**Request body**:
```json
{ "document_id": "uuid" }
```

**Response**: `{ "success": true, "text": "extracted text..." }`

**Notes**: Currently contains a stub implementation. Replace with a real OCR provider (e.g., Google Vision, Tesseract) to enable production text extraction.

---

### `ops-send-sms`

**Purpose**: Sends SMS from the Operations Hub context (e.g., escalation notifications, password expiry alerts).

**Method**: `POST`

**Auth**: Authenticated user JWT. Caller must be admin or staff.

**Request body**:
```json
{
  "phone": "0712345678",
  "message": "Your password for SystemX expires in 2 days.",
  "type": "password_expiry"
}
```

**SMS provider**: TextSMS Kenya (`https://sms.textsms.co.ke/api/services/sendsms/`), shortcode `UMS PREPAID`.

---

### `password-reminders`

**Purpose**: Cron-invoked function that scans the `passwords` table and sends SMS reminders at 14, 7, 2, and 0 days before expiry.

**Method**: `POST` (invoked by Supabase cron scheduler)

**Auth**: Service role (no user JWT needed for cron invocation).

**Behavior**: For each password record, checks if `expiry_date` falls within a reminder window and `last_notified_at` has not already covered that window. Sends SMS to `phone_number`, `owner_user_id`, and `backup_user_id`. Updates `last_notified_at`.

---

### `reset-user-password`

**Purpose**: Allows a user to reset their own password using a reset token (not an admin action).

**Method**: `POST`

**Auth**: Reset token passed in body.

---

### `run-scheduled-export`

**Purpose**: Executes a specific export schedule by ID, generates the export file (CSV/Excel), and emails it to `email_to` recipients. Called by Supabase cron based on `next_run_at`.

**Method**: `POST`

**Request body**:
```json
{ "schedule_id": "uuid" }
```

**Notes**: Updates `last_run_at` and calculates `next_run_at` after execution.

---

### `seed-admin`

**Purpose**: One-time setup function called from `/setup` to bootstrap the first admin user. Only works when no admin users exist.

**Method**: `POST`

**Request body**:
```json
{
  "email": "admin@example.com",
  "password": "securepassword",
  "fullName": "Admin Name"
}
```

---

### `send-push`

**Purpose**: Sends a Web Push notification to a browser subscription endpoint.

**Method**: `POST`

**Request body**:
```json
{
  "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } },
  "title": "Notification title",
  "body": "Notification body",
  "url": "/docs/tasks"
}
```

**Notes**: Currently a stub implementation. Integrate a real Web Push library (e.g., `web-push`) with VAPID keys to enable production push delivery.

---

### `send-sms`

**Purpose**: General-purpose SMS send function used by Document Vault features (task assignments, reminder notifications, customer notifications).

**Method**: `POST`

**Auth**: Authenticated user Bearer token.

**Request body**:
```json
{
  "to": "0712345678",
  "message": "Your document is ready.",
  "type": "document_ready"
}
```

**SMS provider**: TextSMS Kenya. Phone normalized to `254XXXXXXXXX`. Shortcode: `UMS PREPAID`. Response logged to `sms_logs` table.

---

### `trigger-webhook`

**Purpose**: Fires an outbound webhook to a configured URL with HMAC-SHA256 signature verification.

**Method**: `POST`

**Request body**:
```json
{
  "webhook_id": "uuid",
  "event": "document.uploaded",
  "payload": { ... }
}
```

**Signature header**: `X-UMS-Signature: sha256=<hmac>`. Recipients should verify this header using the webhook secret.

---

### `watermark-download`

**Purpose**: Generates a signed download URL for a document from the `documents` bucket, optionally applying a watermark to PDFs with the user's name and timestamp.

**Method**: `POST`

**Auth**: Authenticated user Bearer token.

**Request body**:
```json
{ "file_path": "documents/customer/filename.pdf" }
```

**Response**: `{ "url": "https://..." }` — signed URL valid for 5 minutes.

---

## TextSMS Kenya Integration

| Property | Value |
|---|---|
| API endpoint | `https://sms.textsms.co.ke/api/services/sendsms/` |
| Method | POST (JSON) |
| Shortcode | `UMS PREPAID` |
| Phone format | `254XXXXXXXXX` (local `0XXX` prefix auto-converted) |
| Auth fields | `apikey`, `partnerID` |
| Required secrets | `TEXTSMS_API_KEY`, `TEXTSMS_PARTNER_ID` |

All SMS sends are logged to the `sms_logs` table with the full API response.

---

## Supabase Storage Buckets

| Bucket | Access | Used by |
|---|---|---|
| `documents` | private | Document Vault — uploaded documents and versions |
| `task-files` | private | Task file attachments |
| `avatars` | private | User profile avatars |
| `db-exports` | private | Database export ZIP archives (super admin) |

All buckets are private — access requires a signed URL generated by the server. Direct public URLs are not enabled.
