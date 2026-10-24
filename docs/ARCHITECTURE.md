# Architecture

## Overview

UMS Hub is a single-page application (SPA) built with React 18 and served from a static `dist/` directory. There is no custom server — all backend logic runs on Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime). The frontend communicates exclusively through the `@supabase/supabase-js` client; no raw REST calls are made.

```
Browser
  └── React SPA (Vite)
        ├── supabase-js client  ──→  Supabase Cloud
        │                              ├── PostgreSQL (RLS)
        │                              ├── Auth (JWT + MFA)
        │                              ├── Storage (4 private buckets)
        │                              ├── Edge Functions (Deno)
        │                              └── Realtime (chat, notifications)
        └── TextSMS Kenya  ──→  sms.textsms.co.ke
```

---

## Component Tree

```
App
 └── ChunkErrorBoundary
      └── QueryClientProvider (TanStack Query v5)
           └── TooltipProvider
                └── BrowserRouter
                     └── AuthProvider (AuthContext)
                          └── AppRoutes
                               └── InactivityWrapper
                                    ├── useInactivityTimeout()
                                    ├── useNotifications()
                                    └── OnboardingTourProvider
                                         └── PasswordExpiryGate
                                              └── MaintenanceGate
                                                   └── Routes
                                                        ├── /auth  → Auth
                                                        ├── /      → AppLauncher (ProtectedRoute)
                                                        ├── /apps  → AppStore (ProtectedRoute)
                                                        ├── /docs/* → DocShell → (pages with own AppLayout)
                                                        ├── /ops/*  → OpsShell (AppLayout) → Outlet
                                                        ├── /admin/users  → UserHub
                                                        ├── /admin/reports → ReportsHub
                                                        └── /admin/roles  → RoleManager (super admin)
```

Each Document Vault page renders its own `<AppLayout>` wrapper. Operations Hub pages are wrapped by the shared `OpsShell` which renders `<AppLayout>` once and uses `<Outlet>` for child routes.

---

## Route Structure

### Platform
| Path | Component | Access |
|---|---|---|
| `/` | AppLauncher | all authenticated |
| `/apps` | AppStore | all authenticated |
| `/auth` | Auth | public |
| `/setup` | SetupAdmin | public |
| `/admin/users` | UserHub | admin |
| `/admin/reports` | ReportsHub | admin |
| `/admin/roles` | RoleManager | super admin only |

### Document Vault (`/docs/*`)
| Path | Component | Access |
|---|---|---|
| `/docs` | Dashboard | admin, staff |
| `/docs/upload` | Upload | admin, staff |
| `/docs/documents` | Documents | admin, staff |
| `/docs/document-expiry` | DocumentExpiry | admin, staff |
| `/docs/search` | SearchPage | admin, staff |
| `/docs/customers` | Customers | admin, staff |
| `/docs/notifications` | Notifications | admin, staff |
| `/docs/folders` | Folders | all |
| `/docs/reminders` | Reminders | all |
| `/docs/tasks` | Tasks | all |
| `/docs/chat` | Chat | all |
| `/docs/in-app-notifications` | InAppNotifications | all |
| `/docs/settings` | Settings | all |
| `/docs/gamification` | GamificationDashboard | all |
| `/docs/sessions` | Sessions | all |
| `/docs/my-documents` | MyDocuments | customer only |
| `/docs/users` | Users | admin |
| `/docs/users/:userId/activity` | UserActivityLog | admin |
| `/docs/audit-logs` | AuditLogs | admin |
| `/docs/categories` | Categories | admin |
| `/docs/deletion-requests` | DeletionRequests | admin |
| `/docs/activity` | ActivityFeed | admin |
| `/docs/reports` | Reports | admin |
| `/docs/storage-analytics` | StorageAnalytics | admin |
| `/docs/activity-heatmap` | ActivityHeatmap | admin |
| `/docs/database-export` | DatabaseExport | admin |
| `/docs/tour-manager` | TourManager | super admin |
| `/docs/webhooks` | Webhooks | admin |
| `/docs/api-keys` | ApiKeys | admin |
| `/docs/customer-activity` | CustomerActivity | admin |
| `/docs/export-scheduler` | ExportScheduler | admin |
| `/docs/templates` | DocumentTemplates | admin |

### Operations Hub (`/ops/*`)
| Path | Component | Access |
|---|---|---|
| `/ops` | OpDashboard | admin, staff |
| `/ops/vendor-issues` | OpVendorIssues | admin, staff |
| `/ops/vendor-uptime` | OpVendorUptime | admin, staff |
| `/ops/incidents` | OpIncidents | admin, staff |
| `/ops/passwords` | OpPasswords | admin, staff |
| `/ops/documents` | OpDocuments | admin, staff |
| `/ops/analytics` | OpAnalytics | admin, staff |
| `/ops/escalations` | OpEscalations | admin, staff |
| `/ops/force-password-change` | OpForcePasswordChange | admin, staff |
| `/ops/scorecard` | OpVendorScorecard | admin, staff |
| `/ops/oncall` | OpOnCall | admin, staff |
| `/ops/sms-logs` | OpSmsLogs | admin |
| `/ops/users` | OpUserManagement | admin |

---

## Sidebar and App Switcher

`AppSidebar` reads `location.pathname` to determine the current app context (`currentApp = 'docs' | 'ops' | 'home'`). The sidebar renders only the nav group that matches the active context:

- `currentApp === 'docs' || 'home'` → Document Vault nav + Administration nav
- `currentApp === 'ops'` → Operations Hub nav
- Global items (User Hub, Role Manager, Reports Hub, Home, App Store) always visible

The **app switcher** (rendered when not collapsed and user is admin or staff) lets users jump between Docs and Ops. It uses `localStorage` keys `umshub_last_docs_page` and `umshub_last_ops_page` to resume the last visited page in each app instead of always landing on the app root. These values are written via a `useEffect` that tracks `location.pathname`.

Sidebar collapse state is persisted in `localStorage` via three keys:
- `umshub_sidebar_docs_open`
- `umshub_sidebar_ops_open`
- `umshub_sidebar_admin_open`

Sidebar scroll position is persisted in `sessionStorage` as `umshub_sidebar_scroll`.

---

## App Launcher

The App Launcher (`/`) is the home screen shown after login. It supports three view modes selected from a toolbar:

- **Classic** — card grid with app icons, descriptions, and entry buttons
- **Modern** — large illustrated cards with gradient backgrounds
- **Compact** — dense list/table layout

A `WelcomeScreen` animation plays on first visit (framer-motion entrance sequence). The selected view mode is persisted in `localStorage`.

---

## Data Fetching Pattern

All data is fetched via TanStack Query v5 hooks in `src/hooks/`. The Supabase client is a singleton at `src/integrations/supabase/client.ts`. No fetch/axios calls are made directly from components.

```ts
// Example pattern from useDocuments.ts
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, document_categories(*), customers(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

Mutations use `useMutation` + `queryClient.invalidateQueries` to keep the cache consistent.

---

## Edge Functions

Deno-based Edge Functions live in `supabase/functions/`. They are invoked via `supabase.functions.invoke()` from the client or via cron jobs set up in Supabase. All functions verify the caller's JWT before acting. Functions that need elevated privileges use a `SUPABASE_SERVICE_ROLE_KEY` admin client internally.

---

## Realtime

Team Chat (`/docs/chat`) and in-app notification counts use Supabase Realtime channels subscribed to the `chat_messages` and `in_app_notifications` tables respectively.
