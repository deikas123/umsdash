# UMS Hub — Database Schema

All tables live in the `public` schema of a Supabase-managed PostgreSQL 14 instance. Row Level Security (RLS) is enabled on every table.

## Enums

| Enum | Values |
|---|---|
| `app_role` | `admin`, `staff`, `customer`, `manager`, `user` |
| `document_status` | `pending`, `approved`, `archived` |
| `staff_position` | `super_admin`, `hr`, `hod`, `staff` |
| `task_priority` | `low`, `normal`, `high` |
| `task_status` | `pending`, `in_progress`, `completed` |

**Note:** `manager` and `user` are legacy roles that the frontend maps to `staff` at runtime (see `AuthContext.tsx`).

---

## Tables

### Core / Auth

#### `profiles`
Extended user profile. One row per auth user, created automatically on sign-up.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Profile record ID |
| `user_id` | uuid (FK → auth.users) | Supabase auth user ID |
| `full_name` | text | Display name |
| `email` | text | User email address |
| `phone` | text? | Phone number |
| `avatar_url` | text? | Path in `avatars` storage bucket |
| `department` | text? | Department name |
| `position` | `staff_position`? | `super_admin`, `hr`, `hod`, `staff` |
| `must_reset_password` | boolean | Force password change flag |
| `password_changed_at` | timestamptz? | When password was last changed |
| `password_expiry_days` | int? | Days before password expires (null = never) |
| `notification_preferences` | jsonb? | Per-channel notification toggles |
| `created_at` / `updated_at` | timestamptz | Timestamps |

#### `user_roles`
One row per user, defines the user's role.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | auth user ID |
| `role` | `app_role` | `admin`, `staff`, `customer` (etc.) |
| `created_at` | timestamptz | |

RLS: users read own row; admins manage all.

#### `user_app_access`
Grants a user access to a specific app.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | auth user ID |
| `app_id` | text CHECK IN ('docs','ops') | Which app |
| `granted_by` | uuid? | Admin who granted access |
| `granted_at` | timestamptz | |

RLS: admins manage all; users read own rows.

---

### Document Vault

#### `documents`
Core document record.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | Human-readable title |
| `description` | text? | Optional description |
| `file_name` | text | Original file name |
| `file_path` | text | Path in `documents` storage bucket |
| `file_size` | int8 | Bytes |
| `file_type` | text | MIME type |
| `status` | `document_status` | `pending`, `approved`, `archived` |
| `category_id` | uuid FK → `document_categories` | Category |
| `customer_id` | uuid FK → `customers` | Owning customer |
| `uploaded_by` | uuid? | auth user ID of uploader |
| `is_private` | boolean | Hide from customer portal |
| `expiry_date` | date? | Document expiry |
| `created_at` / `updated_at` | timestamptz | |

Trigger: `gamification_on_document_upload` fires `process_document_upload()` on INSERT.

#### `document_categories`
Reference table for document types.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Category name |
| `description` | text? | |
| `color` | text? | Hex color for UI badge |
| `display_order` | int | Sort order |
| `created_at` | timestamptz | |

#### `document_versions`
Version history for a document.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid FK → `documents` | Parent document |
| `version_number` | int | Sequential version |
| `file_name` / `file_path` / `file_size` / `file_type` | | File details for this version |
| `notes` | text? | Version notes |
| `uploaded_by` | uuid? | |
| `created_at` | timestamptz | |

#### `document_comments`
Comments on a document.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid FK → `documents` | |
| `user_id` | uuid | Author |
| `content` | text | Comment text |
| `created_at` | timestamptz | |

#### `document_text_content`
OCR-extracted text for full-text search.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid | |
| `extracted_text` | text? | Extracted content |
| `extraction_status` | text | `pending`, `processing`, `completed`, `failed` |
| `extracted_at` | timestamptz? | |
| `created_at` | timestamptz | |

#### `deletion_requests`
Staff/customer requests to delete a document, requires admin approval.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid FK → `documents` | |
| `requested_by` | uuid | |
| `reason` | text? | |
| `status` | text | `pending`, `approved`, `rejected` |
| `reviewed_by` | uuid? | Admin who reviewed |
| `reviewed_at` | timestamptz? | |
| `created_at` | timestamptz | |

#### `document_templates`
Reusable document templates for upload workflows.

(Table created in migration `20261022000006_all_tiers.sql` or similar — structure mirrors `documents` with `is_template=true` flag.)

---

### Folders

#### `folders`
Private folder tree. Self-referential for nested folders.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Folder name |
| `description` | text? | |
| `owner_id` | uuid | auth user ID |
| `parent_id` | uuid? FK → `folders` | Parent folder (null = root) |
| `created_at` / `updated_at` | timestamptz | |

#### `folder_documents`
Files uploaded directly to a folder (separate from customer documents).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `folder_id` | uuid FK → `folders` | |
| `file_name` / `file_path` / `file_size` / `file_type` | | File details |
| `uploaded_by` | uuid | |
| `created_at` | timestamptz | |

#### `folder_shares`
Sharing a folder with another user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `folder_id` | uuid FK → `folders` | |
| `shared_with_user_id` | uuid | Recipient |
| `can_edit` | boolean | Edit permission |
| `include_subfolders` | boolean | Share propagates to nested folders |
| `created_at` | timestamptz | |

---

### Customers

#### `customers`
Customer accounts. Linked to a user account for portal access.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `full_name` | text | Customer display name |
| `account_number` | text UNIQUE | Business account number |
| `email` | text? | |
| `phone` | text? | |
| `address` | text? | |
| `user_id` | uuid? | Linked auth user (for portal login) |
| `created_at` / `updated_at` | timestamptz | |

---

### Tasks

#### `tasks`
Task records, created by any authenticated user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | |
| `description` | text? | |
| `priority` | `task_priority` | `low`, `normal`, `high` |
| `status` | `task_status` | `pending`, `in_progress`, `completed` |
| `due_date` | date? | |
| `created_by` | uuid | |
| `created_at` / `updated_at` | timestamptz | |

Trigger: `gamification_on_task_complete` fires when `task_assignees.status` → `completed`.

#### `task_assignees`
Many-to-many: tasks assigned to users.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → `tasks` | |
| `user_id` | uuid | Assigned user |
| `status` | text | `pending`, `in_progress`, `completed` |
| `started_at` / `completed_at` | timestamptz? | |
| `created_at` | timestamptz | |

#### `task_comments`
Comments on a task.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → `tasks` | |
| `user_id` | uuid | |
| `content` | text | |
| `created_at` | timestamptz | |

#### `task_files`
File attachments on tasks.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → `tasks` | |
| `file_name` / `file_path` / `file_size` / `file_type` | | |
| `upload_type` | text | `attachment` or other |
| `uploaded_by` | uuid | |
| `created_at` | timestamptz | |

---

### Reminders

#### `reminders`
Personal reminders for any user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | Owner |
| `title` | text | |
| `description` | text? | |
| `reminder_date` | timestamptz | When to remind |
| `recurrence` | text | `none`, `daily`, `weekly`, `monthly` |
| `status` | text | `pending`, `completed`, `dismissed` |
| `created_at` / `updated_at` | timestamptz | |

Trigger: `gamification_on_reminder_complete` fires on status → `completed`.

---

### Chat

#### `chat_messages`
Team chat messages (broadcast to all staff/admin).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | Sender |
| `content` | text | Message text |
| `mentions` | uuid[]? | Mentioned user IDs |
| `created_at` | timestamptz | |

---

### Notifications

#### `in_app_notifications`
In-app notification inbox for each user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | Recipient |
| `title` | text | |
| `message` | text | |
| `type` | text | `gamification`, `task`, `reminder`, `system`, etc. |
| `is_read` | boolean | |
| `link` | text? | Optional deep link |
| `created_at` | timestamptz | |

#### `push_subscriptions`
Web Push API subscription records.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `endpoint` | text | Push service endpoint URL |
| `p256dh` | text | Public key |
| `auth` | text | Auth secret |
| `created_at` | timestamptz | |

---

### SMS

#### `sms_logs`
All outbound SMS messages.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `sent_by` | uuid | Sender user ID |
| `recipient_phone` | text | Normalised to 254XXXXXXXXX format |
| `recipient_name` | text? | |
| `message` | text | SMS body |
| `sms_type` | text | `general`, `reminder`, `escalation`, `password`, etc. |
| `status` | text | `delivered`, `failed`, `sent` |
| `api_response` | jsonb? | Raw TextSMS API response |
| `created_at` | timestamptz | |

#### `sms_preferences`
Per-user SMS notification preferences.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE | |
| `sms_enabled` | boolean | Master toggle |
| `phone_number` | text? | Override phone for SMS |
| `notify_tasks` | boolean | SMS on new task assignment |
| `notify_task_updates` | boolean | SMS on task status change |
| `notify_reminders` | boolean | SMS on reminder due |
| `created_at` / `updated_at` | timestamptz | |

---

### Admin / System

#### `audit_logs`
Immutable audit trail for all significant actions.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid? | Actor |
| `action` | text | Action name (e.g. `document_upload`, `user_created`) |
| `entity_type` | text | Table or resource type |
| `entity_id` | uuid? | ID of the affected record |
| `ip_address` | text? | Client IP |
| `details` | jsonb? | Additional context |
| `created_at` | timestamptz | |

#### `system_settings`
Key-value store for runtime configuration.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `key` | text UNIQUE | Setting key (e.g. `maintenance_mode`, `org_name`) |
| `value` | jsonb | Setting value |
| `created_at` / `updated_at` | timestamptz | |

#### `departments`
Organisation departments (reference data).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text UNIQUE | |
| `description` | text? | |
| `created_at` | timestamptz | |

#### `webhooks`
Outbound webhook endpoints configured by admin.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Display name |
| `url` | text | Endpoint URL |
| `events` | text[] | Event types to subscribe to |
| `secret` | text? | HMAC signing secret |
| `active` | boolean | |
| `created_by` | uuid? | |
| `created_at` / `updated_at` | timestamptz | |

#### `api_keys`
API keys for programmatic access.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Friendly name |
| `key_prefix` | text | First 8 chars, shown in UI |
| `key_hash` | text | bcrypt hash of full key |
| `scopes` | text[] | Permitted scopes |
| `last_used_at` | timestamptz? | |
| `expires_at` | timestamptz? | |
| `revoked` | boolean | |
| `created_by` | uuid? | |
| `created_at` | timestamptz | |

#### `export_schedules`
Automated report export schedules.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `schedule_type` | text | `weekly`, `monthly` |
| `day_of_week` | int? | 0–6 (for weekly) |
| `day_of_month` | int? | 1–31 (for monthly) |
| `export_type` | text | `documents`, `audit_logs`, etc. |
| `format` | text | `csv`, `xlsx`, `pdf` |
| `email_to` | text[]? | Recipients |
| `last_run_at` / `next_run_at` | timestamptz? | |
| `active` | boolean | |
| `created_by` | uuid? | |
| `created_at` | timestamptz | |

---

### Operations Hub

#### `vendor_issues`
Vendor service issues tracked by staff.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `vendor` | text | Vendor name |
| `system_name` | text? | Affected system |
| `issue` | text | Issue description |
| `impact` | text | `low`, `medium`, `high`, `critical` |
| `status` | text | `open`, `in_progress`, `resolved`, `closed` |
| `date_reported` | date? | |
| `downtime` | text? | Downtime duration |
| `rca_status` | text? | Root cause analysis status |
| `uptime_start` / `uptime_end` | timestamptz? | Uptime window |
| `uptime_percentage` | float? | Calculated uptime % |
| `user_id` | uuid | Reporter |
| `created_at` / `updated_at` | timestamptz | |

#### `incidents`
Detailed incident records with full 5-Why and CAPA support.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `incident_number` | text UNIQUE | Auto-generated reference number |
| `incident_type` | text? | Category of incident |
| `severity` | text? | `low`, `medium`, `high`, `critical` |
| `urgency` | text? | |
| `status` | text | `open`, `in_progress`, `resolved`, `closed` |
| `description` | text? | |
| `date_of_incident` / `time_of_incident` | | |
| `date_reported` | date? | |
| `department` | text? | |
| `location` | text? | |
| `reported_by` | text? | Free-text reporter name |
| `persons_involved` / `witnesses` | text? | |
| `immediate_actions` | text[]? | Actions taken immediately |
| `operational_impact` / `safety_impact` | text[]? | Impact arrays |
| `financial_impact` / `financial_amount` | | |
| `root_cause_categories` | text[]? | |
| `why_1` … `why_5` | text? | 5-Why analysis fields |
| `root_cause_statement` / `problem_statement` | text? | |
| `containment_details` | text? | |
| `capa_action` / `capa_owner` / `capa_deadline` / `capa_status` | | Corrective action fields |
| `supporting_docs` | text[]? | File paths |
| `item_description` / `item_quantity` / `serial_numbers` / `estimated_value` | | Asset fields |
| `user_id` | uuid | Creator |
| `created_at` / `updated_at` | timestamptz | |

#### `escalations`
Escalation records linked to an incident or vendor issue.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | |
| `source_table` | text | `incidents` or `vendor_issues` |
| `source_id` | uuid | ID in source table |
| `status` | text | `open`, `acknowledged`, `resolved` |
| `current_level` | int | Current escalation level (starts at 1) |
| `level_deadline` | timestamptz? | Auto-escalation deadline |
| `assigned_to` | uuid? | |
| `created_by` | uuid? | |
| `resolved_at` | timestamptz? | |
| `created_at` / `updated_at` | timestamptz | |

#### `escalation_levels`
Configuration for escalation tiers.

| Column | Type | Description |
|---|---|---|
| `level` | int PK | Tier number (1, 2, 3…) |
| `name` | text | Level name |
| `target_role` | `app_role`? | Role to notify at this level |
| `hours_to_next` | int? | Hours before auto-escalation to next level |

#### `escalation_events`
Audit trail for escalation state changes.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `escalation_id` | uuid | Parent escalation |
| `event_type` | text | `created`, `escalated`, `auto_escalated`, `acknowledged`, `resolved`, `reopened`, `comment`, `notified` |
| `actor_id` | uuid? | User who triggered the event |
| `from_level` / `to_level` | int? | Level transition |
| `note` | text? | |
| `created_at` | timestamptz | |

#### `passwords`
Operational system password records with expiry tracking.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `system_name` | text | System the credential belongs to |
| `username` | text | Username/login |
| `expiry_date` | date | When password expires |
| `rotation_days` | int | Rotation cadence in days |
| `assigned_to` | text? | Person responsible (free text) |
| `owner_user_id` | uuid? | Link to profiles |
| `backup_user_id` | uuid? | Backup contact |
| `phone_number` | text? | Direct SMS contact |
| `notified` | boolean? | Whether reminder was sent |
| `last_notified_at` | timestamptz? | |
| `last_renewed_at` | timestamptz? | |
| `user_id` | uuid | Creator |
| `created_at` / `updated_at` | timestamptz | |

#### `password_renewals`
History of password renewals.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `password_id` | uuid | |
| `new_expiry` | date | New expiry date set |
| `previous_expiry` | date? | |
| `notes` | text? | |
| `renewed_by` | uuid? | |
| `created_at` | timestamptz | |

#### `ops_notifications`
Operations Hub specific notifications.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `title` | text | |
| `body` | text? | |
| `link` | text? | |
| `read` | boolean | |
| `created_at` | timestamptz | |

---

### Gamification

#### `user_xp`
Cumulative XP and level for each user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE | |
| `total_xp` | int | Lifetime XP |
| `level` | int | Computed level (`floor(1 + sqrt(total_xp/100))`) |
| `updated_at` | timestamptz | |

#### `upload_streaks`
Daily upload streak tracker.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE | |
| `current_streak` | int | Active streak days |
| `longest_streak` | int | All-time best |
| `last_upload_date` | date? | Date of last upload |
| `updated_at` | timestamptz | |

#### `achievements`
Achievement definitions (reference data).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `key` | text UNIQUE | Programmatic key |
| `name` | text | Display name |
| `description` | text? | |
| `icon` | text? | Emoji icon |
| `xp_reward` | int | XP granted on unlock |
| `category` | text? | `upload`, `streak`, `volume`, `tasks`, `reminders` |

#### `user_achievements`
Earned achievements per user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `achievement_key` | text FK → `achievements.key` | |
| `earned_at` | timestamptz | |

UNIQUE on `(user_id, achievement_key)`.

#### `daily_challenges`
One challenge row per date.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `date` | date UNIQUE | Challenge date |
| `type` | text | `upload`, `task`, etc. |
| `target_count` | int | How many to complete |
| `xp_reward` | int | XP for completion |
| `label` | text | Display text |
| `icon` | text | Emoji |

#### `user_daily_progress`
Per-user progress on today's challenge.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `challenge_date` | date FK → `daily_challenges.date` | |
| `progress` | int | Current count |
| `completed` | boolean | |
| `completed_at` | timestamptz? | |

#### `xp_transactions`
Immutable XP event log.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `amount` | int | XP delta |
| `reason` | text | `document_upload`, `task_completed`, `reminder_completed`, etc. |
| `ref_id` | uuid? | Related record ID |
| `created_at` | timestamptz | |

---

### Onboarding

#### `tour_definitions`
Tour definitions managed by super admin.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `key` | text UNIQUE | `platform_welcome`, `docs_welcome`, `ops_welcome`, `customer_welcome` |
| `name` | text | Display name |
| `description` | text? | |
| `target_role` | `app_role`? | Null = all roles |
| `is_active` | boolean | Whether tour is shown |
| `steps` | jsonb | Array of `TourStep` objects |
| `display_order` | int | Auto-start order |
| `created_at` / `updated_at` | timestamptz | |

#### `user_tour_progress`
Tracks each user's progress through each tour.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `tour_key` | text FK → `tour_definitions.key` | |
| `status` | text | `not_started`, `in_progress`, `completed`, `dismissed` |
| `current_step` | int | 0-indexed step number |
| `completed_at` | timestamptz? | |
| `updated_at` | timestamptz | |

UNIQUE on `(user_id, tour_key)`.

---

## Views

### `user_activity_summary`

Aggregated view used by the User Hub admin page. Joins `profiles`, `user_roles`, document counts, task counts, audit event counts, and gamification data.

| Column | Description |
|---|---|
| `user_id` | auth user ID |
| `full_name`, `email`, `phone`, `department`, `avatar_url` | From profiles |
| `must_reset_password` | From profiles |
| `role` | From user_roles |
| `docs_uploaded` | COUNT of documents uploaded by user |
| `tasks_created` | COUNT of tasks created by user |
| `audit_events` | COUNT of audit_logs entries |
| `last_active_at` | MAX audit_logs.created_at |
| `current_streak` | From upload_streaks |
| `total_xp` | From user_xp |
| `level_name` | user_xp.level (integer) |

Access: `GRANT SELECT ON user_activity_summary TO authenticated`

---

## DB Functions

| Function | Returns | Description |
|---|---|---|
| `get_user_role(_user_id)` | `app_role` | Fetch user's role from user_roles |
| `get_user_position(_user_id)` | `staff_position` | Fetch user's position from profiles |
| `has_role(_role, _user_id)` | boolean | True if user has the given role |
| `is_super_admin(_user_id)` | boolean | True if user email = `amsterntechhub@gmail.com` |
| `get_customer_id_for_user(_user_id)` | uuid | Get the customer ID linked to a portal user |
| `has_folder_access(_folder_id, _user_id)` | boolean | True if user owns or has a share on the folder |
| `is_folder_owner(_folder_id, _user_id)` | boolean | True if user is the folder owner |
| `can_manage_tasks(_user_id)` | boolean | True if user is admin or staff |
| `is_task_assignee(_task_id, _user_id)` | boolean | True if user is assigned to the task |
| `award_xp(p_user_id, p_amount, p_reason, p_ref_id)` | void | SECURITY DEFINER: insert xp_transaction + upsert user_xp with level recalc |
| `process_document_upload(p_user_id, p_doc_id)` | void | SECURITY DEFINER: streak, XP, daily challenge, achievements on document insert |
| `check_and_award_achievements(p_user_id)` | void | SECURITY DEFINER: volume-based achievement checks |
| `insert_in_app_notification_for_user(p_user_id, p_title, p_message, p_type)` | void | SECURITY DEFINER: safe notification insert for gamification triggers |
| `create_due_reminder_notifications()` | void | Cron helper: create notifications for due reminders |
| `export_schema_ddl()` | text | Returns full public schema DDL (used by export-database Edge Function) |

---

## Triggers

| Trigger | Table | Event | Function |
|---|---|---|---|
| `gamification_on_document_upload` | `documents` | AFTER INSERT | `trg_fn_document_upload_gamification` → `process_document_upload` + `check_and_award_achievements` |
| `gamification_on_task_complete` | `task_assignees` | AFTER UPDATE (when status → 'completed') | `trg_fn_task_completion_gamification` → `award_xp(30, 'task_completed')` + unlock `task_complete` achievement |
| `gamification_on_reminder_complete` | `reminders` | AFTER UPDATE (when status → 'completed') | `trg_fn_reminder_completion_gamification` → `award_xp(20, 'reminder_completed')` + unlock `reminder_champion` achievement |

---

## Relationships Diagram (ERD)

```
auth.users
  ├── profiles (1:1, user_id)
  ├── user_roles (1:1, user_id)
  ├── user_app_access (1:many, user_id)
  ├── user_xp (1:1, user_id)
  ├── upload_streaks (1:1, user_id)
  ├── user_achievements (1:many, user_id)
  ├── xp_transactions (1:many, user_id)
  ├── user_daily_progress (1:many, user_id)
  ├── user_tour_progress (1:many, user_id)
  ├── audit_logs (1:many, user_id)
  ├── documents (1:many, uploaded_by)
  ├── tasks (1:many, created_by)
  ├── task_assignees (1:many, user_id)
  ├── reminders (1:many, user_id)
  ├── chat_messages (1:many, user_id)
  ├── folders (1:many, owner_id)
  ├── sms_preferences (1:1, user_id)
  ├── push_subscriptions (1:many, user_id)
  ├── in_app_notifications (1:many, user_id)
  ├── passwords (1:many, user_id)
  ├── vendor_issues (1:many, user_id)
  └── incidents (1:many, user_id)

customers (linked via user_id to auth.users)
  └── documents (1:many, customer_id)

document_categories
  └── documents (1:many, category_id)

documents
  ├── document_versions (1:many, document_id)
  ├── document_comments (1:many, document_id)
  ├── deletion_requests (1:many, document_id)
  └── document_text_content (1:1, document_id)

folders
  ├── folders (self-ref, parent_id)
  ├── folder_documents (1:many, folder_id)
  └── folder_shares (1:many, folder_id)

tasks
  ├── task_assignees (1:many, task_id)
  ├── task_comments (1:many, task_id)
  └── task_files (1:many, task_id)

escalations
  ├── escalation_events (1:many, escalation_id)
  └── [source: incidents | vendor_issues] (via source_id + source_table)

achievements
  └── user_achievements (1:many via achievement_key)

daily_challenges
  └── user_daily_progress (1:many via challenge_date)

tour_definitions
  └── user_tour_progress (1:many via tour_key)

passwords
  └── password_renewals (1:many, password_id)
```

---

## Migration History

Migrations are stored in `supabase/migrations/` named `<timestamp>_<uuid>.sql` for auto-generated migrations and `<timestamp>_<descriptor>.sql` for hand-written ones.

| Migration | Key Changes |
|---|---|
| `20260125…` | Initial schema: profiles, user_roles, customers, documents, categories, folders, tasks, reminders, audit_logs, chat_messages |
| `20260125…` (2nd) | RLS policies for initial tables |
| `20260127…` | Folder shares, folder documents |
| `20260129…` | Document versions, comments |
| `20260130…` | Deletion requests |
| `20260202…` | SMS logs, sms_preferences, push_subscriptions |
| `20260209…` | In-app notifications |
| `20260210…` | System settings |
| `20260301…` | Task files, task comments, task_assignees |
| `20260306…` | Document expiry, storage analytics support |
| `20260307…` (×3) | Activity feed, audit log enhancements |
| `20260309…` | Export schedules |
| `20260404…` (×2) | Webhooks, API keys |
| `20260406…` (×2) | Departments, document_text_content (OCR) |
| `20260412…` (×2) | Document templates |
| `20260413…` | Customer activity tracking |
| `20260502…` | Export scheduler enhancements |
| `20260527…` | Sessions table, inactivity tracking |
| `20260528…` | Announcements/banners |
| `20260706…` (×2) | Operations Hub schema (vendor_issues, incidents, passwords, escalations, escalation_levels, escalation_events, ops_notifications, password_renewals) |
| `20260712…` (×2) | Operations Hub RLS policies |
| `20260713…` | Ops analytics views |
| `20261014…` | Auto-escalation cron job setup |
| `20261015…` | Operations schema refinements |
| `20261022000001` | Gamification (user_xp, upload_streaks, achievements, user_achievements, daily_challenges, user_daily_progress, xp_transactions, triggers, seed data) |
| `20261022000004` | Tier 3 features |
| `20261022000005_onboarding_tours` | Tour definitions, user_tour_progress, RLS, seed tours |
| `20261022000005_tier1_infra` | Infrastructure improvements |
| `20261022000006_all_tiers` | All-tier consolidation |
| `20261022000006_tier2_features` | Tier 2 feature additions |
| `20261023000001` | Unified user management: `user_app_access` table, `user_activity_summary` view, initial access grants |
