# UMS Hub — Database Migration Summary

**Project:** mmnpopwzfjyfasvzzatg  
**Dashboard:** https://supabase.com/dashboard/project/mmnpopwzfjyfasvzzatg  
**Migration date:** 21 October 2026  
**Source:** Lovable-hosted Supabase (ums-docs-vault + beacon-tracker-pro)  
**Target:** Deikasgroup-owned Supabase project (`mmnpopwzfjyfasvzzatg`)  

---

## Phase 1 — Schema Migrations

**Status: ✅ SUCCESS**

- 31 migration files applied via `supabase db push`
- 31 public tables confirmed in the target database
- 74 total tables across all schemas (public, auth, storage, realtime, cron, vault)
- Working pooler endpoint confirmed: `aws-0-eu-west-2.pooler.supabase.com:5432`

---

## Phase 2 — Data Restore

**Status: ✅ PARTIAL SUCCESS (all non-empty tables restored)**

### Approach used

The restore ran in two passes:

1. **Full data-only restore via pooler** (`pg_restore --data-only --no-owner --no-acl`) — loaded auth/cron/realtime/storage schema metadata rows, but hit duplicate-key errors on public tables that had already been seeded by the migration, and permission-denied errors on system schemas.
2. **Per-table retry** (`pg_restore -f` → extract SQL → `psql` with `SET session_replication_role = replica`) — bypassed FK constraints and loaded all remaining public-schema rows.

Connection used: `aws-0-eu-west-2.pooler.supabase.com:5432` (pooler, user `postgres.mmnpopwzfjyfasvzzatg`)

### Final row counts (post-retry)

| Table | Rows | Status |
|---|---:|---|
| audit_logs | 4,694 | ✅ RESTORED |
| customers | 6,775 | ✅ RESTORED |
| documents | 2,155 | ✅ RESTORED |
| vendor_issues | 29 | ✅ RESTORED |
| folder_documents | 29 | ✅ RESTORED |
| incidents | 14 | ✅ RESTORED |
| in_app_notifications | 14 | ✅ RESTORED |
| task_assignees | 11 | ✅ RESTORED |
| sms_logs | 11 | ✅ RESTORED |
| sms_preferences | 12 | ✅ RESTORED |
| reminders | 12 | ✅ RESTORED |
| profiles | 18 | ✅ RESTORED |
| user_roles | 18 | ✅ RESTORED |
| folders | 18 | ✅ RESTORED |
| folder_shares | 5 | ✅ RESTORED |
| task_comments | 4 | ✅ RESTORED |
| task_files | 3 | ✅ RESTORED |
| tasks | 3 | ✅ RESTORED |
| ops_notifications | 3 | ✅ RESTORED (renamed from `notifications`) |
| escalation_events | 6 | ✅ RESTORED |
| escalation_levels | 3 | ✅ RESTORED |
| escalations | 1 | ✅ RESTORED |
| passwords | 1 | ✅ RESTORED |
| system_settings | 1 | ✅ RESTORED |
| chat_messages | 2 | ✅ RESTORED |
| document_categories | 6 | ✅ RESTORED |
| document_versions | 0 | ⚪ Empty in source backup |
| document_comments | 0 | ⚪ Empty in source backup |
| deletion_requests | 0 | ⚪ Empty in source backup |
| push_subscriptions | 0 | ⚪ Empty in source backup |
| password_renewals | 0 | ⚪ Empty in source backup |

### Tables skipped (system / permission denied)

These could not be migrated via `pg_restore` and are either handled by Supabase internally or require a manual step:

| Table / Schema | Reason |
|---|---|
| `auth.users`, `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_*` | Permission denied — Supabase does not allow direct writes to the auth schema via pg_restore |
| `cron.job`, `cron.job_run_details` | Permission denied |
| `realtime.messages_*` partitions | Partition tables don't exist in new project (expected) |
| `storage.migrations`, `storage.buckets_vectors` | Permission denied |
| `vault.secrets` | Permission denied |
| `supabase_migrations.schema_migrations` | Schema does not exist in new project (expected) |
| `drizzle.__drizzle_migrations` | Vendor ORM internal table — not applicable to unified schema |

---

## Phase 3 — Edge Functions

**Status: ✅ SUCCESS (13/13 functions deployed)**

### Functions deployed

| Function | Status |
|---|---|
| admin-create-user | ✅ DEPLOYED |
| admin-reset-password | ✅ DEPLOYED |
| admin-update-email | ✅ DEPLOYED |
| complete-password-change | ✅ DEPLOYED |
| escalations | ✅ DEPLOYED |
| export-database | ✅ DEPLOYED |
| notify-sms | ✅ DEPLOYED |
| ops-send-sms | ✅ DEPLOYED |
| password-reminders | ✅ DEPLOYED |
| reset-user-password | ✅ DEPLOYED |
| seed-admin | ✅ DEPLOYED |
| send-sms | ✅ DEPLOYED |
| watermark-download | ✅ DEPLOYED |

All 13 functions were deployed in a single bulk deploy using `supabase functions deploy --project-ref mmnpopwzfjyfasvzzatg`. Docker was not running; the CLI used server-side (`--use-api`) bundling automatically.

### Secrets configured

| Secret | Status |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ⚪ Auto-injected by Supabase runtime — no action needed |
| `TEXTSMS_API_KEY` | ⚠️ SET with placeholder — **must be updated** |
| `TEXTSMS_PARTNER_ID` | ⚠️ SET with placeholder — **must be updated** |
| `TEXTSMS_SHORTCODE` | ✅ SET (`UMS PREPAID`) |

---

## Phase 4 — Manual Actions Still Required

### 🔐 Auth users (CRITICAL)

`auth.users` cannot be migrated via `pg_restore` — Supabase does not permit direct writes to the auth schema. The 18 user profiles have been restored, but their auth credentials have not.

**Action required:** Re-invite or recreate users via the Supabase Auth dashboard:  
https://supabase.com/dashboard/project/mmnpopwzfjyfasvzzatg/auth/users

Users will need to reset their passwords on first login to the new project.

### 🗂️ Storage files (documents, task-files, avatars buckets)

The storage bucket metadata (bucket names and RLS policies) was restored. However, the actual files (1,100+ objects exported from the documents bucket, plus task-files and avatars) cannot be migrated via `pg_restore`.

**Action required:** Migrate files using the Supabase CLI:
```bash
supabase storage cp --project-ref <source> s3://documents/ s3://documents/
# Or use the Supabase Storage API to re-upload each file
```
Alternatively, use the Supabase dashboard Storage browser to upload files manually.

### 📱 TextSMS secrets (SMS functions will not work until updated)

The secrets `TEXTSMS_API_KEY` and `TEXTSMS_PARTNER_ID` were set to placeholder values. SMS features (`notify-sms`, `ops-send-sms`, `send-sms`, `escalations`, `password-reminders`) will fail until real credentials are applied.

**Action required:** Update via CLI:
```bash
supabase secrets set --project-ref mmnpopwzfjyfasvzzatg \
  TEXTSMS_API_KEY=your_real_key_here \
  TEXTSMS_PARTNER_ID=your_real_partner_id_here
```
Or update via dashboard: https://supabase.com/dashboard/project/mmnpopwzfjyfasvzzatg/settings/vault

### ⏱️ pg_cron scheduled jobs

Scheduled jobs from the source `cron.job` table could not be restored (permission denied). Verify and recreate any scheduled jobs in the Supabase dashboard:  
Database > Extensions > pg_cron, and via the SQL editor.

### 📦 Application .env files

Update both app codebases to point to the new Supabase project:

```env
VITE_SUPABASE_URL=https://mmnpopwzfjyfasvzzatg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnBvcHd6Zmp5ZmFzdnp6YXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NjAyMjQsImV4cCI6MjEwODEzNjIyNH0.xvXPco3sx-FXhu0gfPSiuv39H53O-hdnlGluohDUxbs
```

---

## Phase 5 — Next Steps for UMS Hub Unification

The new Supabase project (`mmnpopwzfjyfasvzzatg`) is now the **shared backend** for both apps.

1. **ums-docs-vault** (document management app) — update Supabase client config to the new URL and anon key above.
2. **beacon-tracker-pro / uptime-hub** (vendor/incident tracking app) — update Supabase client config to the same new URL and anon key.
3. **Unified dashboard shell** (`umsdash`) — the dashboard will route authenticated users between the two apps sharing the same auth session. Both apps read from and write to the same database, using the shared `profiles` and `user_roles` tables for identity and access control.
4. As more apps are added to the UMS Hub, they can be onboarded to the same Supabase project and plugged into the unified dashboard.

---

*Migration completed: 21 October 2026*  
*Restore log:* `.agents/tasks/restore-log.txt`  
*Edge functions log:* `.agents/tasks/functions-log.txt`
