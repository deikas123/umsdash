# UMS Hub — Feature Reference

Every user-facing feature, organised by area. Roles listed as: **A** = admin, **S** = staff, **C** = customer, **SA** = super admin only.

---

## Platform — Shared Shell

### App Launcher
- **What:** Landing page after login. Greet card, live stats (documents, customers, streak), app cards, recent activity feed.
- **URL:** `/`
- **Roles:** All authenticated users
- **Three view modes:** Classic (card grid), Modern (featured app hero + sidebar list), Compact (list). Persisted to `localStorage` key `umshub_launcher_view`.
- **Continue from last page:** Each card links to the last page visited in that app.
- **Key files:** `src/pages/AppLauncher.tsx`

### App Store
- **What:** Catalogue of available and upcoming UMS Hub applications.
- **URL:** `/apps`
- **Roles:** All authenticated users (customers redirected away from Ops)
- **Key files:** `src/pages/AppStore.tsx`

### App Sidebar with App Switcher
- **What:** Collapsible sidebar containing navigation for the active app. Top pill lets admin/staff switch between Docs and Ops, resuming the last page in each app.
- **Roles:** All authenticated users (customers see reduced nav)
- **Key files:** `src/components/layout/AppSidebar.tsx`

### Command Palette
- **What:** Keyboard-driven search and navigation (⌘K / Ctrl+K).
- **Roles:** All authenticated users
- **Key files:** `src/components/CommandPalette.tsx`

### Keyboard Shortcuts
- **What:** Dialog listing all keyboard shortcuts.
- **Roles:** All authenticated users
- **Key files:** `src/components/KeyboardShortcutsDialog.tsx`

### Theme Toggle
- **What:** Switch between light, dark, and system themes.
- **Roles:** All authenticated users
- **Key files:** `src/components/ThemeToggle.tsx`, `src/hooks/useTheme.ts`

### Density Toggle
- **What:** Switch between compact and comfortable UI density.
- **Roles:** All authenticated users
- **Key files:** `src/components/DensityToggle.tsx`

### What's New
- **What:** Changelog popover showing recent feature additions.
- **Roles:** All authenticated users
- **Key files:** `src/components/WhatsNew.tsx`

### Quick Actions (FAB)
- **What:** Floating action button for context-sensitive quick actions (e.g. upload document, new task).
- **Roles:** All authenticated users
- **Key files:** `src/components/QuickActions.tsx`

### Announcement Banner
- **What:** System-wide announcement bar driven by `system_settings` key `announcement_text`.
- **Roles:** All authenticated users
- **Key files:** `src/components/AnnouncementBanner.tsx`

### Maintenance Mode
- **What:** Gate that shows a maintenance page when `system_settings.maintenance_mode = true`.
- **Roles:** All (gate applies to everyone including admins)
- **Key files:** `src/components/MaintenanceGate.tsx`

### Inactivity Timeout
- **What:** Automatically signs out the user after 15 minutes of inactivity. Shows a 1-minute warning toast before logout.
- **Roles:** All authenticated users
- **Key files:** `src/hooks/useInactivityTimeout.ts`

### Sessions
- **What:** Lists the user's active sessions.
- **URL:** `/docs/sessions`
- **Roles:** All authenticated users
- **Key files:** `src/pages/Sessions.tsx`

### Settings
- **What:** Personal settings — profile, avatar, password, SMS preferences, push notification subscription, MFA (TOTP) setup, onboarding tour replay, notification preferences.
- **URL:** `/docs/settings`
- **Roles:** All authenticated users
- **Key files:** `src/pages/Settings.tsx`, `src/components/settings/`

---

## Platform — Onboarding Tours

### Auto-start Tours
- **What:** When a user has a tour with `status = 'not_started'`, it starts automatically 600ms after login.
- **Roles:** All authenticated users (tours are filtered by `target_role`)
- **Tours seeded:** `platform_welcome` (all roles), `docs_welcome` (admin), `ops_welcome` (staff), `customer_welcome` (customer)
- **Key files:** `src/hooks/useOnboardingTour.ts`, `src/components/onboarding/TourController.tsx`

### Spotlight Tooltip Steps
- **What:** Tour steps with a `selector` field highlight the target element with a spotlight overlay. Steps without a `selector` show a centred modal dialog.
- **Placements:** `center`, `top`, `bottom`, `left`, `right`

### Replay from Settings
- **What:** Users can replay or reset any completed tour from the Settings page.
- **URL:** `/docs/settings` → Onboarding Tours section

### Tour Manager (Admin)
- **What:** Super admin can view, edit, and reset tours for individual users.
- **URL:** `/docs/tour-manager`
- **Roles:** SA only
- **Key files:** `src/pages/TourManager.tsx`

---

## Platform — Gamification

### My Progress Dashboard
- **What:** XP total, level, current streak, longest streak, achievements gallery, XP transaction history, leaderboard, daily challenge progress.
- **URL:** `/docs/gamification`
- **Roles:** All authenticated users
- **Key files:** `src/pages/GamificationDashboard.tsx`, `src/hooks/useGamification.ts`, `src/components/gamification/`

### XP System
- **What:** Users earn XP for actions. XP is accumulated in `user_xp.total_xp`. Level = `floor(1 + sqrt(total_xp / 100))`.
- **Sources:** document upload (+50 XP), task completion (+30 XP), reminder completion (+20 XP)

### Streak System
- **What:** `upload_streaks` tracks how many consecutive days a user has uploaded at least one document. Resets if a day is skipped.

### Achievements
Nine seeded achievements:

| Key | Name | Condition | XP Reward |
|---|---|---|---|
| `first_upload` | First Upload | Upload first document | 50 |
| `streak_3` | 3-Day Streak | 3 consecutive upload days | 75 |
| `streak_7` | Week Warrior | 7 consecutive upload days | 150 |
| `streak_14` | Fortnight Fire | 14 consecutive upload days | 300 |
| `streak_30` | Monthly Master | 30 consecutive upload days | 500 |
| `uploads_10` | Document Hoarder | 10 total uploads | 100 |
| `uploads_50` | Archive Legend | 50 total uploads | 250 |
| `task_complete` | Task Crusher | Complete first task | 30 |
| `reminder_champion` | On Time | Complete a reminder | 20 |

### Daily Challenges
- **What:** One challenge per day (type alternates `upload` / `task`). Users complete the challenge to earn XP.
- **Seeded:** 7 days ahead by the gamification migration. Production setup should schedule recurring seeding.

### Leaderboard
- **What:** Top 10 users by `user_xp.total_xp`, shown on the My Progress page.
- **Key files:** `useLeaderboard()` in `src/hooks/useGamification.ts`

---

## Platform — Notifications

### In-App Notifications
- **What:** Per-user notification inbox with unread count badge on `NotificationBell`.
- **URL:** `/docs/in-app-notifications`
- **Roles:** All authenticated users
- **Key files:** `src/pages/InAppNotifications.tsx`, `src/hooks/useInAppNotifications.ts`, `src/components/NotificationBell.tsx`

### Push Notifications (Web Push)
- **What:** Browser push notifications. Users subscribe in Settings. Subscription stored in `push_subscriptions`.
- **Roles:** All authenticated users
- **Key files:** `src/hooks/usePushNotifications.ts`, Edge Function `send-push`
- **Note:** `send-push` is currently a stub; integrate real VAPID-based Web Push to enable delivery.

### SMS Notifications
- **What:** SMS alerts via TextSMS Kenya for tasks, reminders, and password expiry. Configurable per-user in Settings.
- **Tables:** `sms_preferences`, `sms_logs`
- **Key files:** `src/hooks/useSmsPreferences.ts`, Edge Functions `send-sms`, `notify-sms`, `password-reminders`

---

## Document Vault

### Dashboard
- **What:** Stats overview — total documents, customers, pending tasks, recent uploads. Charts for document status breakdown.
- **URL:** `/docs`
- **Roles:** A, S
- **Key files:** `src/pages/Dashboard.tsx`, `src/hooks/useStats.ts`

### Upload Document
- **What:** Upload one or more documents for a customer. Select category, set expiry, mark private. Supports drag-and-drop and camera capture (mobile).
- **URL:** `/docs/upload`
- **Roles:** A, S
- **Key files:** `src/pages/Upload.tsx`, `src/components/upload/`

### All Documents
- **What:** Paginated, filterable list of all documents. Preview, download, approve/archive, request deletion, view version history.
- **URL:** `/docs/documents`
- **Roles:** A, S
- **Key files:** `src/pages/Documents.tsx`, `src/hooks/useDocuments.ts`, `src/components/documents/`

### Document Expiry
- **What:** Documents filtered to show those expiring soon or already expired. Colour-coded urgency.
- **URL:** `/docs/document-expiry`
- **Roles:** A, S
- **Key files:** `src/pages/DocumentExpiry.tsx`

### My Documents (Customer Portal)
- **What:** Customer-facing view showing only documents belonging to their account. Download, preview.
- **URL:** `/docs/my-documents`
- **Roles:** C only
- **Key files:** `src/pages/MyDocuments.tsx`

### Search
- **What:** Full-text search across document titles, descriptions, and customer names.
- **URL:** `/docs/search`
- **Roles:** A, S
- **Key files:** `src/pages/Search.tsx`

### Customers
- **What:** List, create, edit, and delete customer records. Bulk CSV import. Link a customer to a portal user account.
- **URL:** `/docs/customers`
- **Roles:** A, S
- **Key files:** `src/pages/Customers.tsx`, `src/components/customers/`

### Private Folders
- **What:** Personal folder tree with nested sub-folders. Upload files directly to folders. Share folders with specific users (with edit permission and sub-folder inheritance options).
- **URL:** `/docs/folders`
- **Roles:** All authenticated users
- **Key files:** `src/pages/Folders.tsx`, `src/hooks/useFolders.ts`, `src/components/folders/`

### Tasks
- **What:** Create and assign tasks with priority and due date. Kanban-style view. Comment and attach files. Completing a task awards 30 XP.
- **URL:** `/docs/tasks`
- **Roles:** All authenticated users (customers can view assigned tasks)
- **Key files:** `src/pages/Tasks.tsx`, `src/hooks/useTasks.ts`, `src/components/tasks/`

### Reminders
- **What:** Personal reminders with recurrence options (daily, weekly, monthly). SMS and in-app alerts.
- **URL:** `/docs/reminders`
- **Roles:** All authenticated users
- **Key files:** `src/pages/Reminders.tsx`, `src/hooks/useReminders.ts`

### Team Chat
- **What:** Real-time team chat with @mention support. Messages are broadcast to all staff/admin.
- **URL:** `/docs/chat`
- **Roles:** All authenticated users
- **Key files:** `src/pages/Chat.tsx`, `src/hooks/useChat.ts`

### Document Templates
- **What:** Reusable document template library for common document types.
- **URL:** `/docs/templates`
- **Roles:** A only
- **Key files:** `src/pages/DocumentTemplates.tsx`

---

## Document Vault — Admin

### User Management (Legacy)
- **What:** Simple user list — older page superseded by User Hub.
- **URL:** `/docs/users`
- **Roles:** A only
- **Key files:** `src/pages/Users.tsx`

### Reports
- **What:** Customizable report builder. Generate document activity, customer stats, user activity, and audit reports. Export to CSV, Excel, and PDF.
- **URL:** `/docs/reports`
- **Roles:** A only
- **Key files:** `src/pages/Reports.tsx`, `src/lib/export-utils.ts`, `src/lib/exportUtils.ts`

### Activity Feed
- **What:** Live feed of all system events from `audit_logs`.
- **URL:** `/docs/activity`
- **Roles:** A only
- **Key files:** `src/pages/ActivityFeed.tsx`

### Notifications Management
- **What:** Admin view of all `in_app_notifications`. Send broadcast notifications.
- **URL:** `/docs/notifications`
- **Roles:** A, S
- **Key files:** `src/pages/Notifications.tsx`

### Deletion Requests
- **What:** Review and approve/reject staff/customer requests to delete documents.
- **URL:** `/docs/deletion-requests`
- **Roles:** A only (sidebar badge shows pending count)
- **Key files:** `src/pages/DeletionRequests.tsx`

### Categories
- **What:** Manage document categories — name, description, color.
- **URL:** `/docs/categories`
- **Roles:** A only
- **Key files:** `src/pages/Categories.tsx`

### Audit Logs
- **What:** Full immutable audit trail. Filter by user, action type, date range. Export to CSV.
- **URL:** `/docs/audit-logs`
- **Roles:** A only
- **Key files:** `src/pages/AuditLogs.tsx`

### Storage Analytics
- **What:** Supabase Storage usage breakdown by bucket, file type, and uploader.
- **URL:** `/docs/storage-analytics`
- **Roles:** A only
- **Key files:** `src/pages/StorageAnalytics.tsx`

### Activity Heatmap
- **What:** Calendar heatmap of document upload activity.
- **URL:** `/docs/activity-heatmap`
- **Roles:** A only
- **Key files:** `src/pages/ActivityHeatmap.tsx`

### Customer Activity
- **What:** Per-customer activity summary — last login, documents downloaded, tasks.
- **URL:** `/docs/customer-activity`
- **Roles:** A only
- **Key files:** `src/pages/CustomerActivity.tsx`

### User Activity Log
- **What:** Detailed per-user audit log timeline.
- **URL:** `/docs/users/:userId/activity`
- **Roles:** A only
- **Key files:** `src/pages/UserActivityLog.tsx`

### Export Scheduler
- **What:** Configure automated recurring exports (weekly/monthly) of documents or audit logs to CSV/Excel/PDF. Records scheduled via `export_schedules` table, triggered by `run-scheduled-export` Edge Function.
- **URL:** `/docs/export-scheduler`
- **Roles:** A only
- **Key files:** `src/pages/ExportScheduler.tsx`

### Webhooks
- **What:** Configure outbound webhook endpoints. Subscribe to events (document_uploaded, task_completed, etc.). Webhooks are POSTed with HMAC-SHA256 signatures via the `trigger-webhook` Edge Function.
- **URL:** `/docs/webhooks`
- **Roles:** A only
- **Key files:** `src/pages/Webhooks.tsx`

### API Keys
- **What:** Generate and manage API keys for programmatic access. Keys are hashed (bcrypt); only the prefix is stored in plain text.
- **URL:** `/docs/api-keys`
- **Roles:** A only
- **Key files:** `src/pages/ApiKeys.tsx`

### Database Export (Super Admin)
- **What:** Full database export to ZIP — schema DDL, all table data as SQL INSERTs, storage file copies, edge function source, FK graph JSONL, and validation report. Streams progress via Server-Sent Events.
- **URL:** `/docs/database-export`
- **Roles:** SA only
- **Key files:** `src/pages/DatabaseExport.tsx`, Edge Function `export-database`

### Tour Manager (Super Admin)
- **What:** View all tour definitions, see user completion status, reset tours for specific users, edit tour steps (JSON editor).
- **URL:** `/docs/tour-manager`
- **Roles:** SA only
- **Key files:** `src/pages/TourManager.tsx`

---

## User Hub

### User Hub (Unified)
- **What:** Cross-app admin panel for managing all users. Shows `user_activity_summary` view. Create, edit, delete users. Manage roles and per-app access grants (`user_app_access`). Force password reset.
- **URL:** `/admin/users` (accessed from sidebar "User Hub" item — note: sidebar links to `/admin/users`, page is `UserHub.tsx`)
- **Roles:** A only
- **Key files:** `src/pages/UserHub.tsx`, `src/hooks/useUserHub.ts`

---

## Operations Hub

### Ops Dashboard
- **What:** Overview stats for vendor issues, incidents, escalations, and password expiry. Recent activity.
- **URL:** `/ops`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpDashboard.tsx`

### Vendor Issues
- **What:** Log and track vendor service issues. Set impact level, status, and link to RCA. Bulk export.
- **URL:** `/ops/vendor-issues`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpVendorIssues.tsx`

### Vendor Uptime
- **What:** Record uptime windows for vendors. Calculate uptime percentage. Visualised on a chart.
- **URL:** `/ops/vendor-uptime`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpVendorUptime.tsx`

### Vendor Scorecard
- **What:** Aggregated vendor performance scorecard — issue count, resolution rate, average uptime.
- **URL:** `/ops/scorecard`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpVendorScorecard.tsx`

### Incidents
- **What:** Full incident management with 5-Why root cause analysis, CAPA tracking, financial and safety impact fields, supporting documents, and escalation creation.
- **URL:** `/ops/incidents`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpIncidents.tsx`

### Escalations
- **What:** Multi-level escalation tracker. Create escalations from incidents or vendor issues. Manually or automatically escalate to next level. Acknowledge, resolve, reopen, comment. Notifications sent via SMS and in-app on each transition.
- **URL:** `/ops/escalations`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpEscalations.tsx`, Edge Function `escalations`

### Passwords (Credential Manager)
- **What:** Track system passwords with expiry dates and rotation schedules. SMS reminders at 14/7/2/0 days before expiry and daily once overdue. Owner and backup contacts per password.
- **URL:** `/ops/passwords`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpPasswords.tsx`, Edge Function `password-reminders`

### Operations Documents
- **What:** Document storage specific to Operations Hub team (separate from customer documents).
- **URL:** `/ops/documents`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpDocuments.tsx`

### Analytics
- **What:** Ops analytics charts — incidents over time, vendor issue trends, escalation funnel, password expiry calendar.
- **URL:** `/ops/analytics`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpAnalytics.tsx`

### SMS Logs
- **What:** View all SMS messages sent from Ops Hub (escalations, password reminders).
- **URL:** `/ops/sms-logs`
- **Roles:** A only
- **Key files:** `src/pages/operations/OpSmsLogs.tsx`

### On-Call Schedule
- **What:** On-call rota management for operations team.
- **URL:** `/ops/oncall`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpOnCall.tsx`

### User Management (Ops)
- **What:** Ops-specific user management — view and manage users who have ops app access. Mirrors User Hub but scoped to `/ops/users`.
- **URL:** `/ops/users`
- **Roles:** A only
- **Key files:** `src/pages/operations/OpUserManagement.tsx`

### Force Password Change (Ops)
- **What:** Admin can force a user to change their Supabase auth password from the Ops Hub.
- **URL:** `/ops/force-password-change`
- **Roles:** A, S
- **Key files:** `src/pages/operations/OpForcePasswordChange.tsx`, Edge Function `complete-password-change`
