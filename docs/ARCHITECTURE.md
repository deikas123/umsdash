# UMS Hub — Architecture

## High-Level Overview

UMS Hub is a single-page application (SPA) built with React 18 and TypeScript, bundled by Vite, and backed entirely by Supabase. Two full applications — **Document Vault** and **Operations Hub** — share one React shell, one Supabase project (auth, PostgreSQL database, storage, edge functions, realtime), and one set of user accounts. Users authenticate once and switch between apps via a top-bar app switcher without re-authenticating.

```
Browser (SPA)
  └── React 18 + TypeScript + Vite
        ├── Document Vault  (/docs/*)
        ├── Operations Hub  (/ops/*)
        ├── App Launcher    (/)
        └── Admin routes    (/admin/*)

Supabase
  ├── Auth (JWT, session management, MFA)
  ├── PostgreSQL 14 (all app data + RLS)
  ├── Storage (documents, avatars, task files, op-documents)
  ├── Edge Functions (Deno runtime — 17 functions)
  └── Realtime (chat, notifications)
```

---

## Routing Table

| Route Group | Description |
|---|---|
| `/auth` | Login / signup page. Redirects to `/` if already authenticated. |
| `/setup` | First-run super-admin setup wizard. Public. |
| `/` | **App Launcher** — animated welcome, then app tile grid with live stats and recent notifications. |
| `/apps` | App Store — browse available and upcoming UMS Hub applications. |
| `/docs/*` | **Document Vault** — all document, customer, task, reminder, chat, and admin pages. Protected by `ProtectedRoute`. |
| `/ops/*` | **Operations Hub** — vendor issues, uptime, incidents, passwords, escalations, on-call. Restricted to `admin` and `staff`. Rendered inside `OpsShell` which provides `AppLayout`. |
| `/admin/users` | **User Hub** — unified cross-app user management. Admin only. |
| `/admin/reports` | **Reports Hub** — comprehensive report builder across both apps. Admin only. |
| `/admin/roles` | **Role Manager** — RBAC custom role/permission management. Super admin only. |

---

## App Launcher (`/`)

The launcher is the first screen a user sees after login (and after the welcome animation). It has three distinct layers:

### Welcome Screen
On the first visit of each browser session, `WelcomeScreen` renders as a full-screen overlay (`z-[9999]`) with a Framer Motion gradient background. The sequence:

1. Logo springs in from above (delay 0.5 s).
2. "UMS Hub" title appears letter-by-letter (stagger 0.05 s/char, starting at 1.0 s).
3. Tagline fades in (delay 1.4 s).
4. App preview cards slide up one-by-one (delay 1.8 s, stagger 0.15 s).
5. Personalised greeting fades in (delay 2.5 s).
6. A progress bar at the bottom sweeps from 0 % to 100 % over 2.7 s.

After 3 s the screen fades out (or the user can click anywhere to dismiss it early). `AnimatePresence.onExitComplete` calls the parent `handleWelcomeComplete` callback, which sets `sessionStorage.umshub_welcome_seen = '1'` so the screen does not repeat in the same session.

### View Modes
Three view modes are toggled in the top-right corner of the launcher and persisted to `localStorage` key `umshub_launcher_view`:

| Mode | Layout |
|---|---|
| `classic` | Hero greeting with live stats + medium cards in a 2-column grid + recent activity below |
| `modern` | Featured app (most recently launched) as a large gradient card on the left, other apps as compact rows on the right + recent activity panel |
| `compact` | Simple flat list of apps (no cards) + recent activity below, suitable for narrow screens |

### Live Stats
A single `useQuery` with key `launcher-stats` fetches four values in parallel:
- Total document count from `documents`
- Total customer count from `customers`
- Count of `open` incidents from `incidents`
- Current upload streak for the signed-in user from `upload_streaks`

### Recent Notifications Panel
All three views render `RecentActivity`, a shared component fed by a query to `in_app_notifications` (ordered by `created_at DESC`, limit 10). Unread items are highlighted with a primary-tinted background.

### "Continue" Deep-linking
`AppSidebar` writes `localStorage.umshub_last_docs_page` and `localStorage.umshub_last_ops_page` on every navigation. The launcher reads these to offer a "Continue: \<page\>" link inside the app cards.

---

## Per-App Sidebar Switching

`AppSidebar` detects which app is active from `location.pathname`:

```
currentApp = 'docs'  if pathname starts with /docs
currentApp = 'ops'   if pathname starts with /ops
currentApp = 'home'  otherwise
```

Based on `currentApp`, the sidebar renders the matching nav group:
- `docs` or `home` → **Document Vault** section + **Administration** section (admin only)
- `ops` → **Operations Hub** section

A two-button app switcher (Docs / Ops) is shown in the sidebar header for admin/staff. Clicking a button calls `switchToApp()`, which navigates to the last visited page for that app (stored in localStorage) or falls back to the app root.

Collapsible group states (`umshub_sidebar_docs_open`, `umshub_sidebar_ops_open`, `umshub_sidebar_admin_open`) and scroll position (`umshub_sidebar_scroll` in sessionStorage) are persisted so the sidebar remembers its state across navigations.

---

## Component Hierarchy

```
App
└── ChunkErrorBoundary              (catches lazy-load chunk errors, shows reload prompt)
    └── QueryClientProvider         (TanStack React Query v5 — global query client)
        └── TooltipProvider         (Radix UI tooltip context)
            ├── Toaster             (shadcn/ui toast)
            ├── Sonner              (sonner toast)
            └── BrowserRouter
                └── AuthProvider   (Supabase auth state — user, profile, role, isAdmin…)
                    └── AppRoutes
                        └── InactivityWrapper
                            ├── useInactivityTimeout()   (15-min idle logout)
                            ├── useNotifications()       (Realtime badge subscriptions)
                            └── OnboardingTourProvider   (tour context, step navigation)
                                └── PasswordExpiryGate   (forces password change when expired)
                                    └── MaintenanceGate  (shows maintenance screen if flag set)
                                        └── Routes
                                            ├── /auth   → AuthPageWrapper
                                            ├── /setup  → SetupAdmin
                                            ├── /       → ProtectedRoute → AppLauncher
                                            ├── /apps   → ProtectedRoute → AppStore
                                            ├── /docs/* → ProtectedRoute → DocShell → Outlet
                                            │   └── (each page renders its own AppLayout)
                                            ├── /ops/*  → ProtectedRoute → OpsShell
                                            │   └── AppLayout → Outlet (ops pages are bare)
                                            ├── /admin/users  → ProtectedRoute → UserHub
                                            ├── /admin/reports → ProtectedRoute → ReportsHub
                                            └── /admin/roles  → ProtectedRoute → RoleManager
```

### `AppLayout`
Wraps every inner page. Renders:
- `SidebarProvider` + `AppSidebar` (collapsible icon sidebar)
- Top header bar: sidebar trigger, page title, breadcrumb, `AnnouncementBanner`, `NotificationBell`, `CommandPaletteTrigger`, `KeyboardShortcutsDialog`, `DensityToggle`, `ThemeToggle`, role badge, avatar
- `PasswordExpiryBanner` (non-blocking warning strip before the gate triggers)
- `AnimatePresence` page transition wrapper (`opacity` + `y` fade)
- `MobileNav` bottom bar for small screens
- `QuickActions` floating action button

---

## Supabase

| Feature | Details |
|---|---|
| Database | PostgreSQL 14 (managed), project ref `mmnpopwzfjyfasvzzatg` |
| Auth | Supabase Auth — email/password, JWT stored in localStorage, `onAuthStateChange` listener, optional TOTP MFA |
| Storage | Four private/public buckets: `documents`, `task-files`, `avatars`, `op-documents` |
| Edge Functions | Deno runtime, 17 functions — see `API.md` |
| Realtime | Subscriptions on `chat_messages`, `in_app_notifications`, `ops_notifications` tables |
| RLS | Enabled on all tables; `SECURITY DEFINER` functions prevent policy recursion |

---

## PWA

Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`. Workbox generates a service worker on every production build that:
- Pre-caches all JS, CSS, HTML, image, and font assets (`globPatterns`)
- Runtime-caches Supabase API responses with a NetworkFirst strategy (24-hour TTL, 50-entry cap)
- Max asset file size: 5 MB

The web manifest declares the app as `standalone` with category `business/productivity`. HTTPS is required for SW registration and Web Push. The SW auto-updates silently — the user does not need to manually refresh.

---

## State Management

| Concern | Solution |
|---|---|
| Server state (queries, mutations) | TanStack React Query v5 — `useQuery`, `useMutation`, `queryClient.invalidateQueries` |
| Auth / user identity | `AuthContext` (React Context + `useContext`) |
| Theme | `next-themes` (CSS variable-based) |
| UI density | `DensityContext` (custom context, persisted to localStorage) |
| Sidebar open/collapsed | Radix `SidebarProvider` + localStorage persistence |
| No global client store | No Redux, Zustand, or Jotai — server state lives in React Query, UI state lives in component local state |

React Query v5 notes:
- `onError` on `useQuery` is removed in v5; use the `queryCache` global error handler or `meta` option.
- Mutations use `onSuccess` → `queryClient.invalidateQueries({ queryKey: [...] })`.
- Query keys are arrays (`['documents', customerId]`) for granular invalidation.
