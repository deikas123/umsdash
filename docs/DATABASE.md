# Database Schema

All tables live in the `public` schema in PostgreSQL (Supabase). Row Level Security (RLS) is enabled on every table. The type definitions are auto-generated at `src/integrations/supabase/types.ts`.

---

## Authentication & Users

### `profiles`
Extends `auth.users` with application-level fields.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| full_name | text | |
| email | text | |
| phone | text | nullable |
| department | text | nullable |
| position | staff_position enum | nullable |
| avatar_url | text | nullable |
| must_reset_password | boolean | default false |
| password_changed_at | timestamptz | nullable |
| password_expiry_days | integer | nullable |
| notification_preferences | jsonb | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `user_roles`
Maps each user to their base application role.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| role | app_role enum | default 'staff' |
| created_at | timestamptz | |

### `user_app_access`
Tracks which apps each user has been granted access to.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | |
| app_id | text | |
| granted_by | uuid | nullable |
| granted_at | timestamptz | |

### `custom_roles`
Administrator-defined roles that extend the base RBAC.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | unique slug |
| display_name | text | |
| description | text | nullable |
| base_role | text | default 'staff' |
| color | text | hex color |
| is_system | boolean | system roles cannot be deleted |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `user_custom_roles`
Junction table assigning custom roles to users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | |
| role_id | uuid | FK → custom_roles |
| assigned_by | uuid | nullable |
| assigned_at | timestamptz | |

---

## Documents

### `documents`
Core document records.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | |
| description | text | nullable |
| file_name | text | |
| file_path | text | Storage path in `documents` bucket |
| file_size | integer | bytes |
| file_type | text | MIME type |
| category_id | uuid | FK → document_categories |
| customer_id | uuid | FK → customers |
| uploaded_by | uuid | nullable, FK → auth.users |
| status | document_status enum | pending/approved/archived |
| is_private | boolean | |
| expiry_date | date | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `document_categories`
| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| description | text nullable |
| color | text nullable |
| display_order | integer |
| created_at | timestamptz |

### `document_versions`
Version history for a document.

| Column | Type |
|---|---|
| id | uuid PK |
| document_id | uuid FK → documents |
| version_number | integer |
| file_name | text |
| file_path | text |
| file_size | integer |
| file_type | text |
| notes | text nullable |
| uploaded_by | uuid nullable |
| created_at | timestamptz |

### `document_comments`
| Column | Type |
|---|---|
| id | uuid PK |
| document_id | uuid FK → documents |
| user_id | uuid |
| content | text |
| created_at | timestamptz |

### `document_text_content`
OCR-extracted text content for full-text search.

| Column | Type |
|---|---|
| id | uuid PK |
| document_id | uuid |
| extracted_text | text nullable |
| extraction_status | text |
| extracted_at | timestamptz nullable |
| created_at | timestamptz |

### `deletion_requests`
Soft-delete workflow — staff request deletion, admin approves.

| Column | Type |
|---|---|
| id | uuid PK |
| document_id | uuid FK → documents |
| requested_by | uuid |
| reason | text nullable |
| status | text (pending/approved/rejected) |
| reviewed_by | uuid nullable |
| reviewed_at | timestamptz nullable |
| created_at | timestamptz |

---

## Customers

### `customers`
| Column | Type |
|---|---|
| id | uuid PK |
| account_number | text |
| full_name | text |
| email | text nullable |
| phone | text nullable |
| address | text nullable |
| user_id | uuid nullable — linked portal user |
| created_at | timestamptz |
| updated_at | timestamptz |

---

## Folders

### `folders`
Nested folder tree (parent_id self-reference).

| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| description | text nullable |
| owner_id | uuid |
| parent_id | uuid nullable FK → folders(id) |
| created_at | timestamptz |
| updated_at | timestamptz |

### `folder_documents`
Files uploaded directly into a private folder.

| Column | Type |
|---|---|
| id | uuid PK |
| folder_id | uuid FK → folders |
| file_name | text |
| file_path | text |
| file_size | integer |
| file_type | text |
| uploaded_by | uuid |
| created_at | timestamptz |

### `folder_shares`
Per-user sharing grants on a folder.

| Column | Type |
|---|---|
| id | uuid PK |
| folder_id | uuid FK → folders |
| shared_with_user_id | uuid |
| can_edit | boolean |
| include_subfolders | boolean |
| created_at | timestamptz |

---

## Tasks & Reminders

### `tasks`
| Column | Type |
|---|---|
| id | uuid PK |
| title | text |
| description | text nullable |
| created_by | uuid |
| due_date | date nullable |
| priority | task_priority enum |
| status | task_status enum |
| created_at / updated_at | timestamptz |

### `task_assignees`
| Column | Type |
|---|---|
| id | uuid PK |
| task_id | uuid FK → tasks |
| user_id | uuid |
| status | text |
| started_at | timestamptz nullable |
| completed_at | timestamptz nullable |
| created_at | timestamptz |

### `task_comments`
| Column | Type |
|---|---|
| id | uuid PK |
| task_id | uuid FK → tasks |
| user_id | uuid |
| content | text |
| created_at | timestamptz |

### `task_files`
| Column | Type |
|---|---|
| id | uuid PK |
| task_id | uuid FK → tasks |
| uploaded_by | uuid |
| file_name / file_path / file_size / file_type | |
| upload_type | text |
| created_at | timestamptz |

### `reminders`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| title | text |
| description | text nullable |
| reminder_date | timestamptz |
| recurrence | text |
| status | text |
| created_at / updated_at | timestamptz |

---

## Communication

### `chat_messages`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| content | text |
| mentions | uuid[] nullable |
| created_at | timestamptz |

### `in_app_notifications`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| title | text |
| message | text |
| type | text |
| is_read | boolean |
| link | text nullable |
| created_at | timestamptz |

### `push_subscriptions`
Web Push API subscription objects.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| endpoint | text |
| p256dh | text |
| auth | text |
| created_at | timestamptz |

### `sms_logs`
| Column | Type |
|---|---|
| id | uuid PK |
| sent_by | uuid |
| recipient_phone | text |
| recipient_name | text nullable |
| message | text |
| sms_type | text |
| status | text |
| api_response | jsonb nullable |
| created_at | timestamptz |

### `sms_preferences`
Per-user SMS notification opt-in settings.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| sms_enabled | boolean |
| phone_number | text nullable |
| notify_tasks | boolean |
| notify_task_updates | boolean |
| notify_reminders | boolean |
| created_at / updated_at | timestamptz |

---

## Operations

### `vendor_issues`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| vendor | text |
| issue | text |
| impact | text |
| status | text |
| system_name | text nullable |
| date_reported | date nullable |
| downtime | text nullable |
| uptime_start / uptime_end | timestamptz nullable |
| uptime_percentage | numeric nullable |
| rca_status | text nullable |
| created_at / updated_at | timestamptz |

### `incidents`
Full incident management with 5-Why RCA and CAPA.

Key columns: `id`, `incident_number`, `incident_type`, `severity`, `status`, `urgency`, `user_id`, `department`, `location`, `date_of_incident`, `date_reported`, `time_of_incident`, `description`, `problem_statement`, `persons_involved`, `witnesses`, `immediate_actions[]`, `root_cause_categories[]`, `root_cause_statement`, `why_1..why_5`, `capa_action`, `capa_owner`, `capa_deadline`, `capa_status`, `containment_details`, `safety_impact[]`, `operational_impact[]`, `financial_impact`, `financial_amount`, `estimated_value`, `item_description`, `item_quantity`, `serial_numbers`, `supporting_docs[]`, `reported_by`, `created_at`, `updated_at`

### `escalations`
| Column | Type |
|---|---|
| id | uuid PK |
| title | text |
| source_table | text |
| source_id | uuid |
| status | text |
| current_level | integer |
| level_deadline | timestamptz nullable |
| assigned_to | uuid nullable |
| created_by | uuid nullable |
| resolved_at | timestamptz nullable |
| created_at / updated_at | timestamptz |

### `escalation_events`
Audit trail of level changes and actions on an escalation.

| Column | Type |
|---|---|
| id | uuid PK |
| escalation_id | uuid |
| event_type | text |
| from_level / to_level | integer nullable |
| actor_id | uuid nullable |
| note | text nullable |
| created_at | timestamptz |

### `escalation_levels`
Configuration table defining escalation levels and SLA hours.

| Column | Type |
|---|---|
| level | integer PK |
| name | text |
| target_role | app_role enum nullable |
| hours_to_next | integer nullable |

### `passwords`
Password rotation tracker for systems/services.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| system_name | text |
| username | text |
| assigned_to | text nullable |
| owner_user_id / backup_user_id | uuid nullable |
| phone_number | text nullable |
| expiry_date | date |
| rotation_days | integer |
| last_renewed_at / last_notified_at | timestamptz nullable |
| notified | boolean nullable |
| created_at / updated_at | timestamptz |

### `password_renewals`
History of each password renewal.

| Column | Type |
|---|---|
| id | uuid PK |
| password_id | uuid |
| previous_expiry | date nullable |
| new_expiry | date |
| notes | text nullable |
| renewed_by | uuid nullable |
| created_at | timestamptz |

### `ops_notifications`
Operations Hub-specific in-app notifications.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| title | text |
| body | text nullable |
| link | text nullable |
| read | boolean |
| created_at | timestamptz |

---

## Gamification

### `user_xp`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid unique |
| total_xp | integer |
| level | integer |
| updated_at | timestamptz |

### `upload_streaks`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid unique |
| current_streak | integer |
| longest_streak | integer |
| last_upload_date | date nullable |
| updated_at | timestamptz |

### `achievements`
Reference table of all achievement definitions.

| Column | Type |
|---|---|
| id | uuid PK |
| key | text unique |
| name | text |
| description | text nullable |
| icon | text nullable |
| xp_reward | integer |
| category | text nullable |

### `user_achievements`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| achievement_key | text FK → achievements(key) |
| earned_at | timestamptz |

### `daily_challenges`
| Column | Type |
|---|---|
| id | uuid PK |
| date | date unique |
| type | text |
| target_count | integer |
| xp_reward | integer |
| label | text |
| icon | text |

### `user_daily_progress`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| challenge_date | date FK → daily_challenges(date) |
| progress | integer |
| completed | boolean |
| completed_at | timestamptz nullable |

### `xp_transactions`
Immutable ledger of every XP award.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| amount | integer |
| reason | text |
| ref_id | uuid nullable |
| created_at | timestamptz |

---

## Onboarding

### `tour_definitions`
| Column | Type |
|---|---|
| id | uuid PK |
| key | text unique |
| name | text |
| description | text nullable |
| target_role | app_role enum nullable |
| is_active | boolean |
| steps | jsonb |
| display_order | integer |
| created_at / updated_at | timestamptz |

### `user_tour_progress`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| tour_key | text FK → tour_definitions(key) |
| status | text (not_started / in_progress / completed / dismissed) |
| current_step | integer |
| completed_at | timestamptz nullable |
| updated_at | timestamptz |

---

## RBAC

### `custom_roles` — see Authentication & Users section
### `role_permissions`
Grants individual permission keys to a custom role.

| Column | Type |
|---|---|
| id | uuid PK |
| role_id | uuid FK → custom_roles |
| permission_key | text |
| granted_at | timestamptz |

---

## System

### `system_settings`
Key-value store for application configuration.

| Column | Type |
|---|---|
| id | uuid PK |
| key | text |
| value | jsonb |
| created_at / updated_at | timestamptz |

### `departments`
| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| description | text nullable |
| created_at | timestamptz |

### `webhooks`
| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| url | text |
| events | text[] |
| secret | text nullable |
| active | boolean |
| created_by | uuid nullable |
| created_at / updated_at | timestamptz |

### `api_keys`
| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| key_prefix | text |
| key_hash | text |
| scopes | text[] |
| last_used_at | timestamptz nullable |
| expires_at | timestamptz nullable |
| revoked | boolean |
| created_by | uuid nullable |
| created_at | timestamptz |

### `export_schedules`
| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| schedule_type | text |
| day_of_week | integer nullable |
| day_of_month | integer nullable |
| export_type | text |
| format | text |
| email_to | text[] nullable |
| last_run_at / next_run_at | timestamptz nullable |
| active | boolean |
| created_by | uuid nullable |
| created_at | timestamptz |

### `audit_logs`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid nullable |
| action | text |
| entity_type | text |
| entity_id | uuid nullable |
| details | jsonb nullable |
| ip_address | text nullable |
| created_at | timestamptz |

---

## Views

### `user_activity_summary`
Aggregated view used by the admin User Hub. Columns: `user_id`, `full_name`, `email`, `avatar_url`, `department`, `phone`, `role`, `must_reset_password`, `docs_uploaded`, `tasks_created`, `audit_events`, `last_active_at`, `current_streak`, `total_xp`, `level_name`.

---

## Database Functions

| Function | Returns | Description |
|---|---|---|
| `get_user_role(uuid)` | app_role | Returns the user's base role |
| `has_role(app_role, uuid)` | boolean | Checks if user has a given role |
| `is_super_admin(uuid)` | boolean | Checks super admin status |
| `get_user_position(uuid)` | staff_position | Returns the user's position enum |
| `get_customer_id_for_user(uuid)` | uuid | Resolves the customer record for a portal user |
| `has_folder_access(folder_id, user_id)` | boolean | Checks folder ownership or share grant |
| `is_folder_owner(folder_id, user_id)` | boolean | Checks folder ownership only |
| `can_manage_tasks(user_id)` | boolean | Returns true for admin and staff |
| `is_task_assignee(task_id, user_id)` | boolean | Checks task assignment |
| `create_due_reminder_notifications()` | void | Creates in-app notifications for due reminders |
| `export_schema_ddl()` | text | Returns full schema DDL for database export |
| `award_xp(user_id, amount, reason, ref_id)` | void | Records XP transaction and updates user_xp level |
| `process_document_upload(user_id, doc_id)` | void | Handles streak, XP, daily challenge, achievements on upload |
| `check_and_award_achievements(user_id)` | void | Checks volume achievements (uploads_10, uploads_50) |
| `insert_in_app_notification_for_user(...)` | void | SECURITY DEFINER wrapper for notification inserts |

---

## Enums

| Enum | Values |
|---|---|
| `app_role` | `admin`, `staff`, `customer`, `manager`, `user` |
| `document_status` | `pending`, `approved`, `archived` |
| `staff_position` | `super_admin`, `hr`, `hod`, `staff` |
| `task_priority` | `low`, `normal`, `high` |
| `task_status` | `pending`, `in_progress`, `completed` |

> Note: `manager` and `user` values in `app_role` are legacy and mapped to `staff` in the application layer.
