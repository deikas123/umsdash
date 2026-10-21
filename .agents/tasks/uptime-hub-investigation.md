# Uptime Hub — Investigation Report

**Repository:** https://github.com/deikas123/uptime-hub.git  
**Cloned to:** `.agents/temp/uptime-hub`  
**Purpose of this report:** Provide a thorough understanding of this system as input for planning a merge with `ums-docs-vault`.

---

## Summary

**Uptime Hub** is a full-featured operational dashboard for a telecoms/IT operations team called "UMS Prepaid". It is a React SPA backed by Supabase (PostgreSQL + Edge Functions) that covers six operational domains: vendor issue tracking, vendor SLA/uptime monitoring, incident management (with 5-Why RCA), system password expiry tracking with SMS reminders, document storage, escalation workflows, and user/role management. The app sends SMS alerts via the TextSMS.co.ke API and has in-app notifications. It is a mature, well-structured system ready for production.

The target workspace (`umsdash`) is **empty** — only the `.agents` scaffolding directory exists. The merge will start from scratch in that workspace.

---

## 1. Purpose and Features

| Feature | Description |
|---|---|
| **Dashboard** | KPI overview cards (open incidents, expiring passwords, avg uptime); area/pie/bar charts for incident trend, status breakdown, severity, department, vendor uptime, password expiry. |
| **Vendor Issues** | CRUD for tracking vendor-reported issues. Each issue has vendor, system, impact, status, RCA status, downtime, and uptime fields. |
| **Vendor Uptime** | SLA monitoring — logs downtime hours per vendor/system, auto-calculates uptime %, compares against configurable SLA target (default 99.5%), shows bar + line charts, SLA breach alerts. |
| **Incidents** | Full incident management with incident number, type, severity (Level 1–4), department, 5-Why RCA, CAPA tracking, financial/safety/operational impact, file attachments. |
| **Passwords** | System password expiry tracker. Tabbed view: Expired / Due This Week / Due This Month / Healthy. SMS reminders, renewal history, owner/backup assignment. |
| **Documents** | File storage using Supabase Storage. Upload/list/download documents with metadata. |
| **Analytics** | Aggregated charts: monthly incident trends, vendor performance, uptime history, password expiry distribution, incident resolution rate. Export to CSV/PDF/Excel. |
| **SMS Logs** | Read-only log of all outbound SMS messages. Role-gated: phone numbers and message content are masked for non-admin users. |
| **Escalations** | Multi-level escalation workflow (3 levels: Assigned Person → Managers → Admins). Actions: acknowledge, escalate, resolve, reopen, comment. Auto-escalation via cron. Event history timeline per escalation. |
| **User Management** | Admin: create users, change roles, reset passwords, update emails, set phone numbers. All users: change own password. |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build tool** | Vite 5 + `@vitejs/plugin-react-swc` |
| **Routing** | React Router DOM v6 |
| **Server state** | TanStack Query v5 |
| **Database/Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| **Edge Functions** | Deno (TypeScript), hosted on Supabase |
| **UI components** | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Date handling** | date-fns |
| **Export** | jspdf + jspdf-autotable (PDF), xlsx (Excel), native CSV |
| **SMS** | TextSMS.co.ke API |
| **Styling** | Tailwind CSS v3 + `tailwindcss-animate`, custom CSS vars (CSS custom properties for theme tokens) |
| **Testing** | Vitest + Testing Library (unit), Playwright (e2e — minimal) |
| **Linting** | ESLint 9 + TypeScript ESLint |
| **DB migrations** | Drizzle Kit (schema in `drizzle/schema.ts`; migrations in `drizzle/migrations/`) |

---

## 3. Project Structure

```
uptime-hub/
├── src/
│   ├── main.tsx                    # App entry point (React DOM render)
│   ├── App.tsx                     # Root: QueryClientProvider, AuthProvider, Router, all Routes
│   ├── index.css / App.css         # Global styles, CSS custom properties (theme tokens)
│   ├── pages/                      # One file per page/route
│   │   ├── Dashboard.tsx           # /
│   │   ├── VendorIssues.tsx        # /vendor-issues
│   │   ├── VendorUptime.tsx        # /vendor-uptime
│   │   ├── Incidents.tsx           # /incidents
│   │   ├── Passwords.tsx           # /passwords
│   │   ├── Documents.tsx           # /documents
│   │   ├── Analytics.tsx           # /analytics
│   │   ├── SmsLogs.tsx             # /sms-logs
│   │   ├── Escalations.tsx         # /escalations
│   │   ├── UserManagement.tsx      # /users
│   │   ├── Auth.tsx                # /auth
│   │   ├── Index.tsx               # redirect
│   │   └── NotFound.tsx            # *
│   ├── components/
│   │   ├── AppLayout.tsx           # Shell: sidebar + <Outlet />
│   │   ├── AppSidebar.tsx          # Fixed left nav with 10 items
│   │   ├── ProtectedRoute.tsx      # Redirects unauthenticated to /auth
│   │   ├── ExportMenu.tsx          # CSV/PDF/Excel dropdown
│   │   ├── PageHeader.tsx          # Shared heading + actions slot
│   │   ├── StatsCard.tsx           # KPI card
│   │   ├── NotificationBell.tsx    # In-app notifications
│   │   ├── VendorPicker.tsx        # Combobox with freetype + existing vendors
│   │   ├── ThemeToggle.tsx         # Light/dark mode
│   │   ├── NavLink.tsx             # Styled NavLink
│   │   ├── ChunkErrorBoundary.tsx  # Error boundary for lazy chunks
│   │   └── ui/                     # shadcn/ui component library (~35 files)
│   ├── contexts/
│   │   └── AuthContext.tsx         # Supabase auth state, signOut
│   ├── hooks/
│   │   ├── useUserRole.ts          # Returns { role, isAdmin, isManager }
│   │   └── use-mobile.tsx          # Responsive breakpoint hook
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # createClient — configured from VITE_* env vars
│   │       ├── types.ts            # Generated DB types (Tables, Enums, Functions)
│   │       └── previewAuthStorage.ts
│   └── lib/
│       ├── exportUtils.ts          # exportToCSV / exportToPDF / exportToExcel helpers
│       ├── mask.ts                 # maskPhone / maskMessage for non-admin display
│       └── utils.ts                # cn() Tailwind merge
├── supabase/
│   ├── config.toml
│   ├── migrations/                 # 6 SQL migration files + cron
│   └── functions/
│       ├── send-sms/               # Manual SMS dispatch (invoked from client)
│       ├── notify-sms/             # Bulk notify admins/managers on incidents
│       ├── password-reminders/     # Cron-triggered expiry SMS
│       ├── escalations/            # Full escalation state machine + auto-tick
│       ├── admin-create-user/      # Admin: create Supabase auth user + role
│       ├── admin-reset-password/   # Admin: set any user's password
│       ├── admin-update-email/     # Admin: update any user's email
│       └── complete-password-change/ # Force-change flow
├── drizzle/                        # Schema + Drizzle migrations (DB management tooling)
├── public/                         # Static assets
├── index.html                      # Vite HTML entry, mounts #root
├── vite.config.ts                  # Dev port 8080, @ alias to ./src
├── tailwind.config.ts
├── tsconfig.*.json
├── vitest.config.ts
└── .env                            # VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL
```

---

## 4. Entry Points & Start Commands

| Command | Effect |
|---|---|
| `npm run dev` (or `bun run dev`) | Starts Vite dev server on port **8080** |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Vitest unit tests (single run) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

**Main entry:** `index.html` → `src/main.tsx` → `src/App.tsx`

---

## 5. APIs and Integrations

### Supabase (primary backend)
- **Auth:** Email/password via `@supabase/supabase-js`. Auth state in `AuthContext`. Protected routes redirect to `/auth`.
- **Database:** PostgreSQL via Supabase PostgREST. All data access is direct `supabase.from(table)` calls in TanStack Query hooks — no separate API layer.
- **Storage:** Used for document uploads (`Documents.tsx`).
- **Edge Functions (Deno):** 8 functions listed above, invoked via `supabase.functions.invoke(...)`.
- **Realtime:** Notifications query uses standard polling (TanStack Query), not Supabase Realtime subscriptions.
- **Row Level Security:** Applied via Supabase policies (referenced in migrations). `has_role()` DB function for authorization checks.

### TextSMS.co.ke (SMS gateway)
- Endpoint: `POST https://sms.textsms.co.ke/api/services/sendsms/`
- Shortcode: `"UMS PREPAID"`
- Auth: `apikey` + `partnerID` passed in JSON body
- Phone format: normalized to `254XXXXXXXXX` (Kenyan numbers)
- Required env vars in Supabase project secrets: `TEXTSMS_API_KEY`, `TEXTSMS_PARTNER_ID`

---

## 6. Database Schema (12 tables)

| Table | Purpose |
|---|---|
| `documents` | File metadata (name, path, size, type, uploader) |
| `escalation_events` | Event log per escalation (created/escalated/acknowledged/resolved/comment) |
| `escalation_levels` | Config: level number, name, hours_to_next, target_role |
| `escalations` | Active escalation records (source_table + source_id polymorphic FK) |
| `incidents` | Full incident records with RCA, CAPA, financial/safety impact |
| `notifications` | In-app notification inbox per user |
| `password_renewals` | Audit log for each password renewal event |
| `passwords` | System password expiry entries with owner/backup/rotation |
| `profiles` | Extended user info (full_name, department, phone_number, title) |
| `sms_logs` | All outbound SMS with status, response body, related entity |
| `user_roles` | Maps user_id → app_role (admin/manager/user) |
| `vendor_issues` | Vendor issue + uptime records (dual-purpose table) |

**Enum:** `app_role` = `admin | manager | user`  
**DB Function:** `has_role(_role, _user_id) → boolean`

---

## 7. Environment Variables

### Frontend (`.env` — prefixed `VITE_`)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Project ID (used in Supabase CLI) |

### Supabase Edge Functions (project secrets)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected; used for admin operations |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | User-context client |
| `TEXTSMS_API_KEY` | TextSMS.co.ke API key |
| `TEXTSMS_PARTNER_ID` | TextSMS.co.ke partner ID |

---

## 8. Observations & Notes for Merge Planning

### Strengths
- Clean, consistent code patterns: all data fetching uses TanStack Query with named query keys; all mutations use `useMutation` with `invalidateQueries` on success.
- Shadcn/ui component library is fully set up with ~35 components — any merged system should reuse these rather than introduce new UI libraries.
- Role-based access control is well implemented: `useUserRole()` hook, `has_role()` DB function, masked data for non-admin roles.
- Export functionality (CSV/PDF/Excel) is extracted into `lib/exportUtils.ts` — reusable across all pages.
- `AppLayout` + `AppSidebar` pattern makes adding new nav items and routes trivial.

### Key Decisions for Merge
1. **Single Supabase project or two?** Currently each system has its own Supabase project/URL. For a merged app, the simplest path is a single Supabase project with all tables; alternatively, both Supabase clients can coexist with different env var prefixes.
2. **Shared auth:** Both systems will need to share the same user/session context. `AuthContext` is clean and can serve both.
3. **Navigation:** The sidebar has 10 nav items. Merging with `ums-docs-vault` will add more items or a new nav section. Consider grouping (e.g., "Operations" vs "Documentation").
4. **No routing conflicts** are expected — the `App.tsx` routes are all unique paths.
5. **`vendor_issues` table is dual-purpose** — it holds both issue records and uptime records. This is a design smell but works; do not split it during the merge.
6. **Drizzle vs. Supabase migrations:** The project has both a `drizzle/` folder and `supabase/migrations/`. Drizzle is used as a schema management tool; the actual runtime uses Supabase's PostgREST. For the merged project, maintain both if ums-docs-vault uses a compatible pattern, or consolidate to just Supabase migrations.
7. **SMS shortcode is hardcoded** as `"UMS PREPAID"` in Edge Functions — acceptable for the merged app.
8. **Workspace is empty:** The merge will build from one of the two repos as the base (uptime-hub is the larger, more feature-rich system — recommended as the base).

---

## 9. Dependency Versions (Key)

```
react: ^18.3.1
react-router-dom: ^6.30.1
@tanstack/react-query: ^5.83.0
@supabase/supabase-js: ^2.99.2
tailwindcss: ^3.4.17
vite: ^5.4.19
typescript: ^5.8.3
recharts: ^2.15.4
framer-motion: ^12.38.0
react-hook-form: ^7.61.1
zod: ^3.25.76
date-fns: ^3.6.0
jspdf: ^4.2.1
xlsx: ^0.18.5
lucide-react: ^0.462.0
```

---

*Report generated by automated investigation. Source: https://github.com/deikas123/uptime-hub.git*
