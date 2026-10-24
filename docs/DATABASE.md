# UMS Hub — Database Reference

**Engine:** PostgreSQL 14 (Supabase managed)  
**Project ref:** `mmnpopwzfjyfasvzzatg`  
**Types file:** `src/integrations/supabase/types.ts` (hand-edited — do **not** regenerate with `supabase gen types`)

---

## Enums

| Enum | Values |
|---|---|
| `app_role` | `admin` \| `staff` \| `customer` \| `manager` \| `user` |
| `document_status` | `pending` \| `approved` \| `archived` |
| `task_priority` | `low` \| `normal` \| `high` |
| `task_status` | `pending` \| `in_progress` \| `completed` |
| `staff_position` | `super_admin` \| `hr` \| `hod` \| `staff` |

---

## Tables

### Core / Identity

#### `profiles`
User profile data. One row per auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `full_name` | text | |
| `email` | text | |
| `phone` | text | nullable |
| `avatar_url` | text | nullable |
| `department` | text | nullable |
| `position` | staff_position | nullable |
| `must_reset_password` | boolean | admin-forced reset flag |
| `password_changed_at` | timestamptz | nullable |
| `password_expiry_days` | integer | nullable — null = never expires |
| `notification_preferences` | jsonb | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `user_roles`
Base role assignments (one role per user).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `role` | app_role | |
| `created_at` | timestamptz | |

#### `custom_roles`
RBAC named roles with a base role and optional permissions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | unique slug |
| `display_name` | text | |
| `description` | text | nullable |
| `base_role` | text | one of app_role values |
| `color` | text | hex or CSS color |
| `is_system` | boolean | system roles cannot be deleted |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `role_permissions`
Per-role permission key strings.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `role_id` | uuid | FK → `custom_roles.id` |
| `permission_key` | text | e.g. `docs.upload`, `ops.incidents.write` |
| `granted_at` | timestamptz | |

#### `user_custom_roles`
Assigns custom roles to users.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `role_id` | uuid | FK → `custom_roles.id` |
| `assigned_by` | uuid | FK → `auth.users.id` |
| `assigned_at` | timestamptz | |

#### `user_app_access`
Explicit per-user app access grants (beyond base role).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `app_id` | text | `docs` or `ops` |
| `granted_by` | uuid | FK → `auth.users.id` |
| `granted_at` | timestamptz | |

#### `departments`
Organisational departments for grouping users.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `description` | text | nullable |
| `created_at` | timestamptz | |

---

### Document Vault

#### `customers`
Customer records, optionally linked to an auth user for portal access.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | nullable, FK → `auth.users.id` |
| `account_number` | text | unique |
| `full_name` | text | |
| `email` | text | nullable |
| `phone` | text | nullable |
| `address` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `document_categories`
Configurable categories for organising documents.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `description` | text | nullable |
| `color` | text | nullable |
| `display_order` | integer | |
| `created_at` | timestamptz | |

#### `documents`
Core document records. Files stored in Supabase Storage `documents` bucket.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `customer_id` | uuid | FK → `customers.id` |
| `category_id` | uuid | FK → `document_categories.id` |
| `title` | text | |
| `description` | text | nullable |
| `file_name` | text | |
| `file_path` | text | storage path |
| `file_type` | text | MIME type |
| `file_size` | integer | bytes |
| `status` | document_status | `pending` / `approved` / `archived` |
| `is_private` | boolean | |
| `uploaded_by` | uuid | FK → `auth.users.id` |
| `expiry_date` | date | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `document_versions`
Version history for a document (each upload of a new version).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid | FK → `documents.id` |
| `file_name` | text | |
| `file_path` | text | |
| `file_size` | integer | |
| `file_type` | text | |
| `version_number` | integer | |
| `uploaded_by` | uuid | FK → `auth.users.id` |
| `notes` | text | nullable |
| `created_at` | timestamptz | |

#### `document_comments`
Staff/admin comments on a document.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid | FK → `documents.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `content` | text | |
| `created_at` | timestamptz | |

#### `document_text_content`
Full-text extraction results (from `ocr-extract` edge function).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid | FK → `documents.id` |
| `extracted_text` | text | nullable |
| `extraction_status` | text | e.g. `pending`, `done`, `failed` |
| `extracted_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

#### `folders`
Hierarchical private folder tree.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `description` | text | nullable |
| `owner_id` | uuid | FK → `auth.users.id` |
| `parent_id` | uuid | nullable self-ref FK → `folders.id` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `folder_documents`
Files stored directly inside a folder.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `folder_id` | uuid | FK → `folders.id` |
| `file_name` | text | |
| `file_path` | text | |
| `file_size` | integer | nullable |
| `file_type` | text | nullable |
| `uploaded_by` | uuid | FK → `auth.users.id` |
| `created_at` | timestamptz | |

#### `folder_shares`
Grants another user access to a folder.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `folder_id` | uuid | FK → `folders.id` |
| `shared_with_user_id` | uuid | FK → `auth.users.id` |
| `can_edit` | boolean | |
| `include_subfolders` | boolean | |
| `created_at` | timestamptz | |

#### `deletion_requests`
Staff-submitted requests to delete a document (admin approval required).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid | FK → `documents.id` |
| `requested_by` | uuid | FK → `auth.users.id` |
| `reason` | text | nullable |
| `status` | text | `pending` / `approved` / `rejected` |
| `reviewed_by` | uuid | nullable FK → `auth.users.id` |
| `reviewed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

#### `export_schedules`
Scheduled automatic data exports.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `schedule_type` | text | `daily` / `weekly` / `monthly` |
| `day_of_week` | integer | nullable (0–6) |
| `day_of_month` | integer | nullable (1–31) |
| `export_type` | text | what data to export |
| `format` | text | `pdf` / `excel` / `csv` |
| `email_to` | text[] | recipients |
| `last_run_at` | timestamptz | nullable |
| `next_run_at` | timestamptz | nullable |
| `active` | boolean | |
| `created_by` | uuid | FK → `auth.users.id` |
| `created_at` | timestamptz | |

---

### Communication & Notifications

#### `chat_messages`
Real-time team chat messages (Supabase Realtime).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `content` | text | |
| `mentions` | text[] | nullable, array of mentioned user IDs |
| `created_at` | timestamptz | |

#### `reminders`
User-created reminders with optional recurrence.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `title` | text | |
| `description` | text | nullable |
| `reminder_date` | timestamptz | |
| `recurrence` | text | nullable — `daily`, `weekly`, `monthly`, `none` |
| `status` | text | `pending` / `completed` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `in_app_notifications`
In-app notification inbox for Document Vault.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `title` | text | |
| `message` | text | nullable |
| `type` | text | e.g. `reminder`, `task`, `document` |
| `is_read` | boolean | |
| `link` | text | nullable — href to navigate to |
| `created_at` | timestamptz | |

#### `ops_notifications`
In-app notification inbox for Operations Hub.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `title` | text | |
| `body` | text | nullable |
| `link` | text | nullable |
| `read` | boolean | |
| `created_at` | timestamptz | |

#### `push_subscriptions`
Web Push VAPID subscriptions per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `endpoint` | text | Push service URL |
| `p256dh` | text | ECDH public key |
| `auth` | text | auth secret |
| `created_at` | timestamptz | |

#### `sms_logs`
Audit log of every outbound SMS sent via TextSMS Kenya.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `sent_by` | uuid | nullable FK → `auth.users.id` |
| `recipient_phone` | text | |
| `recipient_name` | text | nullable |
| `message` | text | |
| `sms_type` | text | e.g. `reminder`, `task`, `password_expiry`, `oncall` |
| `status` | text | `sent` / `failed` |
| `api_response` | jsonb | nullable — raw provider response |
| `created_at` | timestamptz | |

#### `sms_preferences`
Per-user opt-in/out for SMS notifications.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `sms_enabled` | boolean | |
| `phone_number` | text | nullable |
| `notify_tasks` | boolean | |
| `notify_task_updates` | boolean | |
| `notify_reminders` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### Tasks

#### `tasks`
Task records. Supports kanban and list views.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | |
| `description` | text | nullable |
| `priority` | task_priority | `low` / `normal` / `high` |
| `status` | task_status | `pending` / `in_progress` / `completed` |
| `due_date` | date | nullable |
| `created_by` | uuid | FK → `auth.users.id` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `task_assignees`
Users assigned to a task (many-to-many).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid | FK → `tasks.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `status` | text | assignee-level status |
| `started_at` | timestamptz | nullable |
| `completed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

#### `task_comments`
Comments on tasks.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid | FK → `tasks.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `content` | text | |
| `created_at` | timestamptz | |

#### `task_files`
File attachments on tasks (stored in `task-files` bucket).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid | FK → `tasks.id` |
| `uploaded_by` | uuid | FK → `auth.users.id` |
| `file_name` | text | |
| `file_path` | text | |
| `file_size` | integer | nullable |
| `file_type` | text | nullable |
| `upload_type` | text | nullable |
| `created_at` | timestamptz | |

---

### Gamification

#### `upload_streaks`
Per-user consecutive upload streak tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `current_streak` | integer | |
| `longest_streak` | integer | |
| `last_upload_date` | date | nullable |
| `updated_at` | timestamptz | |

#### `user_xp`
Per-user XP total and level.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `total_xp` | integer | |
| `level` | integer | |
| `updated_at` | timestamptz | |

#### `xp_transactions`
Append-only log of every XP award.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `amount` | integer | XP awarded |
| `reason` | text | e.g. `document_upload`, `task_completed` |
| `ref_id` | uuid | nullable — entity that caused the award |
| `created_at` | timestamptz | |

#### `achievements`
Achievement definitions (seeded at setup).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `key` | text | unique slug |
| `name` | text | display name |
| `description` | text | nullable |
| `icon` | text | nullable — emoji or icon name |
| `category` | text | nullable — e.g. `upload`, `task`, `streak` |
| `xp_reward` | integer | XP granted when earned |

#### `user_achievements`
Records which achievements a user has earned.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `achievement_key` | text | FK → `achievements.key` |
| `earned_at` | timestamptz | |

#### `daily_challenges`
One challenge per calendar date.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `date` | date | unique |
| `type` | text | `upload` / `task_complete` / `reminder_complete` / `chat_message` / `login` |
| `label` | text | display label |
| `icon` | text | emoji or icon |
| `target_count` | integer | how many actions needed |
| `xp_reward` | integer | |

#### `user_daily_progress`
Tracks a user's progress on the daily challenge for each date.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `challenge_date` | date | FK → `daily_challenges.date` |
| `progress` | integer | current count |
| `completed` | boolean | |
| `completed_at` | timestamptz | nullable |

---

### Operations Hub

#### `vendor_issues`
Vendor service issues with lifecycle status.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `vendor` | text | |
| `issue` | text | |
| `impact` | text | nullable |
| `status` | text | |
| `system_name` | text | nullable |
| `date_reported` | date | |
| `downtime` | numeric | nullable — hours |
| `uptime_start` | timestamptz | nullable |
| `uptime_end` | timestamptz | nullable |
| `uptime_percentage` | numeric | nullable |
| `rca_status` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `incidents`
Full incident reports with RCA and CAPA tracking.

| Column | Type | Notable sub-fields |
|---|---|---|
| `id` | uuid PK | |
| `incident_number` | text | auto-generated unique ref |
| `incident_type` | text | |
| `severity` | text | `low` / `medium` / `high` / `critical` |
| `urgency` | text | |
| `department` | text | nullable |
| `location` | text | nullable |
| `status` | text | `open` / `investigating` / `resolved` / `closed` |
| `description` | text | |
| `why_1` … `why_5` | text | 5-Why RCA fields |
| `capa_action` | text | nullable |
| `capa_deadline` | date | nullable |
| `capa_owner` | text | nullable |
| `capa_status` | text | nullable |
| `financial_impact` | text[] | nullable |
| `safety_impact` | text[] | nullable |
| `operational_impact` | text[] | nullable |
| `supporting_docs` | text[] | nullable — storage paths |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `passwords`
Operations credentials vault with rotation tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `system_name` | text | |
| `username` | text | nullable |
| `assigned_to` | text | nullable |
| `owner_user_id` | uuid | nullable |
| `backup_user_id` | uuid | nullable |
| `phone_number` | text | nullable — for SMS alerts |
| `expiry_date` | date | nullable |
| `rotation_days` | integer | nullable |
| `last_renewed_at` | timestamptz | nullable |
| `last_notified_at` | timestamptz | nullable |
| `notified` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `password_renewals`
Audit log of password renewals.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `password_id` | uuid | FK → `passwords.id` |
| `renewed_by` | uuid | FK → `auth.users.id` |
| `previous_expiry` | date | nullable |
| `new_expiry` | date | |
| `notes` | text | nullable |
| `created_at` | timestamptz | |

#### `escalations`
Multi-level escalation records.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | |
| `source_id` | uuid | nullable — incident/issue being escalated |
| `source_table` | text | nullable — e.g. `incidents` |
| `status` | text | `open` / `escalated` / `resolved` |
| `current_level` | integer | current escalation level |
| `assigned_to` | uuid | nullable FK → `auth.users.id` |
| `created_by` | uuid | nullable FK → `auth.users.id` |
| `level_deadline` | timestamptz | nullable |
| `resolved_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `escalation_events`
Timeline of events on an escalation.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `escalation_id` | uuid | FK → `escalations.id` |
| `event_type` | text | e.g. `created`, `escalated`, `resolved` |
| `from_level` | integer | nullable |
| `to_level` | integer | nullable |
| `actor_id` | uuid | nullable FK → `auth.users.id` |
| `note` | text | nullable |
| `created_at` | timestamptz | |

#### `escalation_levels`
Static configuration for escalation level thresholds.

| Column | Type | Notes |
|---|---|---|
| `level` | integer PK | |
| `name` | text | |
| `target_role` | app_role | role to notify at this level |
| `hours_to_next` | integer | nullable — hours before auto-escalating |

---

### System & Integration

#### `audit_logs`
Immutable audit trail of all significant actions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | nullable FK → `auth.users.id` |
| `action` | text | e.g. `document_uploaded`, `user_deleted` |
| `entity_type` | text | table/entity affected |
| `entity_id` | uuid | nullable |
| `details` | jsonb | nullable — arbitrary context |
| `ip_address` | text | nullable |
| `created_at` | timestamptz | |

#### `system_settings`
Key-value store for global app configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `key` | text | unique |
| `value` | jsonb | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `webhooks`
Outbound webhook configurations.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `url` | text | destination URL |
| `events` | text[] | e.g. `["document.uploaded", "task.completed"]` |
| `secret` | text | HMAC signing secret |
| `active` | boolean | |
| `created_by` | uuid | FK → `auth.users.id` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `api_keys`
API key management for programmatic access.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `key_prefix` | text | first 8 chars shown in UI |
| `key_hash` | text | bcrypt hash of the full key |
| `scopes` | text[] | e.g. `["documents:read"]` |
| `last_used_at` | timestamptz | nullable |
| `expires_at` | timestamptz | nullable |
| `revoked` | boolean | |
| `created_by` | uuid | FK → `auth.users.id` |
| `created_at` | timestamptz | |

---

### Onboarding

#### `tour_definitions`
Admin-managed onboarding tour definitions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `key` | text | unique slug |
| `name` | text | |
| `description` | text | nullable |
| `target_role` | app_role | nullable — null = all roles |
| `is_active` | boolean | |
| `steps` | jsonb | array of step objects |
| `display_order` | integer | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `user_tour_progress`
Tracks each user's progress through each tour.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id` |
| `tour_key` | text | FK → `tour_definitions.key` |
| `status` | text | `not_started` / `in_progress` / `completed` / `skipped` |
| `current_step` | integer | 0-indexed step position |
| `completed_at` | timestamptz | nullable |
| `updated_at` | timestamptz | |

---

## Views

### `user_activity_summary`
Denormalized view joining `profiles`, `user_roles`, `upload_streaks`, `user_xp`, and `audit_logs`. Used by User Hub and Reports Hub.

| Column | Source |
|---|---|
| `user_id` | profiles |
| `full_name` | profiles |
| `email` | profiles |
| `avatar_url` | profiles |
| `department` | profiles |
| `phone` | profiles |
| `role` | user_roles |
| `must_reset_password` | profiles |
| `docs_uploaded` | count from documents |
| `tasks_created` | count from tasks |
| `audit_events` | count from audit_logs |
| `last_active_at` | max created_at from audit_logs |
| `current_streak` | upload_streaks |
| `total_xp` | user_xp |
| `level_name` | derived from user_xp.level |

---

## Database Functions

All functions are `SECURITY DEFINER` to safely read across RLS boundaries.

| Function | Returns | Purpose |
|---|---|---|
| `has_role(_user_id uuid, _role app_role)` | boolean | Returns true if user has the given role |
| `get_user_role(_user_id uuid)` | app_role | Returns the user's current base role |
| `get_user_position(_user_id uuid)` | staff_position | Returns the user's staff_position value |
| `is_super_admin(_user_id uuid)` | boolean | True if user email = `amsterntechhub@gmail.com` or position = `super_admin` |
| `can_manage_tasks(_user_id uuid)` | boolean | True if user is admin or staff |
| `is_task_assignee(_task_id uuid, _user_id uuid)` | boolean | True if user is assigned to the task |
| `has_folder_access(_folder_id uuid, _user_id uuid)` | boolean | True if user owns or has a share record for the folder |
| `is_folder_owner(_folder_id uuid, _user_id uuid)` | boolean | True if user owns the folder |
| `get_customer_id_for_user(_user_id uuid)` | uuid | Returns the customer ID linked to the given auth user |
| `create_due_reminder_notifications()` | void | Called by cron/trigger; inserts `in_app_notifications` for overdue reminders |
| `export_schema_ddl()` | text | Returns the full public schema DDL as a string (used by Database Export page) |

---

## Row Level Security (RLS)

RLS is enabled on all tables. Key policies:

| Table | Policy summary |
|---|---|
| `profiles` | Users can read and update their own row; admins can read all rows |
| `user_roles` | Reads use `SECURITY DEFINER` helper functions only; writes require admin |
| `documents` | Admins and staff read/write all; customers read only their own (via `customer_id → user_id`) |
| `document_categories` | All authenticated users read; admin writes |
| `folders` / `folder_documents` | Owners and users with a `folder_shares` record |
| `tasks` / `task_assignees` | Assignees and the task creator |
| `chat_messages` | All authenticated users |
| `audit_logs` | Admins only |
| `system_settings` | Admins only |
| `passwords` | Admins and staff |
| `incidents` / `vendor_issues` | Admins and staff |
| `in_app_notifications` | Users read/update their own rows |

---

## Migration History

Files in `supabase/migrations/` (oldest first):

| File | Description |
|---|---|
| `20260125095345_…` | Initial schema — auth, profiles, user_roles |
| `20260125095400_…` | Document categories and documents |
| `20260127081543_…` | Customer table and RLS |
| `20260129051002_…` | Tasks and task assignees |
| `20260130054407_…` | Folders, folder documents, folder shares |
| `20260202030804_…` | Reminders and notifications |
| `20260209215411_…` | Audit logs and system settings |
| `20260210052328_…` | Chat messages |
| `20260301081719_…` | Deletion requests |
| `20260306092719_…` | Export schedules |
| `20260307053839_…` | Document versions and text content |
| `20260307055522_…` | Push subscriptions |
| `20260307055742_…` | SMS logs and SMS preferences |
| `20260309095415_…` | Webhooks and API keys |
| `20260404082912_…` | Sessions and activity tracking |
| `20260404111534_…` | Document templates |
| `20260406182534_…` | Storage analytics improvements |
| `20260406182828_…` | Activity heatmap data |
| `20260412194227_…` | Customer activity tracking |
| `20260412194737_…` | User activity log |
| `20260413070342_…` | Database export function |
| `20260502082118_…` | Announcement and whats-new system |
| `20260527123055_…` | Command palette and keyboard shortcuts |
| `20260528064216_…` | Password expiry gate |
| `20260706064741_…` | Quick actions |
| `20260706065731_…` | Mobile nav improvements |
| `20260712192328_…` | Density toggle |
| `20260712192855_…` | Breadcrumb |
| `20260713062731_…` | Notification bell |
| `20261014120000_auto_escalation_cron` | Auto-escalation cron job |
| `20261015000000_ops_schema` | Full Operations Hub schema (vendor_issues, incidents, passwords, escalations) |
| `20261022000001_gamification` | Gamification tables (upload_streaks, user_xp, xp_transactions, achievements) |
| `20261022000004_tier3_features` | Tier 3 feature additions |
| `20261022000005_onboarding_tours` | tour_definitions, user_tour_progress |
| `20261022000005_tier1_infra` | Tier 1 infrastructure |
| `20261022000006_all_tiers` | Combined tier migrations |
| `20261022000006_tier2_features` | Tier 2 features |
| `20261023000001_unified_user_management` | user_app_access, departments, user_activity_summary view |
| `20261023000002_rbac_system` | custom_roles, role_permissions, user_custom_roles |
