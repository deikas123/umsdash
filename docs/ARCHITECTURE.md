# UMS Hub — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / PWA                           │
│                                                                 │
│  React 18 SPA (Vite 5 build, TypeScript, Tailwind CSS)         │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐│
│  │  App Launcher /  │  │  AppLayout Shell                     ││
│  │  (route /)       │  │  ┌────────────┐  ┌────────────────┐  ││
│  │                  │  │  │ AppSidebar │  │  Page Content  │  ││
│  │  • Classic view  │  │  │            │  │  (Outlet)      │  ││
│  │  • Modern view   │  │  │ App Switch │  │                │  ││
│  │  • Compact view  │  │  │ Docs / Ops │  │                │  ││
│  └──────────────────┘  │  └────────────┘  └────────────────┘  ││
│                        └──────────────────────────────────────┘│
│                                                                 │
│  TanStack Query (server-state cache)  |  React Router v6       │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS (REST + Realtime WS)
┌───────────────────────▼─────────────────────────────────────────┐
│                     SUPABASE CLOUD                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Supabase Auth│  │ PostgreSQL 14│  │ Supabase Storage      │ │
│  │ (GoTrue)     │  │ + RLS        │  │ Buckets:              │ │
│  │ • email/pass │  │ + triggers   │  │  - documents          │ │
│  │ • TOTP MFA   │  │ + functions  │  │  - task-files         │ │
│  │ • session mgmt│ │ + views      │  │  - avatars            │ │
│  └──────────────┘  └──────────────┘  │  - db-exports         │ │
│                                      └───────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Edge Functions (Deno runtime)                             │  │
│  │  admin-create-user │ admin-reset-password │ escalations   │  │
│  │  send-sms │ ops-send-sms │ notify-sms │ password-reminders│  │
│  │  export-database │ run-scheduled-export │ watermark-download│ │
│  │  ocr-extract │ trigger-webhook │ send-push │ seed-admin   │  │
│  │  complete-password-change │ reset-user-password           │  │
│  │  admin-update-email                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │  TextSMS Kenya API             │
                              │  sms.textsms.co.ke             │
                              └────────────────────────────────┘
```

## Frontend Architecture

### Entry Point

`src/main.tsx` → `src/App.tsx`

`App.tsx` wraps the entire application in:
1. `QueryClientProvider` — TanStack Query global cache
2. `TooltipProvider` — Radix tooltip context
3. `BrowserRouter` — React Router DOM
4. `AuthProvider` — custom auth context (`src/contexts/AuthContext.tsx`)
5. `InactivityWrapper` — hooks `useInactivityTimeout`, `useNotifications`, wraps `OnboardingTourProvider` and `PasswordExpiryGate`
6. `MaintenanceGate` — redirects to maintenance page if enabled in system_settings

### Routing Structure

All routes are defined in `src/App.tsx` using React Router v6 nested routes.

```
/                      → AppLauncher (all authenticated users)
/auth                  → Auth page (public, redirects if logged in)
/setup                 → SetupAdmin (public, first-run only)
/apps                  → AppStore

/docs                  → DocShell (ProtectedRoute, staff+admin)
  /docs/               → Dashboard
  /docs/upload         → Upload
  /docs/documents      → Documents
  /docs/document-expiry → DocumentExpiry
  /docs/search         → Search
  /docs/customers      → Customers
  /docs/folders        → Folders (all auth)
  /docs/tasks          → Tasks (all auth)
  /docs/reminders      → Reminders (all auth)
  /docs/chat           → Chat (all auth)
  /docs/gamification   → GamificationDashboard (all auth)
  /docs/sessions       → Sessions (all auth)
  /docs/settings       → Settings (all auth)
  /docs/in-app-notifications → InAppNotifications (all auth)
  /docs/my-documents   → MyDocuments (customer only)
  /docs/notifications  → Notifications (admin/staff)
  /docs/users          → Users (admin only)
  /docs/users/:userId/activity → UserActivityLog (admin)
  /docs/audit-logs     → AuditLogs (admin)
  /docs/categories     → Categories (admin)
  /docs/deletion-requests → DeletionRequests (admin)
  /docs/activity       → ActivityFeed (admin)
  /docs/reports        → Reports (admin)
  /docs/storage-analytics → StorageAnalytics (admin)
  /docs/activity-heatmap → ActivityHeatmap (admin)
  /docs/database-export → DatabaseExport (admin)
  /docs/tour-manager   → TourManager (super admin only)
  /docs/webhooks       → Webhooks (admin)
  /docs/api-keys       → ApiKeys (admin)
  /docs/customer-activity → CustomerActivity (admin)
  /docs/export-scheduler → ExportScheduler (admin)
  /docs/templates      → DocumentTemplates (admin)

/ops                   → OpsShell (ProtectedRoute, admin+staff)
  /ops/                → OpDashboard
  /ops/vendor-issues   → OpVendorIssues
  /ops/vendor-uptime   → OpVendorUptime
  /ops/incidents       → OpIncidents
  /ops/passwords       → OpPasswords
  /ops/documents       → OpDocuments
  /ops/analytics       → OpAnalytics
  /ops/escalations     → OpEscalations
  /ops/scorecard       → OpVendorScorecard
  /ops/oncall          → OpOnCall
  /ops/sms-logs        → OpSmsLogs (admin only)
  /ops/users           → OpUserManagement (admin only)
  /ops/force-password-change → OpForcePasswordChange
```

### Component Hierarchy

```
App
└── QueryClientProvider + TooltipProvider + BrowserRouter + AuthProvider
    └── InactivityWrapper
        └── OnboardingTourProvider (renders TourController overlay)
            └── PasswordExpiryGate
                └── MaintenanceGate
                    └── Routes
                        ├── AppLauncher (own full-page layout, no AppLayout)
                        ├── Auth
                        ├── DocShell (Outlet only)
                        │   └── AppLayout (each page renders its own)
                        │       ├── AppSidebar
                        │       ├── header (NotificationBell, CommandPalette, ThemeToggle…)
                        │       ├── AppBreadcrumb
                        │       ├── PasswordExpiryBanner
                        │       └── AnimatePresence > motion.main > [page content]
                        └── OpsShell (AppLayout wraps all /ops/* pages)
                            └── AppLayout
                                └── [ops page content]
```

**Note on layouts:** Document Vault pages render `AppLayout` themselves (imported in each page component). Operations Hub pages do not include `AppLayout`; instead `OpsShell` in `App.tsx` wraps the outlet with `AppLayout` once.

### AppLayout Components

`src/components/layout/AppLayout.tsx` — outer shell with sidebar + header  
`src/components/layout/AppSidebar.tsx` — collapsible sidebar with app switcher  
`src/components/layout/Breadcrumb.tsx` — automatic breadcrumb from pathname  
`src/components/layout/MobileNav.tsx` — bottom navigation bar for mobile  

Key header components:
- `NotificationBell` — in-app notification count + dropdown
- `CommandPalette` — keyboard-driven search (⌘K / Ctrl+K)
- `KeyboardShortcutsDialog` — lists all keyboard shortcuts
- `ThemeToggle` — light/dark/system theme
- `DensityToggle` — compact/comfortable UI density
- `WhatsNew` — changelog popover
- `QuickActions` — floating action button (FAB) for common actions

## Backend Architecture (Supabase)

### PostgreSQL

All application data lives in the `public` schema of a managed PostgreSQL 14 instance. Row Level Security (RLS) is enabled on every table and enforced at the database layer — no client-side permission checks are trusted for data access.

### Auth (GoTrue)

Supabase Auth handles user creation, email/password sign-in, JWT issuance, session refresh, and TOTP multi-factor authentication. Supabase sessions use short-lived JWTs (default 1 hour) with automatic refresh.

### Storage

Four buckets:
- `documents` — customer documents uploaded via Document Vault
- `task-files` — attachments on tasks
- `avatars` — user profile photos
- `db-exports` — database export ZIPs (super admin only)

### Edge Functions (Deno)

Serverless TypeScript functions running on the Deno runtime. Deployed via `supabase functions deploy`. See [API.md](./API.md) for full details.

### Realtime

Supabase Realtime is used for live subscriptions to `user_xp` (gamification updates) and `chat_messages` (team chat). Channel names are randomised per hook instance to avoid StrictMode double-mount conflicts.

## How the Two Apps Share Infrastructure

| Shared Resource | How It's Used |
|---|---|
| Auth / JWT | One Supabase project; same `user_id` across both apps |
| `profiles` table | Single profile row per user, shared by both apps |
| `user_roles` table | One role row per user, read by both apps |
| `user_app_access` table | Per-app access grants; admin controls which users enter which app |
| `AppLayout` / `AppSidebar` | Single shell component, switches nav items based on active app |
| `audit_logs` table | Both apps log actions to the same table |
| `in_app_notifications` | Both apps write to and read from the same table |
| `sms_logs` | All SMS sending (Docs + Ops) logged to same table |

## App Launcher / Unified Dashboard Design

The App Launcher (`src/pages/AppLauncher.tsx`) renders at `/` for every authenticated user.

**Three view modes** (persisted to `localStorage` under key `umshub_launcher_view`):

| Mode | Description |
|---|---|
| `classic` | Grid of app cards with hero stats banner |
| `modern` | Featured app (most recently launched) displayed large on the left; other apps stacked on the right |
| `compact` | Single-column list with inline stats and Open buttons |

The featured app in Modern view is determined by `umshub_last_docs_page_ts` / `umshub_last_ops_page_ts` timestamps written to `localStorage` on each app launch.

**Live stats**: the launcher queries `documents` count, `customers` count, open `incidents` count, and the user's `upload_streaks.current_streak` on mount.

**Recent activity**: fetches the last 10 `in_app_notifications` for the user and shows them below the app cards.

**Continue from last page**: each app card shows a "Continue: [page label] →" link that navigates to the last visited page within that app (tracked by `AppSidebar` in `localStorage`).

## Per-App Sidebar Switching Mechanism

`AppSidebar.tsx` determines the current app from `location.pathname`:
- starts with `/ops` → `currentApp = 'ops'`
- starts with `/docs` → `currentApp = 'docs'`
- otherwise → `currentApp = 'home'` (shows Docs nav)

An app switcher pill rendered at the top of the sidebar (when not collapsed and user is admin/staff) lets users click **Docs** or **Ops** to switch apps. On click, `switchToApp()` reads `localStorage.getItem('umshub_last_docs_page')` or `umshub_last_ops_page` and navigates there, falling back to the app root.

The sidebar also restores its scroll position from `sessionStorage` (`umshub_sidebar_scroll`) on each navigation, preventing the sidebar from jumping to the top when a link is clicked.

Sidebar section visibility:
- **Document Vault** group: shown when `currentApp === 'docs'` or `'home'`
- **Operations Hub** group: shown when `currentApp === 'ops'` (admin/staff only)
- **Administration** group: shown when `currentApp === 'docs'` or `'home'` (admin only)

Collapsible sections persist their open/closed state in `localStorage`:
- `umshub_sidebar_docs_open`
- `umshub_sidebar_ops_open`
- `umshub_sidebar_admin_open`

## Single-App vs Monorepo

UMS Hub is a **single Vite application** (not a monorepo). Both Document Vault and Operations Hub live in the same `src/` tree:
- `src/pages/` — Document Vault pages
- `src/pages/operations/` — Operations Hub pages
- `src/hooks/` — shared hooks
- `src/hooks/operations/` — Ops-specific hooks
- `src/components/` — shared and feature-specific components
- `src/components/operations/` — Ops-specific components

There is no package-level separation. This keeps the build simple and allows free sharing of auth context, UI components, and utility functions.
