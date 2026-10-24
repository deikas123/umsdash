# Feature Reference

All features are part of the single UMS Hub SPA. Access control is enforced both at the route level (ProtectedRoute) and at the database level (RLS policies).

---

## Platform

| Feature | URL | Roles | Description |
|---|---|---|---|
| App Launcher | `/` | all | Home screen with 3 view modes (Classic/Modern/Compact), animated WelcomeScreen on first visit, app cards for Document Vault and Operations Hub |
| App Store | `/apps` | all | Browse installed apps and coming-soon apps |
| User Hub | `/admin/users` | admin | Unified user management — create, edit, deactivate users, assign roles, view activity summary |
| Reports Hub | `/admin/reports` | admin | Cross-app reporting dashboard combining document and operations metrics |
| Role Manager | `/admin/roles` | super admin | CRUD for custom roles, assign permission keys, assign custom roles to users |
| Auth | `/auth` | public | Email/password login with optional TOTP MFA |
| Setup Admin | `/setup` | public | One-time setup to create the first admin account |

---

## Document Vault (`/docs/*`)

### Staff & Admin

| Feature | URL | Roles | Description |
|---|---|---|---|
| Dashboard | `/docs` | admin, staff | Overview of document stats, recent uploads, expiring documents, task summary |
| Upload Document | `/docs/upload` | admin, staff | Drag-and-drop upload with category and customer assignment, auto-triggers gamification |
| All Documents | `/docs/documents` | admin, staff | Searchable, filterable document table with preview, download, version history, and comments |
| Doc Expiry | `/docs/document-expiry` | admin, staff | Documents sorted by expiry date; highlights expiring within 30/7 days |
| Search | `/docs/search` | admin, staff | Full-text search across document titles and OCR-extracted text content |
| Customers | `/docs/customers` | admin, staff | Customer directory — view customer profiles, linked documents, account numbers |
| Notifications (SMS) | `/docs/notifications` | admin, staff | Compose and send SMS notifications via TextSMS Kenya to customers or staff |

### All Authenticated Users

| Feature | URL | Roles | Description |
|---|---|---|---|
| Private Folders | `/docs/folders` | all | Nested folder tree with drag-and-drop file uploads, folder sharing, subfolder support |
| Tasks | `/docs/tasks` | all | Create, assign, and track tasks with priorities, comments, file attachments, and due dates |
| Reminders | `/docs/reminders` | all | Personal reminders with recurrence options and SMS notification support |
| Team Chat | `/docs/chat` | all | Real-time group chat with user @mentions via Supabase Realtime |
| In-App Notifications | `/docs/in-app-notifications` | all | Notification inbox for gamification awards, system events, and admin messages |
| My Progress | `/docs/gamification` | all | XP bar, level display, upload streak, achievements gallery, daily challenge, XP leaderboard |
| Sessions | `/docs/sessions` | all | View and manage active login sessions |
| Settings | `/docs/settings` | all | Profile, password, MFA enrollment, SMS preferences, notification preferences, onboarding tours |

### Customer Portal

| Feature | URL | Roles | Description |
|---|---|---|---|
| My Documents | `/docs/my-documents` | customer | Documents shared with the logged-in customer; download and preview |

### Admin Only

| Feature | URL | Roles | Description |
|---|---|---|---|
| User Management | `/docs/users` | admin | User list with role assignment, password reset, enable/disable |
| User Activity Log | `/docs/users/:id/activity` | admin | Full audit trail for a specific user |
| Reports | `/docs/reports` | admin | Document and activity reports with export to PDF/Excel |
| Activity Feed | `/docs/activity` | admin | Real-time feed of all system actions |
| Notifications Admin | `/docs/notifications` | admin | Send broadcast SMS/notifications to users or customer segments |
| Deletion Requests | `/docs/deletion-requests` | admin | Review and approve or reject staff-initiated document deletion requests |
| Categories | `/docs/categories` | admin | Manage document category taxonomy with colors and ordering |
| Audit Logs | `/docs/audit-logs` | admin | Immutable audit log of all entity-level actions |
| Storage Analytics | `/docs/storage-analytics` | admin | Bucket usage stats, file type breakdown, per-user storage consumption |
| Activity Heatmap | `/docs/activity-heatmap` | admin | GitHub-style heatmap of upload/activity density over time |
| Customer Activity | `/docs/customer-activity` | admin | Per-customer document and access activity report |
| Document Templates | `/docs/templates` | admin | Manage reusable document templates for guided uploads |
| Export Scheduler | `/docs/export-scheduler` | admin | Schedule recurring data exports (daily/weekly/monthly) with email delivery |
| Webhooks | `/docs/webhooks` | admin | Configure outbound webhook endpoints for document events |
| API Keys | `/docs/api-keys` | admin | Create and revoke API keys with configurable scopes |
| Database Export | `/docs/database-export` | admin | Download a full ZIP of schema DDL + data + storage files (super admin: all data; admin: own data) |
| Tour Manager | `/docs/tour-manager` | super admin | CRUD for onboarding tour definitions, step editor, preview any tour, reset for all users |

---

## Operations Hub (`/ops/*`)

| Feature | URL | Roles | Description |
|---|---|---|---|
| Ops Dashboard | `/ops` | admin, staff | Summary of open vendor issues, active incidents, escalation count, password expiry alerts |
| Vendor Issues | `/ops/vendor-issues` | admin, staff | Log and track vendor-specific issues with impact rating, status, and RCA status |
| Vendor Uptime | `/ops/vendor-uptime` | admin, staff | Record uptime windows per vendor; calculate uptime percentage |
| Vendor Scorecard | `/ops/scorecard` | admin, staff | Aggregated performance scorecard across vendors |
| Incidents | `/ops/incidents` | admin, staff | Full incident lifecycle: 5-Why RCA, CAPA tracking, severity/urgency rating, supporting docs |
| Passwords | `/ops/passwords` | admin, staff | System password rotation tracker with expiry alerts and SMS reminders |
| Documents | `/ops/documents` | admin, staff | Ops-specific document store (separate from Document Vault) |
| Analytics | `/ops/analytics` | admin, staff | Charts and trends for vendor issues, incidents, and escalations |
| Escalations | `/ops/escalations` | admin, staff | Escalation management with multi-level SLA timers, auto-escalation via cron, SMS notifications |
| On-Call Schedule | `/ops/oncall` | admin, staff | On-call roster management |
| SMS Logs | `/ops/sms-logs` | admin | Log of all outbound SMS messages sent via Operations Hub |
| Users (Ops) | `/ops/users` | admin | Ops-specific user management and force password change |
| Force Password Change | `/ops/force-password-change` | admin, staff | Trigger forced password reset for a user |

---

## Administration (`/admin/*`)

| Feature | URL | Roles | Description |
|---|---|---|---|
| User Hub | `/admin/users` | admin | Consolidated user management portal with activity summary view |
| Reports Hub | `/admin/reports` | admin | Unified reporting across both apps |
| Role Manager | `/admin/roles` | super admin | Custom role creation, permission key management, user-role assignment |
