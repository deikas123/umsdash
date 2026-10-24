# Contributing Guide

## Project Structure

```
umsdash/
├── src/
│   ├── assets/               — Static assets (logos, images)
│   ├── components/           — Shared UI components
│   │   ├── layout/           — AppLayout, AppSidebar, Breadcrumb, MobileNav
│   │   ├── gamification/     — StreakWidget, XPBar, AchievementBadge, DailyChallenge, Leaderboard
│   │   ├── onboarding/       — TourModal, TourTooltip, TourController, TourStep
│   │   ├── launcher/         — ClassicView, ModernView, CompactView, WelcomeScreen
│   │   ├── operations/       — OpVendorCard, OpIncidentForm, EscalationTimeline, ChunkErrorBoundary
│   │   └── ui/               — shadcn/ui primitives (Button, Dialog, Table, etc.)
│   ├── contexts/
│   │   └── AuthContext.tsx   — Auth state, role, profile, customerId
│   ├── hooks/                — All TanStack Query data hooks
│   │   ├── useDocuments.ts
│   │   ├── useFolders.ts
│   │   ├── useGamification.ts
│   │   ├── useInactivityTimeout.ts
│   │   ├── useInAppNotifications.ts
│   │   ├── useMFA.ts
│   │   ├── useNotificationCounts.ts
│   │   ├── useNotifications.ts
│   │   ├── useOnboardingTour.ts
│   │   ├── useOrgSettings.ts
│   │   ├── usePasswordExpiry.ts
│   │   ├── usePushNotifications.ts
│   │   ├── useRBAC.ts
│   │   ├── useRecentlyViewed.ts
│   │   ├── useChat.ts
│   │   └── operations/       — Ops-specific hooks (useVendorIssues, useIncidents, etc.)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     — Supabase client singleton
│   │       └── types.ts      — Auto-generated DB types
│   ├── lib/
│   │   ├── utils.ts          — Shared utilities (cn, formatters)
│   │   ├── export-utils.ts   — PDF/Excel export helpers (jsPDF, xlsx)
│   │   └── permissions.ts    — Permission key constants for RBAC
│   ├── pages/                — One file per route
│   │   ├── AppLauncher.tsx
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Upload.tsx
│   │   ├── Documents.tsx
│   │   ├── Folders.tsx
│   │   ├── Tasks.tsx
│   │   ├── Reminders.tsx
│   │   ├── Chat.tsx
│   │   ├── GamificationDashboard.tsx
│   │   ├── Settings.tsx
│   │   ├── UserHub.tsx
│   │   ├── RoleManager.tsx
│   │   ├── TourManager.tsx
│   │   ├── ReportsHub.tsx
│   │   └── operations/       — Ops Hub pages
│   │       ├── OpDashboard.tsx
│   │       ├── OpVendorIssues.tsx
│   │       ├── OpIncidents.tsx
│   │       ├── OpEscalations.tsx
│   │       ├── OpPasswords.tsx
│   │       └── ...
│   ├── test/                 — Vitest test files
│   └── App.tsx               — Root component with all routes
├── supabase/
│   ├── migrations/           — Numbered SQL migration files
│   └── functions/            — Deno Edge Functions (one directory per function)
├── docs/                     — This documentation
├── public/                   — PWA icons, favicon, manifest
├── package.json
└── vite.config.ts
```

---

## How to Add a New Page

1. Create `src/pages/NewPage.tsx`:

```tsx
import { AppLayout } from '@/components/layout/AppLayout';

export default function NewPage() {
  return (
    <AppLayout title="New Feature" description="What this page does">
      {/* page content */}
    </AppLayout>
  );
}
```

2. Add the route in `src/App.tsx`:

```tsx
import NewPage from './pages/NewPage';

// Inside the appropriate Route group:
<Route
  path="/docs/new-feature"
  element={
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

3. Add a nav item in `src/components/layout/AppSidebar.tsx` to the appropriate array (`docNavItems`, `opsNavItems`, or `adminDocItems`):

```ts
{ title: 'New Feature', url: '/docs/new-feature', icon: SomeIcon }
```

---

## How to Add a Database Migration

1. Create the migration file with a timestamp prefix:

```bash
# Format: YYYYMMDDHHMMSS_description.sql
# Example:
touch supabase/migrations/20261101120000_add_new_table.sql
```

2. Write the SQL. Always include:
   - `CREATE TABLE IF NOT EXISTS` (idempotent)
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - RLS policies for every operation
   - Grants where needed

3. Apply to the remote project:

```bash
supabase db push --project-ref mmnpopwzfjyfasvzzatg
```

4. Update `src/integrations/supabase/types.ts` by regenerating from the project:

```bash
supabase gen types typescript --project-id mmnpopwzfjyfasvzzatg > src/integrations/supabase/types.ts
```

---

## TanStack Query v5 Pattern

All data fetching uses TanStack Query v5. The key changes from v4:
- `useQuery` returns `{ data, isLoading, error }` — `isLoading` is now `isPending` for new hooks
- `onSuccess`/`onError` callbacks on `useQuery` are removed — use `useEffect` on `data`/`error`
- `useMutation` still accepts `onSuccess`/`onError`

Example hook:

```ts
// src/hooks/useDocuments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

---

## Code Conventions

**TypeScript**
- Strict mode enabled (`tsconfig.json` — `"strict": true`)
- All component props typed with interfaces
- Prefer `type` for union types, `interface` for object shapes

**Components**
- Use shadcn/ui primitives from `src/components/ui/` — do not add raw HTML elements where a shadcn component exists
- Use `cn()` from `src/lib/utils.ts` for conditional class merging (wraps `clsx` + `tailwind-merge`)
- Use Tailwind CSS utility classes — no inline styles, no separate CSS files

**Animations**
- Use `framer-motion` for entrance/exit animations
- Keep animations subtle — `duration: 0.2-0.4s`, `ease: "easeOut"`
- Use `AnimatePresence` for conditional rendering with exit animations

**Error Handling**
- Supabase calls: always destructure `{ data, error }` and `throw error` if truthy
- Mutations: display errors via `sonner` toast (`import { toast } from 'sonner'`)
- Async boundaries: `ChunkErrorBoundary` wraps the entire app for lazy-load chunk errors

**File Naming**
- Pages: PascalCase (`MyDocuments.tsx`)
- Hooks: camelCase with `use` prefix (`useDocuments.ts`)
- Components: PascalCase (`DocumentCard.tsx`)

---

## Running Tests

```bash
npm run test           # single run (CI)
npm run test:watch     # watch mode (development)
```

Tests use Vitest + `@testing-library/react`. Test files live in `src/test/`.

---

## Git Workflow

- Main branch: `master`
- Feature branches: `feat/description`
- Fix branches: `fix/description`
- Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

Never commit:
- `.env` files containing secrets
- Generated `dist/` directory
- `node_modules/`

These are all covered by `.gitignore`.
