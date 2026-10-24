# UMS Hub — API & Integrations Reference

## Supabase Edge Functions

All Edge Functions run on the Deno runtime and are deployed to the same Supabase project. They are called from the frontend via `supabase.functions.invoke()` or directly via `fetch` to `https://<project-ref>.supabase.co/functions/v1/<name>`.

Unless noted, every function requires a `Bearer <JWT>` header (`Authorization`). CORS headers allow all origins.

---

### `admin-create-user`

**Purpose:** Create a new Supabase auth user with an email, password, full name, and role. Uses the service role key to bypass email confirmation.

**Auth required:** Yes — caller must have `admin` role in `user_roles`.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Jane Doe",
  "role": "staff"
}
```

**Response:**
```json
{ "success": true, "user_id": "<uuid>" }
// or on error:
{ "error": "A user with this email already exists." }
```

**Notes:**
- Validates admin role via service role client before creating.
- Returns user-friendly messages for `weak_password` and `email_exists` error codes.
- Updates `user_roles` to the specified role after creation.

---

### `admin-reset-password`

**Purpose:** Admin-initiated password reset for another user.

**Auth required:** Yes (admin only).

**Request body:**
```json
{ "user_id": "<uuid>", "new_password": "NewPass456!" }
```

**Response:**
```json
{ "success": true }
```

---

### `admin-update-email`

**Purpose:** Admin updates the email address of an existing user (uses admin Auth API).

**Auth required:** Yes (admin only).

**Request body:**
```json
{ "user_id": "<uuid>", "new_email": "newemail@example.com" }
```

**Response:**
```json
{ "success": true }
```

---

### `complete-password-change`

**Purpose:** Completes a forced password change flow. Marks `profiles.must_reset_password = false` after the user sets a new password.

**Auth required:** Yes (authenticated user).

**Request body:**
```json
{ "new_password": "NewPass789!" }
```

**Response:**
```json
{ "success": true }
```

---

### `reset-user-password`

**Purpose:** Self-service or admin-triggered password reset using a reset token.

**Auth required:** Conditional (JWT or reset token).

**Request body:**
```json
{ "token": "<reset-token>", "new_password": "NewPass!" }
```

**Response:**
```json
{ "success": true }
```

---

### `escalations`

**Purpose:** All escalation lifecycle operations — create, escalate, acknowledge, resolve, reopen, comment, and automatic tick (cron-driven).

**Auth required:** Yes for user actions. The `tick` action can be called without auth (from a cron job).

**Request body:**
```json
{
  "action": "create" | "escalate" | "acknowledge" | "resolve" | "reopen" | "comment" | "tick",
  "title": "Escalation title",
  "source_table": "incidents" | "vendor_issues",
  "source_id": "<uuid>",
  "assigned_to": "<uuid>",
  "id": "<escalation-uuid>",
  "note": "Optional note"
}
```

**Actions:**

| Action | Description |
|---|---|
| `create` | Creates a new escalation at level 1, sends notifications |
| `escalate` | Moves escalation up one level, notifies recipients at new level |
| `acknowledge` | Sets status to `acknowledged`, logs event |
| `resolve` | Sets status to `resolved`, sets `resolved_at` |
| `reopen` | Sets status back to `open` |
| `comment` | Logs a comment event without changing status |
| `tick` | Cron action: auto-escalates all open escalations past their `level_deadline` |

**On each transition:** Writes to `escalation_events`, reads `escalation_levels` to find recipients, sends in-app notifications to all recipients, sends SMS via TextSMS Kenya to recipients with phone numbers.

**Response:**
```json
{ "success": true }
// or for tick:
{ "success": true, "moved": 3 }
```

---

### `export-database`

**Purpose:** Full database export as a ZIP file (schema DDL + table data as SQL INSERTs + storage file copies + Edge Function source + FK graph JSONL + validation report). Streams progress via **Server-Sent Events (SSE)**.

**Auth required:** Yes — caller must be the super admin (`amsterntechhub@gmail.com`).

**Request body:**
```json
{ "includeFiles": true }
```

**Response:** `text/event-stream` with events:

| Event | Data shape |
|---|---|
| `progress` | `{ phase, message, pct, ...extras }` |
| `done` | `{ filename, size_bytes, signed_url, validation, manifest }` |
| `error` | `{ message }` |

The resulting ZIP is uploaded to the `db-exports` storage bucket and a 30-minute signed URL is returned. Structure inside the ZIP:

```
schema.sql             — Full DDL (tables, FKs, indexes, functions, triggers, RLS)
all-data.sql           — Combines all per-table SQL files
full.sql               — schema + data in one file
data/<table>.sql       — Per-table INSERT statements
knowledge/
  relationships.jsonl  — FK graph
  documents.jsonl      — Document index with file paths
  task_files.jsonl     — Task file index
  profiles.jsonl       — User profile index
  storage-index.jsonl  — Storage file index with signed URLs
edge_functions/<name>/index.ts
manifest.json          — Row counts, error log
validation.json        — Automated integrity checks
SUMMARY.md
LLM_CONTEXT.md
README.md
```

---

### `notify-sms`

**Purpose:** Send an SMS notification for a specific event type (reminders, tasks, etc.).

**Auth required:** Yes.

**Request body:**
```json
{
  "mobile": "0712345678",
  "message": "Your document is ready for review.",
  "type": "reminder",
  "recipientName": "John Doe"
}
```

**Response:**
```json
{ "success": true }
```

---

### `ocr-extract`

**Purpose:** Extract text from a document stored in Supabase Storage. Currently a stub — returns mock extracted text. Integrate a real OCR service using the `OCR_API_KEY` environment variable.

**Auth required:** Yes (service role internally).

**Request body:**
```json
{ "document_id": "<uuid>" }
```

**Response:**
```json
{ "success": true, "document_id": "<uuid>", "chars": 123 }
```

Upserts a row in `document_text_content` with `extraction_status = 'completed'`.

---

### `ops-send-sms`

**Purpose:** Operations Hub variant of SMS sending. Sends an SMS for ops events (escalations, password reminders).

**Auth required:** Yes.

**Request body:** Same as `send-sms`.

---

### `password-reminders`

**Purpose:** Cron job function — scans all `passwords` records and sends SMS + in-app notifications at 14, 7, 2, and 0 days before expiry, then daily once overdue (up to 14 days past expiry).

**Auth required:** No (called by cron, uses service role internally).

**Request body:** Empty `{}`.

**Notification logic:**
- Reminder at 14, 7, 2, 0 days before `expiry_date`
- Daily reminders for up to 14 days after expiry
- Skips if `last_notified_at` was less than 20 hours ago
- Sends to `passwords.phone_number`, `owner_user_id` profile phone, and `backup_user_id` profile phone (backup only at ≤2 days or overdue)

**Response:**
```json
{ "success": true, "processed": 5, "results": [...] }
```

---

### `run-scheduled-export`

**Purpose:** Cron-triggered export runner. Reads due `export_schedules` records and executes the corresponding export, emailing results.

**Auth required:** No (cron trigger, uses service role).

**Response:**
```json
{ "success": true, "ran": 2 }
```

---

### `seed-admin`

**Purpose:** Seeds the initial super admin user. Only used during first-time setup (`/setup` page).

**Auth required:** No (`verify_jwt = false` in config.toml).

**Request body:**
```json
{
  "email": "amsterntechhub@gmail.com",
  "password": "InitialPass!",
  "full_name": "Super Admin"
}
```

**Response:**
```json
{ "success": true, "user_id": "<uuid>" }
```

---

### `send-push`

**Purpose:** Deliver a Web Push notification to a subscribed browser endpoint.

**Auth required:** Yes.

**Request body:**
```json
{
  "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } },
  "title": "New document uploaded",
  "body": "Customer XYZ uploaded a document.",
  "url": "/docs/documents"
}
```

**Response:**
```json
{ "success": true, "message": "Push notification queued (stub)" }
```

**Note:** Currently a stub. To enable real push delivery, integrate the Web Push protocol in this function using `PUSH_VAPID_PRIVATE_KEY` secret and a Deno-compatible VAPID library.

---

### `send-sms`

**Purpose:** Send a single SMS via TextSMS Kenya API, log result to `sms_logs`.

**Auth required:** Yes.

**Request body:**
```json
{
  "mobile": "0712345678",
  "message": "Your document is ready.",
  "type": "general",
  "recipientName": "John Doe"
}
```

**Phone normalisation:** Strips spaces and non-numeric chars, removes leading `+`, converts `0XXXXXXXXX` to `254XXXXXXXXX`.

**Response:** Raw TextSMS API response JSON.

---

### `trigger-webhook`

**Purpose:** POST a payload to a configured webhook URL with HMAC-SHA256 signature.

**Auth required:** No (called internally from other functions or DB triggers).

**Request body:**
```json
{
  "webhook_id": "<uuid>",
  "event": "document.uploaded",
  "payload": { "document_id": "<uuid>", "customer_id": "<uuid>" }
}
```

**Delivery headers:**
- `Content-Type: application/json`
- `X-UMSHub-Signature: <hmac-sha256-hex>`
- `X-UMSHub-Event: <event>`

**Response:**
```json
{ "success": true, "status": 200 }
```

---

### `watermark-download`

**Purpose:** Generate a signed, watermarked download URL for a document. Returns a 5-minute signed URL plus a watermark text string (`"Downloaded by: <name> | <date>"`). Client applies the watermark visually. Logs a `watermarked_download` audit event.

**Auth required:** Yes.

**Request body:**
```json
{
  "filePath": "path/in/storage/bucket",
  "userName": "Jane Doe",
  "userEmail": "jane@example.com"
}
```

**Response:**
```json
{
  "signedUrl": "https://...supabase.co/storage/v1/...",
  "watermarkText": "Downloaded by: Jane Doe | 2026-07-20"
}
```

---

## TextSMS Kenya API Integration

UMS Hub sends SMS messages through the [TextSMS Kenya](https://sms.textsms.co.ke) API.

**Endpoint:** `POST https://sms.textsms.co.ke/api/services/sendsms/`

**Request format:**
```json
{
  "apikey": "<TEXTSMS_API_KEY>",
  "partnerID": "<TEXTSMS_PARTNER_ID>",
  "message": "SMS body text",
  "shortcode": "<TEXTSMS_SHORTCODE>",
  "mobile": "254712345678"
}
```

**Phone number format:** Always normalised to `254XXXXXXXXX` (international format, no leading `+`, no spaces).

**Success indicator:** Response code `"0200"` in `responses[0]["respose-code"]` (note the typo in the API — `respose` not `response`) or `result.success === true`.

**Supabase secrets required:**
```
TEXTSMS_API_KEY=<api-key>
TEXTSMS_PARTNER_ID=<partner-id>
TEXTSMS_SHORTCODE=<shortcode>   # e.g. "UMS PREPAID"
```

**Where SMS is sent:**
- `send-sms` — general document/task notifications
- `notify-sms` — reminder notifications
- `ops-send-sms` — Operations Hub events
- `escalations` — escalation level changes
- `password-reminders` — credential expiry warnings

All sent messages are logged to `sms_logs` with status (`delivered`, `sent`, `failed`) and the raw API response.

---

## Supabase Storage

### Buckets

| Bucket | Access | Purpose |
|---|---|---|
| `documents` | Private (RLS via signed URLs) | Customer documents uploaded in Document Vault |
| `task-files` | Private | File attachments on tasks |
| `avatars` | Public | User profile photos |
| `db-exports` | Private (super admin only) | Database export ZIP files |

### File Path Conventions

**documents bucket:**
```
<customer_id>/<uuid>/<filename>
```
Example: `a1b2c3-...../doc-uuid/contract.pdf`

**task-files bucket:**
```
<task_id>/<uuid>/<filename>
```

**avatars bucket:**
```
<user_id>/<filename>
```

**db-exports bucket:**
```
<user_id>/ums-export-<ISO-timestamp>.zip
```

### Access Patterns

- **Upload:** `supabase.storage.from('documents').upload(path, file)`
- **Signed URL (download):** `supabase.storage.from('documents').createSignedUrl(path, 300)` (5-minute expiry)
- **Watermarked download:** via `watermark-download` Edge Function (also 5-minute expiry)
- **Public URL (avatars):** `supabase.storage.from('avatars').getPublicUrl(path)`

---

## Supabase Realtime

Supabase Realtime (Postgres Changes) subscriptions are used in two places:

### `user_xp` — Gamification updates
- **Channel:** `'gamification-' + Math.random().toString(36).slice(2)` (unique per hook instance)
- **Table:** `user_xp`
- **Filter:** `user_id=eq.<current_user_id>`
- **Events:** `*` (INSERT, UPDATE, DELETE)
- **Used in:** `src/hooks/useGamification.ts` — triggers a full refetch when XP changes

### `chat_messages` — Team Chat
- **Channel:** `realtime:chat_messages`
- **Table:** `chat_messages`
- **Events:** INSERT
- **Used in:** `src/hooks/useChat.ts` — appends new messages to the chat feed in real time

---

## Web Push API

### Subscription Flow

1. User visits Settings → Push Notifications section.
2. Browser requests notification permission.
3. Client calls `navigator.serviceWorker.registration.pushManager.subscribe()` with the VAPID public key.
4. Subscription object (`{ endpoint, keys: { p256dh, auth } }`) is stored in `push_subscriptions` table.
5. When a notification is triggered, the `send-push` Edge Function is called with the subscription and payload.

### VAPID Setup

To enable real push delivery:

1. Generate a VAPID key pair:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Set the public key in the frontend (`.env`):
   ```
   VITE_VAPID_PUBLIC_KEY=<public-key>
   ```
3. Set the private key as a Supabase secret:
   ```bash
   npx supabase secrets set PUSH_VAPID_PRIVATE_KEY=<private-key>
   ```
4. Implement the actual push delivery in `supabase/functions/send-push/index.ts` using a Deno-compatible Web Push library.

### Hook
`src/hooks/usePushNotifications.ts` — manages subscription state, subscribes/unsubscribes, calls `send-push`.

---

## Export APIs

Export utilities are available throughout the app for CSV, Excel, and PDF generation.

### `src/lib/export-utils.ts` / `src/lib/exportUtils.ts`

**CSV export:**
```typescript
exportToCSV(data: object[], filename: string): void
```
Converts an array of objects to CSV and triggers a browser download.

**Excel export:**
```typescript
exportToExcel(data: object[], filename: string, sheetName?: string): void
```
Uses the `xlsx` library to create an `.xlsx` file.

**PDF export:**
```typescript
exportToPDF(columns: string[], rows: any[][], title: string, filename: string): void
```
Uses `jsPDF` + `jspdf-autotable` to generate a PDF table.

### Where exports are available

| Page | Formats |
|---|---|
| Reports (`/docs/reports`) | CSV, Excel, PDF |
| Audit Logs (`/docs/audit-logs`) | CSV |
| Documents (`/docs/documents`) | CSV |
| Customers (`/docs/customers`) | CSV |
| Vendor Issues (`/ops/vendor-issues`) | CSV |
| Incidents (`/ops/incidents`) | CSV, PDF |
| Analytics pages | CSV |
| Database Export (`/docs/database-export`) | ZIP (via Edge Function) |

### Scheduled Exports (`run-scheduled-export`)

Admin configures export schedules in `/docs/export-scheduler`. The Edge Function `run-scheduled-export` is called by a Supabase cron job (configured in `supabase/migrations/20261014120000_auto_escalation_cron.sql`). It reads due `export_schedules` rows, generates the export, and optionally emails it to the configured recipients.
