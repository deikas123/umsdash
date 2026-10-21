# UMS Document Vault — Investigation Report

**Repository**: https://github.com/deikas123/ums-docs-vault.git  
**Cloned to**: `.agents/tmp/ums-docs-vault/`  
**Investigation Date**: 2026-10-21  
**Purpose**: Support planning for merging with uptime-hub into a single combined system

---

## Summary

**UMS Document Vault** is a mature, production-ready SPA (Single Page Application) built with React 18 + TypeScript + Vite, backed entirely by **Supabase** (PostgreSQL + Auth + Storage + Edge Functions). It is a role-based **document management system** designed for an organization (UMS Kenya) to store, share, and manage documents for its customers. It includes an active set of features well beyond simple document storage: task management, reminders, in-app notifications, SMS notifications, a chat system, audit logging, private folders, reports, analytics, and database export.

Both repos — ums-docs-vault and uptime-hub — share the **same tech stack** (React/TypeScript/Vite/Supabase/shadcn-ui/Tailwind/TanStack Query) and are both Lovable-generated projects. They use **different Supabase projects** with separate databases and auth systems, which is the primary technical challenge in merging them.

---

## 1. Purpose & Features

### Core Purpose
A secure, role-based document management portal for a utility company (UMS Kenya). Staff and admins upload and manage customer documents; customers log in to view only their own documents.

### Full Feature Set (from `src/App.tsx` routes + pages directory)

| Feature Area | Pages/Components | Description |
|---|---|---|
| **Authentication** | `Auth.tsx`, `SetupAdmin.tsx` | Email/password login, initial admin seeding, password expiry enforcement |
| **Dashboard** | `Dashboard.tsx` | Stats cards, activity feed, charts — admin/staff only |
| **Document Management** | `Documents.tsx`, `Upload.tsx`, `MyDocuments.tsx` | Upload, browse, search, preview, download, version history, comments |
| **Customer Management** | `Customers.tsx` | CRUD, bulk CSV import, link portal accounts, browse per-customer docs |
| **User Management** | `Users.tsx`, `UserActivityLog.tsx` | Create/edit staff & customer accounts, per-user activity log |
| **Folders (Private)** | `Folders.tsx` | Create private folder hierarchy (nested subfolders), share with edit/view permissions, camera capture upload |
| **Task System** | `Tasks.tsx` | Create tasks, assign to staff, file attachments, status workflow (pending → in_progress → completed) |
| **Reminders** | `Reminders.tsx` | Personal reminders with recurrence, cron-based due notifications |
| **Chat** | `Chat.tsx` | In-app messaging between users |
| **Notifications** | `Notifications.tsx`, `InAppNotifications.tsx` | SMS notifications (TextSMS Kenya API), in-app bell notifications |
| **Audit Logs** | `AuditLogs.tsx` | Full system audit trail, admin-only access |
| **Categories** | `Categories.tsx` | Manage document categories with color coding |
| **Settings** | `Settings.tsx` | User profile, avatar, password, SMS preferences |
| **Reports** | `Reports.tsx` | Document reports, export |
| **Document Expiry** | `DocumentExpiry.tsx` | Track and alert on expiring documents |
| **Storage Analytics** | `StorageAnalytics.tsx` | Storage usage breakdown |
| **Activity Heatmap** | `ActivityHeatmap.tsx` | Visual heatmap of system activity over time |
| **Database Export** | `DatabaseExport.tsx` | Admin-only full schema/data export (super admin: `amsterntechhub@gmail.com`) |
| **Deletion Requests** | `DeletionRequests.tsx` | Approval workflow for document deletions |
| **Search** | `Search.tsx` | Full-text search across all documents |

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **UI Framework** | React | 18.3.1 | Functional components, hooks only |
| **Language** | TypeScript | 5.8.3 | Strict mode enabled |
| **Build Tool** | Vite | 5.4.19 | Port 8080, SWC compiler |
| **Styling** | Tailwind CSS | 3.4.17 | Custom design tokens in `src/index.css` |
| **Component Library** | shadcn/ui (Radix UI) | Latest | Full set of primitives |
| **Routing** | React Router DOM | 6.30.1 | Client-side SPA routing |
| **Server State** | TanStack React Query | 5.83.0 | All data fetching |
| **Forms** | React Hook Form + Zod | 7.61.1 / 3.25.76 | Validation |
| **Charts** | Recharts | 2.15.4 | Dashboard analytics |
| **Icons** | Lucide React | 0.462.0 | |
| **Database** | PostgreSQL (via Supabase) | 14+ | RLS on all tables |
| **Auth** | Supabase Auth | 2.91.1 | JWT, email/password |
| **Storage** | Supabase Storage | — | Private buckets: `documents`, `task-files`, `db-exports`, `folders` |
| **Edge Functions** | Deno (Supabase) | — | 5 functions (seed-admin, send-sms, reset-user-password, export-database, watermark-download) |
| **SMS** | TextSMS Kenya API | — | `sms.textsms.co.ke` |
| **PWA** | Vite PWA Plugin | 1.2.0 | Service worker, manifest |
| **Export** | jsPDF + xlsx | 4.0.0 / 0.18.5 | PDF/CSV export |
| **Testing** | Vitest + Testing Library | 3.2.4 / 16.0.0 | Unit tests in `src/test/` |

---

## 3. Project Structure

```
ums-docs-vault/
├── src/
│   ├── App.tsx                    # Root: router, providers, 30+ routes
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles + CSS design tokens
│   ├── pages/                     # 28 page components (one per route)
│   ├── components/
│   │   ├── layout/                # AppLayout, AppSidebar, Header, MobileNav
│   │   ├── customers/             # Customer CRUD components
│   │   ├── documents/             # Document CRUD + preview + upload
│   │   ├── folders/               # Folder management dialogs
│   │   ├── tasks/                 # Task management components
│   │   ├── upload/                # Upload zone, camera capture, bulk import
│   │   ├── users/                 # User management dialogs
│   │   ├── dashboard/             # Stats/activity widgets
│   │   ├── settings/              # Settings form components
│   │   └── ui/                    # shadcn/ui primitives
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth state: user, role, profile, customerId
│   ├── hooks/                     # 18 custom hooks (useDocuments, useFolders, useTasks, etc.)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client singleton
│   │       └── types.ts           # Generated DB types
│   └── lib/
│       ├── utils.ts               # cn() utility
│       ├── export-utils.ts        # CSV/PDF export
│       └── watermark-utils.ts     # Document watermarking
├── supabase/
│   ├── config.toml                # project_id: ixdhpeuzpxqlcqctofsd
│   ├── migrations/                # 29 migration files (Jan 2026 – Jul 2026)
│   └── functions/                 # 5 Deno edge functions
│       ├── seed-admin/            # First-time admin creation (no JWT)
│       ├── send-sms/              # TextSMS Kenya SMS gateway
│       ├── reset-user-password/   # Admin password reset
│       ├── export-database/       # Full DB export
│       └── watermark-download/    # Watermarked document download
├── public/
│   ├── manifest.json              # PWA: "UMS Document Management"
│   └── pwa-*.png                  # Icons
├── .env                           # Contains Supabase credentials (committed)
├── package.json                   # Scripts: dev, build, test, lint
├── vite.config.ts                 # Port 8080, PWA plugin, @/ alias
├── tailwind.config.ts             # Tailwind config
├── DOCUMENTATION.md               # Comprehensive system documentation
└── MIGRATION.md                   # Self-hosting migration guide
```

---

## 4. Entry Points & Start Commands

| Command | Action |
|---|---|
| `npm run dev` | Dev server at `http://localhost:8080` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |

**Main entry**: `src/main.tsx` → renders `<App />` into `#root`

**App bootstrap** (`src/App.tsx`):
1. `QueryClientProvider` (TanStack Query)
2. `TooltipProvider`
3. `Toaster` + `Sonner` (toast notifications)
4. `BrowserRouter`
5. `AuthProvider` (Supabase auth state)
6. `InactivityWrapper` (session timeout + password expiry gate)
7. Route definitions

---

## 5. APIs & Integrations

### Supabase (Primary Backend)
- **Project ID**: `ixdhpeuzpxqlcqctofsd`
- **URL**: `https://ixdhpeuzpxqlcqctofsd.supabase.co`
- All data operations via `@supabase/supabase-js` client (not REST calls)
- Real-time subscriptions used in Chat (`useChat.ts`) and Notifications

### Edge Functions (REST endpoints on Supabase)
| Function | JWT Required | Purpose |
|---|---|---|
| `POST /functions/v1/seed-admin` | No | Bootstrap first admin user |
| `POST /functions/v1/send-sms` | Yes | Send SMS via TextSMS Kenya |
| `POST /functions/v1/reset-user-password` | No | Admin password reset |
| `POST /functions/v1/export-database` | Yes | Full DB schema/data export |
| `POST /functions/v1/watermark-download` | Yes | Download with watermark |

### External APIs
- **TextSMS Kenya** (`sms.textsms.co.ke`) — SMS notifications, requires `TEXTSMS_API_KEY`, `TEXTSMS_PARTNER_ID`, `TEXTSMS_SHORTCODE`

### Supabase Storage Buckets
| Bucket | Public | Purpose |
|---|---|---|
| `documents` | No | Customer documents (PDF, images) |
| `task-files` | No | Task attachments and submissions |
| `db-exports` | No | Database export files (super admin only) |
| `folders` | No | Folder document uploads |

---

## 6. Database Schema

### Core Tables (from migrations)

| Table | Key Columns | Purpose |
|---|---|---|
| `profiles` | user_id, full_name, email, phone, avatar_url, position, must_reset_password | Extended user data |
| `user_roles` | user_id, role (admin/staff/customer) | RBAC |
| `customers` | account_number, full_name, email, user_id | Customer records |
| `document_categories` | name, color, display_order, is_active | Document taxonomy |
| `documents` | customer_id, category_id, title, file_path, status, is_private, uploaded_by | Main document store |
| `document_versions` | document_id, version_number, file_path | Document version history |
| `document_comments` | document_id, user_id, content | Document discussion |
| `folders` | name, owner_id, parent_id | Nested private folders |
| `folder_documents` | folder_id, file_path, file_name | Files in folders |
| `folder_shares` | folder_id, shared_with_user_id, can_edit | Folder access grants |
| `tasks` | title, created_by, due_date, priority, status | Task management |
| `task_assignees` | task_id, user_id | Task assignments |
| `task_files` | task_id, file_path, upload_type | Task file attachments |
| `reminders` | user_id, title, reminder_date, recurrence, status | Personal reminders |
| `audit_logs` | user_id, action, entity_type, entity_id, details, ip_address | Compliance log |
| `deletion_requests` | document_id, requested_by, status, reviewed_by | Deletion approval workflow |
| `in_app_notifications` | user_id, title, message, type, link, is_read | Bell notifications |
| `sms_logs` | sent_by, recipient_phone, message, sms_type, status | SMS delivery log |
| `system_settings` | key, value (JSONB) | Global config (e.g., password_expiry_days = 90) |
| `chat_messages` | (inferred from `useChat.ts`) | In-app chat messages |

### Enums
```sql
app_role:        'admin' | 'staff' | 'customer'
document_status: 'pending' | 'approved' | 'archived'
task_priority:   'low' | 'normal' | 'high'
task_status:     'pending' | 'in_progress' | 'completed'
staff_position:  'super_admin' | 'hr' | 'hod' | 'staff'
```

### Key DB Functions
- `has_role(user_id, role)` — RLS helper
- `get_user_role(user_id)` — returns primary role
- `get_customer_id_for_user(user_id)` — customer linkage
- `has_folder_access(user_id, folder_id)` — recursive ancestor check
- `is_folder_owner(user_id, folder_id)` — recursive ancestor check
- `can_manage_tasks(user_id)` — admin or hr/hod/super_admin staff
- `auto_approve_document()` — BEFORE INSERT trigger (auto-approves docs)
- `notify_task_assignment()` — AFTER INSERT trigger on task_assignees
- `notify_document_upload()` — AFTER INSERT trigger on documents
- `create_due_reminder_notifications()` — called by pg_cron every 5 minutes
- `export_schema_ddl()` — admin-only full schema export function
- `is_super_admin(user_id)` — checks for `amsterntechhub@gmail.com`

### Scheduled Jobs
- `pg_cron` extension scheduled: `*/5 * * * *` → `create_due_reminder_notifications()`

---

## 7. Environment Variables

### Frontend (`.env` / Vite)
```bash
VITE_SUPABASE_URL="https://ixdhpeuzpxqlcqctofsd.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."      # anon key
VITE_SUPABASE_PROJECT_ID="ixdhpeuzpxqlcqctofsd"
```

### Edge Functions (Supabase secrets, server-side only)
```bash
SUPABASE_URL                    # auto-provided by Supabase runtime
SUPABASE_ANON_KEY               # auto-provided
SUPABASE_SERVICE_ROLE_KEY       # auto-provided
TEXTSMS_API_KEY                 # TextSMS Kenya API key
TEXTSMS_PARTNER_ID              # TextSMS partner ID
TEXTSMS_SHORTCODE               # SMS sender name/shortcode
```

### ⚠️ Security Note
The `.env` file is committed to the repository with the real Supabase anon key visible. This is acceptable for the anon key (it's client-public by design) but should be documented. The service role key is NOT in `.env`.

---

## 8. User Roles & Access Control

| Role | Access | Notes |
|---|---|---|
| **admin** | Everything except other admins' private folders | Can manage users, audit logs, categories, deletion requests, reports |
| **staff** | Documents (all customers), folders (own + shared), tasks (if hr/hod/super_admin position), upload | Cannot access user management, audit logs, system settings |
| **customer** | Own documents only (non-private), shared folders | Read-only; cannot upload documents |

A special hardcoded **super admin** (`amsterntechhub@gmail.com`) has access to the `db-exports` storage bucket regardless of role.

---

## 9. Known Patterns & Conventions

1. **Data fetching**: All via TanStack React Query hooks in `src/hooks/`. No direct Supabase calls in page components.
2. **Auth guard**: `<ProtectedRoute allowedRoles={[...]}>` wraps every protected route in `App.tsx`.
3. **Supabase client**: Single singleton at `src/integrations/supabase/client.ts`, imported as `import { supabase } from "@/integrations/supabase/client"`.
4. **Forms**: React Hook Form + Zod schema validation everywhere.
5. **Toast**: `sonner` for success/error toasts via `useToast` hook.
6. **Styling**: Tailwind utility classes + shadcn/ui components. Custom CSS tokens in `src/index.css`.
7. **Path alias**: `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
8. **Migrations**: Supabase migration filenames use timestamps + UUID slugs, not sequential numbers.
9. **PWA**: Service worker registered automatically via `vite-plugin-pwa`.
10. **Mobile**: `use-mobile.tsx` hook for viewport detection; `MobileNav` bottom tab bar on small screens.

---

## 10. Comparison with uptime-hub

| Aspect | ums-docs-vault | uptime-hub |
|---|---|---|
| **Primary function** | Document management, customer portal, task management | Uptime/service monitoring (inferred from name + drizzle ORM) |
| **Stack** | React + Vite + Supabase (JS client) | React + Vite + Supabase + **Drizzle ORM** |
| **Database** | Supabase project `ixdhpeuzpxqlcqctofsd` | Separate Supabase project |
| **Auth** | Supabase Auth (same `app_role` enum pattern) | Supabase Auth |
| **PWA** | Yes | Unknown |
| **Edge functions** | 5 (SMS, export, etc.) | Unknown |
| **Schema management** | Direct SQL migrations | Drizzle ORM + `drizzle.config.ts` |
| **Feature count** | Very large (28 pages) | Smaller (inferred) |

---

## 11. Merge Considerations & Recommendations

### Architecture Decision for Merge

Since both systems share the same frontend stack (React/Vite/Supabase/shadcn/Tailwind), the cleanest merge strategy is:

**Option A — Single Supabase Project (Recommended)**  
Merge all tables into one Supabase project. The ums-docs-vault schema is larger and more mature; use it as the base. Add uptime-hub tables via new migrations. Share one auth system, one `profiles` table, one `user_roles` table. This is the cleanest long-term architecture.

**Option B — Dual Supabase Projects, Single Frontend**  
Keep two Supabase clients in the merged app (two `.env` pairs). Simpler to execute but operationally messy — users would need accounts in both systems.

Recommendation: **Option A**.

### Key Integration Challenges

1. **Separate databases**: uptime-hub uses Drizzle ORM while ums-docs-vault uses raw SQL migrations. The merged system should pick one approach — SQL migrations are simpler given the existing Supabase-native pattern.

2. **Auth/role overlap**: Both systems likely have their own `profiles`/`user_roles` tables. Merging requires reconciling these schemas. ums-docs-vault's RBAC is the more comprehensive one (admin/staff/customer + staff positions).

3. **Navigation merge**: ums-docs-vault has 28 routes. The merged sidebar/nav must accommodate uptime-hub's sections without becoming unwieldy. Consider role-gating the new sections.

4. **`staff_position` enum**: uptime-hub monitoring features would naturally belong to admin/staff only — the existing `staff_position` enum (super_admin, hr, hod, staff) may need extension.

5. **Conflicting port**: Both use Vite at port 8080 in dev — trivially resolved in the combined repo.

6. **Edge functions**: ums-docs-vault has 5 edge functions. uptime-hub may have its own. Combined project needs all deployed to the single Supabase project.

7. **PWA manifest**: Both are named differently. The merged app needs a new app name and icons.

8. **`.env` structure**: The merged app will need env vars for both systems' Supabase projects during transition, then only one after full database merge.

### Files/Areas that Will Need Changes

- `src/App.tsx` — add uptime-hub routes
- `src/components/layout/AppSidebar.tsx` — add uptime-hub navigation items
- `src/integrations/supabase/types.ts` — extend with merged schema types
- `vite.config.ts` — update PWA manifest name
- `supabase/migrations/` — add uptime-hub schema migrations
- `supabase/config.toml` — add any new edge functions
- `.env` — add any uptime-hub-specific env vars
- `package.json` — merge any uptime-hub-unique dependencies (notably `drizzle-orm` if used)

---

## Conclusions

UMS Document Vault is a **feature-complete, production-grade document management system** with 28 pages, 18+ custom hooks, 29 database migrations, 5 edge functions, and a rich RBAC model. It is significantly larger than a typical Lovable scaffold — it has been extensively developed.

The merge with uptime-hub is feasible because the stacks are nearly identical. The primary work is:
1. Deciding which Supabase project to use as the canonical one (ums-docs-vault's is the larger/richer schema)
2. Migrating uptime-hub's database schema into the merged Supabase project  
3. Adding uptime-hub's frontend routes and nav items into ums-docs-vault's app shell
4. Reconciling the auth and role systems

The ums-docs-vault codebase should serve as the **base** for the combined system, with uptime-hub features integrated into it, because its layout, auth, and RBAC infrastructure are more complete.
