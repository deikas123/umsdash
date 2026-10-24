# UMS Hub — Developer Guide

## Project Structure

```
umsdash/
├── public/                  # Static assets served as-is (PWA icons, robots.txt)
├── src/
│   ├── assets/              # Bundled assets (logo PNG)
│   ├── components/
│   │   ├── customers/       # Customer-specific components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── documents/       # Document list, preview, upload components
│   │   ├── folders/         # Folder tree, share dialog
│   │   ├── gamification/    # XP bar, streak card, achievement badge, leaderboard
│   │   ├── layout/          # AppLayout, AppSidebar, Breadcrumb, MobileNav
│   │   ├── onboarding/      # TourController, spotlight overlay
│   │   ├── operations/      # Ops-specific components (ChunkErrorBoundary, etc.)
│   │   ├── settings/        # Settings section components
│   │   ├── tasks/           # Task card, comment thread
│   │   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── upload/          # Upload form, camera capture, dropzone
│   │   ├── users/           # User table, invite form
│   │   ├── AnnouncementBanner.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── DensityToggle.tsx
│   │   ├── KeyboardShortcutsDialog.tsx
│   │   ├── MaintenanceGate.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── PasswordExpiryBanner.tsx
│   │   ├── PasswordExpiryGate.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── QuickActions.tsx
│   │   ├── SmsBanner.tsx
│   │   ├── TableToolbar.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── WhatsNew.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state + signIn/signOut
│   ├── hooks/
│   │   ├── operations/       # Ops-specific hooks (useUserRole.ts)
│   │   ├── useChat.ts
│   │   ├── useDocuments.ts
│   │   ├── useFolders.ts
│   │   ├── useGamification.ts
│   │   ├── useInactivityTimeout.ts
│   │   ├── useInAppNotifications.ts
│   │   ├── useMFA.ts
│   │   ├── useNotificationCounts.ts
│   │   ├── useNotificationPreferences.ts
│   │   ├── useNotifications.ts
│   │   ├── useNotificationSound.ts
│   │   ├── useOnboardingTour.ts
│   │   ├── useOrgSettings.ts
│   │   ├── usePasswordExpiry.ts
│   │   ├── usePushNotifications.ts
│   │   ├── useRecentlyViewed.ts
│   │   ├── useReminders.ts
│   │   ├── useSmsPreferences.ts
│   │   ├── useStats.ts
│   │   ├── useStreakWidget.ts
│   │   ├── useTasks.ts
│   │   ├── useTaskComments.ts
│   │   ├── useTheme.ts
│   │   ├── useUserHub.ts
│   │   └── useUserRole.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # createClient() with env vars
│   │       └── types.ts     # Generated DB types (Database, Tables<>, Enums<>)
│   ├── lib/
│   │   ├── export-utils.ts  # CSV/Excel/PDF export helpers
│   │   ├── exportUtils.ts   # Alt export utilities
│   │   ├── mask.ts          # Data masking helpers
│   │   ├── utils.ts         # cn() and other utility functions
│   │   └── watermark-utils.ts # Client-side watermark rendering
│   ├── pages/
│   │   ├── operations/      # All /ops/* pages
│   │   ├── AppLauncher.tsx
│   │   ├── AppStore.tsx
│   │   ├── Auth.tsx
│   │   ├── SetupAdmin.tsx
│   │   └── ...              # All /docs/* pages
│   ├── test/                # Vitest test files
│   ├── App.tsx              # Root component, all routes
│   └── main.tsx             # Entry point
├── supabase/
│   ├── functions/           # Edge Functions (one directory per function)
│   ├── migrations/          # SQL migration files
│   └── config.toml          # Supabase project config
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.app.json
└── vite.config.ts
```

---

## Coding Conventions

### TypeScript

- Strict mode is enabled (`tsconfig.app.json`).
- All DB row types come from `src/integrations/supabase/types.ts`. Use `Tables<'table_name'>` for row types, `Enums<'enum_name'>` for enum types.
- Never cast to `any` for DB results — use the generated types or `unknown` with a type guard.
- When Supabase types don't match runtime (e.g. joined relations), use `as unknown as TargetType` with a comment explaining why.

### TanStack Query v5 Patterns

All server state uses TanStack Query v5. Key changes from v4:
- `useQuery` options: `queryKey` is required, `onSuccess`/`onError` removed — handle in the component.
- `useMutation`: use `onSuccess`, `onError`, `onSettled` in `mutationFn` options.
- `queryClient.invalidateQueries({ queryKey: [...] })` — always pass the object form.

**Standard query pattern:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['documents', filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});
```

**Standard mutation pattern:**
```typescript
const createDocument = useMutation({
  mutationFn: async (payload: NewDocument) => {
    const { data, error } = await supabase.from('documents').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast({ title: 'Document created' });
  },
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

### Component Patterns

- Page components use `AppLayout` as their top-level wrapper (Document Vault pages render `<AppLayout>` themselves; Operations Hub pages get it from `OpsShell`).
- Use `PageHeader` component for consistent page titles:

```tsx
<PageHeader title="Documents" description="Manage all customer documents." />
```

- Use `EmptyState` for empty list states:

```tsx
<EmptyState icon={FileText} title="No documents" description="Upload your first document." />
```

- Sidebar `NavItem` components use `data-active` and `data-tour` attributes for active state and tour targeting.

### Styling

- All styles use **Tailwind CSS utility classes**.
- Use `cn()` from `src/lib/utils.ts` for conditional classes:

```typescript
import { cn } from '@/lib/utils';
<div className={cn('base-class', isActive && 'active-class')} />
```

- Use shadcn/ui components from `src/components/ui/` for all UI primitives.
- CSS variables for theme colours are in `tailwind.config.ts` and `src/index.css`.

---

## How to Add a New Page / Route

1. Create the page component in `src/pages/` (or `src/pages/operations/` for Ops Hub pages).

2. Add the route to `src/App.tsx`:

```tsx
// Document Vault page (staff/admin)
<Route path="my-new-page" element={
  <ProtectedRoute allowedRoles={['admin', 'staff']}>
    <MyNewPage />
  </ProtectedRoute>
} />

// Admin-only page
<Route path="admin-page" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminPage />
  </ProtectedRoute>
} />
```

3. Wrap the page with `AppLayout` if it's a Document Vault page:

```tsx
export default function MyNewPage() {
  return (
    <AppLayout title="My New Page" description="What this page does.">
      {/* page content */}
    </AppLayout>
  );
}
```

4. Add a breadcrumb mapping if needed (see `src/components/layout/Breadcrumb.tsx`).

---

## How to Add a New Nav Item

### Document Vault (staff/admin items)

In `src/components/layout/AppSidebar.tsx`, add to `docNavItems`:

```typescript
const docNavItems = [
  // ... existing items ...
  { title: 'My Feature', url: '/docs/my-feature', icon: MyIcon },
];
```

### Administration (admin-only items)

Add to `adminDocItems` in the same file:

```typescript
const adminDocItems = [
  // ... existing items ...
  { title: 'My Admin Feature', url: '/docs/my-admin-feature', icon: MyIcon },
  // Or with super-admin-only access:
  { title: 'My SA Feature', url: '/docs/my-sa-feature', icon: MyIcon, superAdminOnly: true },
];
```

### Operations Hub items

Add to `opsNavItems`:

```typescript
const opsNavItems = [
  // ... existing items ...
  { title: 'My Ops Feature', url: '/ops/my-ops-feature', icon: MyIcon },
];
```

### Sidebar badges (pending counts)

To show a badge count on a nav item, add `badge: 'myBadge'` to the item definition, then return the count from `useNotificationCounts()`:

```typescript
// In useNotificationCounts.ts
const { data: myCount } = useQuery({ queryKey: ['my-count'], queryFn: ... });
return { ..., myBadgeCount: myCount ?? 0 };

// In AppSidebar.tsx
const getBadgeCount = (badge?: string) => {
  if (badge === 'tasks') return pendingTasksCount;
  if (badge === 'myBadge') return myBadgeCount;
  // ...
};
```

---

## How to Add a New Permission

UMS Hub uses route-level role guards via `ProtectedRoute`. There is no fine-grained permission matrix beyond role checks and the super admin email check.

To add a new permission:

**Option A — role-based:**  
Add `allowedRoles={['admin']}` to the `ProtectedRoute` wrapping your new route.

**Option B — position-based:**  
Read `profiles.position` from `useAuth().profile` and conditionally render features:

```typescript
const { profile } = useAuth();
const isHOD = profile?.position === 'hod';
```

**Option C — super admin gate:**  
Add `requireSuperAdmin` to `ProtectedRoute` for features exclusive to the super admin.

**Option D — per-app access:**  
Check `user_app_access` from the `useUserHub` hook to restrict access to a specific app.

To add a DB-level permission, add a new RLS policy to the relevant table in a migration. Use the existing helper functions (`has_role`, `is_super_admin`, etc.) for consistency.

---

## How to Create a New DB Migration

1. Generate a timestamped migration file:

```bash
npx supabase migration new my_migration_name
```

This creates `supabase/migrations/<timestamp>_my_migration_name.sql`.

2. Write your SQL in the file. Follow the convention in existing migrations: CREATE TABLE IF NOT EXISTS, enable RLS, add policies, seed data if needed.

3. Apply to local Supabase (if running locally):

```bash
npx supabase db reset    # or npx supabase db push for remote
```

4. Apply to remote project:

```bash
npx supabase db push
```

5. Update `src/integrations/supabase/types.ts` to reflect new tables/views/functions. With Supabase CLI:

```bash
npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

---

## How to Deploy a New Edge Function

1. Create a new directory under `supabase/functions/<function-name>/`.
2. Add `index.ts` as the entry point.
3. Follow the pattern from existing functions:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // ... function body ...
});
```

4. If the function doesn't require JWT auth (e.g. cron-called), add to `supabase/functions/config.toml`:

```toml
[functions.my-function]
verify_jwt = false
```

5. Deploy:

```bash
npx supabase functions deploy my-function
```

6. Set any required secrets:

```bash
npx supabase secrets set MY_SECRET_KEY=<value>
```

---

## Common Patterns

### ProtectedRoute

```tsx
// Any authenticated user
<Route path="..." element={<ProtectedRoute><MyPage /></ProtectedRoute>} />

// Specific roles
<Route path="..." element={
  <ProtectedRoute allowedRoles={['admin', 'staff']}><MyPage /></ProtectedRoute>
} />

// Super admin only
<Route path="..." element={
  <ProtectedRoute requireSuperAdmin><MyPage /></ProtectedRoute>
} />
```

### AppLayout

```tsx
import { AppLayout } from '@/components/layout/AppLayout';

export default function MyPage() {
  return (
    <AppLayout title="My Page" description="Optional subtitle.">
      {/* content */}
    </AppLayout>
  );
}
```

### useQuery with Supabase

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Document = Tables<'documents'>;

const { data: documents = [], isLoading } = useQuery<Document[]>({
  queryKey: ['documents'],
  queryFn: async () => {
    const { data, error } = await supabase.from('documents').select('*');
    if (error) throw error;
    return data;
  },
});
```

### useMutation with Supabase

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const queryClient = useQueryClient();
const { toast } = useToast();

const deleteDocument = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast({ title: 'Document deleted' });
  },
});

// Usage
deleteDocument.mutate(documentId);
```

### Calling an Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('send-sms', {
  body: { mobile: '0712345678', message: 'Hello!', type: 'general' },
});
```

### Exporting to CSV

```typescript
import { exportToCSV } from '@/lib/export-utils';

exportToCSV(
  documents.map(d => ({ Title: d.title, Status: d.status, 'Upload Date': d.created_at })),
  'documents-export'
);
```

---

## Build and Lint Commands

```bash
# Development server (port 8080)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type check + ESLint
npm run lint

# Run tests (Vitest)
npm run test

# Watch mode tests
npm run test:watch
```

### Test location

Tests live in `src/test/`. The test framework is **Vitest** with **@testing-library/react**. Configuration is in `vitest.config.ts`.

---

## TypeScript Conventions — How `types.ts` is Maintained

`src/integrations/supabase/types.ts` is the source of truth for all database types. It is generated by the Supabase CLI and should not be manually edited for schema changes.

After any schema migration, regenerate:

```bash
npx supabase gen types typescript --project-id <project-id> --schema public \
  > src/integrations/supabase/types.ts
```

**Using the types:**

```typescript
import type { Tables, Enums, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Row type
type Document = Tables<'documents'>;

// Insert type (required fields only)
type NewDocument = TablesInsert<'documents'>;

// Update type (all optional)
type DocumentUpdate = TablesUpdate<'documents'>;

// Enum
type AppRole = Enums<'app_role'>;
```

The `Database` type also supports `supabase.from('table')` type inference when the client is created as `createClient<Database>(url, key)` (see `src/integrations/supabase/client.ts`).
