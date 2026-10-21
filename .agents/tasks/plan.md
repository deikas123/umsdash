# UMS Hub — Implementation Plan

**Workspace root:** `c:\Users\Administrator\Desktop\Deikasgroup\amstern tech hub\umsdash`  
**Base:** ums-docs-vault (cloned at `.agents/temp/ums-docs-vault`)  
**Secondary:** uptime-hub (cloned at `.agents/temp/uptime-hub`)  
**Target Supabase:** `https://mmnpopwzfjyfasvzzatg.supabase.co`

---

## Overview

The workspace is currently empty (only `.agents/` exists). Every item below assumes the coder is working from the workspace root. Steps are ordered by dependency — later steps import code from earlier ones.

---

- [ ] 1. **Scaffold project root from ums-docs-vault**

  Copy the following files/directories verbatim from `.agents/temp/ums-docs-vault/` into the workspace root. Do NOT copy `.git/`, `node_modules/`, `dist/`, or `.env`.

  Files to copy:
  - `index.html`
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.node.json`
  - `postcss.config.js`
  - `tailwind.config.ts`
  - `eslint.config.js`
  - `vitest.config.ts`
  - `components.json`
  - `DOCUMENTATION.md` (keep for reference)
  - `MIGRATION.md`

  Directories to copy (full tree):
  - `src/` (entire directory — this is the base codebase)
  - `public/` (PWA icons, favicon, manifest.json)
  - `supabase/` (config.toml + all 29 migrations + all 5 edge functions)

  Files: All listed above  
  Verify: `dir` at workspace root shows `src/`, `public/`, `supabase/`, `index.html`, `tsconfig.json`, etc.

---

- [ ] 2. **Create merged `package.json`**

  Create `package.json` at the workspace root with these changes from ums-docs-vault's version:
  - `"name": "ums-hub"`
  - `"description": "UMS Hub — Unified Management Platform"`
  - Keep all existing ums-docs-vault dependencies
  - Add these from uptime-hub (use the higher version where there's overlap):
    - `"@supabase/supabase-js": "^2.99.2"` (upgrade from 2.91.1)
    - `"framer-motion": "^12.38.0"` (new — not in ums-docs-vault)
    - `"react-dropzone": "^14.3.8"` (already present in ums-docs-vault, keep)
  - Keep `"vite-plugin-pwa": "^1.2.0"` from ums-docs-vault
  - Keep `"drizzle-kit": "0.x"` and `"drizzle-orm": "0.x"` and `"postgres": "^3.4.9"` as devDependencies (needed for migration tooling)
  - Keep `"supabase": "^2.76.15"` in devDependencies (ums-docs-vault has it)

  The final `scripts` block:
  ```json
  {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
  ```

  Files: `package.json`  
  Verify: File is valid JSON — `node -e "require('./package.json')"` exits with code 0.

---

- [ ] 3. **Create `vite.config.ts` (merged)**

  Create `vite.config.ts` at workspace root. Base it on ums-docs-vault's version (which has PWA plugin). Add the `build` block from uptime-hub:

  ```ts
  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react-swc";
  import path from "path";
  import { VitePWA } from "vite-plugin-pwa";

  export default defineConfig(({ mode }) => ({
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "favicon.ico", "robots.txt"],
        manifest: {
          name: "UMS Hub",
          short_name: "UMS Hub",
          description: "UMS Hub — Unified Management Platform",
          theme_color: "#1e5799",
          background_color: "#f8fafc",
          display: "standalone",
          scope: "/",
          start_url: "/",
          orientation: "portrait-primary",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/pwa-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          categories: ["business", "productivity", "utilities"],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [{
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-cache", expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
          }],
        },
      }),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: (id: string) => id.startsWith("core-js/"),
      },
    },
  }));
  ```

  Files: `vite.config.ts`  
  Verify: `npm run build` completes without missing-plugin errors (run after step 6 when deps are installed).

---

- [ ] 4. **Create `.env` file**

  Create `.env` at workspace root:

  ```
  VITE_SUPABASE_URL=https://mmnpopwzfjyfasvzzatg.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnBvcHd6Zmp5ZmFzdnp6YXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NjAyMjQsImV4cCI6MjEwODEzNjIyNH0.xvXPco3sx-FXhu0gfPSiuv39H53O-hdnlGluohDUxbs
  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_UQ_XmKLjD9AvY7xX_aTwkQ_pPnNSvQH
  VITE_SUPABASE_PROJECT_ID=mmnpopwzfjyfasvzzatg
  ```

  Also create `.env.example` with the same keys but empty values (safe to commit).

  Files: `.env`, `.env.example`  
  Verify: `cat .env` (Windows: `Get-Content .env`) shows all four keys.

---

- [ ] 5. **Update Supabase client and config**

  **`src/integrations/supabase/client.ts`** — Replace the existing file content (which references `brokeredPreviewStorage` is not in ums-docs-vault, so base version is fine). The ums-docs-vault version uses `localStorage` directly. Update only the key name to use `VITE_SUPABASE_ANON_KEY` as an alias for `VITE_SUPABASE_PUBLISHABLE_KEY`:

  ```ts
  import { createClient } from '@supabase/supabase-js';
  import type { Database } from './types';

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  ```

  **`supabase/config.toml`** — Replace with the merged version. The new project ID is `mmnpopwzfjyfasvzzatg`. Include all edge function JWT overrides from both repos (rename uptime-hub's `send-sms` to `ops-send-sms`):

  ```toml
  project_id = "mmnpopwzfjyfasvzzatg"

  [functions.seed-admin]
  verify_jwt = false

  [functions.send-sms]
  verify_jwt = false

  [functions.reset-user-password]
  verify_jwt = false

  [functions.ops-send-sms]
  verify_jwt = false

  [functions.password-reminders]
  verify_jwt = false

  [functions.admin-create-user]
  verify_jwt = false

  [functions.notify-sms]
  verify_jwt = false

  [functions.admin-update-email]
  verify_jwt = false
  ```

  Files: `src/integrations/supabase/client.ts`, `supabase/config.toml`  
  Verify: No TypeScript errors from client.ts — `npm run lint` passes after deps are installed.

---

- [ ] 6. **Install dependencies**

  Run from workspace root:
  ```
  npm install
  ```

  Files: `node_modules/`, `package-lock.json`  
  Verify: `npm install` exits with code 0. Then `npm run build` should compile (expect type errors until step 12 — only check that vite can resolve imports).

---

- [ ] 7. **Copy uptime-hub pages to `src/pages/operations/`**

  Create directory `src/pages/operations/`. Copy the following files from `.agents/temp/uptime-hub/src/pages/` to `src/pages/operations/`, renaming them as shown:

  | Source | Destination |
  |---|---|
  | `Dashboard.tsx` | `OpDashboard.tsx` |
  | `VendorIssues.tsx` | `OpVendorIssues.tsx` |
  | `VendorUptime.tsx` | `OpVendorUptime.tsx` |
  | `Incidents.tsx` | `OpIncidents.tsx` |
  | `Passwords.tsx` | `OpPasswords.tsx` |
  | `Documents.tsx` | `OpDocuments.tsx` |
  | `Analytics.tsx` | `OpAnalytics.tsx` |
  | `SmsLogs.tsx` | `OpSmsLogs.tsx` |
  | `Escalations.tsx` | `OpEscalations.tsx` |
  | `UserManagement.tsx` | `OpUserManagement.tsx` |
  | `ForcePasswordChange.tsx` | `OpForcePasswordChange.tsx` |

  Do NOT copy `Auth.tsx`, `Index.tsx`, `NotFound.tsx` — the base versions from ums-docs-vault are used.

  Files: `src/pages/operations/` (11 new files)  
  Verify: `dir src/pages/operations` shows 11 `.tsx` files.

---

- [ ] 8. **Copy uptime-hub shared components to `src/components/operations/`**

  Create directory `src/components/operations/`. Copy from `.agents/temp/uptime-hub/src/components/` (top-level only, not `ui/`):

  | Source | Destination |
  |---|---|
  | `StatsCard.tsx` | `src/components/operations/StatsCard.tsx` |
  | `ExportMenu.tsx` | `src/components/operations/ExportMenu.tsx` |
  | `PageHeader.tsx` | `src/components/operations/PageHeader.tsx` |
  | `ChunkErrorBoundary.tsx` | `src/components/operations/ChunkErrorBoundary.tsx` |
  | `VendorPicker.tsx` | `src/components/operations/VendorPicker.tsx` |
  | `NotificationBell.tsx` | `src/components/operations/OpNotificationBell.tsx` |

  Note: uptime-hub's `AppLayout.tsx`, `AppSidebar.tsx`, `ProtectedRoute.tsx`, `NavLink.tsx`, `ThemeToggle.tsx` are NOT copied — the ums-docs-vault versions in `src/components/layout/` and `src/components/` are used instead.

  Files: `src/components/operations/` (6 new files)  
  Verify: `dir src/components/operations` shows 6 `.tsx` files.

---

- [ ] 9. **Copy uptime-hub hooks to `src/hooks/operations/`**

  Create directory `src/hooks/operations/`. Copy from `.agents/temp/uptime-hub/src/hooks/`:
  - `useUserRole.ts` → `src/hooks/operations/useUserRole.ts`

  (uptime-hub only has 3 hooks: `useUserRole.ts`, `use-mobile.tsx`, `use-toast.ts` — the last two already exist in ums-docs-vault so only copy `useUserRole.ts`)

  Files: `src/hooks/operations/useUserRole.ts`  
  Verify: File exists.

---

- [ ] 10. **Copy uptime-hub lib utilities to `src/lib/`**

  Copy from `.agents/temp/uptime-hub/src/lib/`:
  - `exportUtils.ts` → `src/lib/exportUtils.ts` (uptime-hub calls it `exportUtils.ts`; ums-docs-vault calls it `export-utils.ts` — keep BOTH with their respective names)
  - `mask.ts` → `src/lib/mask.ts` (new file, not in ums-docs-vault)

  Files: `src/lib/exportUtils.ts`, `src/lib/mask.ts`  
  Verify: Both files exist.

---

- [ ] 11. **Copy uptime-hub edge functions to `supabase/functions/`**

  Copy these directories from `.agents/temp/uptime-hub/supabase/functions/` to `supabase/functions/`:
  - `notify-sms/` → `supabase/functions/notify-sms/`
  - `password-reminders/` → `supabase/functions/password-reminders/`
  - `escalations/` → `supabase/functions/escalations/`
  - `admin-create-user/` → `supabase/functions/admin-create-user/`
  - `admin-reset-password/` → `supabase/functions/admin-reset-password/`
  - `admin-update-email/` → `supabase/functions/admin-update-email/`
  - `complete-password-change/` → `supabase/functions/complete-password-change/`
  - `send-sms/` from uptime-hub → `supabase/functions/ops-send-sms/` (rename to avoid conflict with ums-docs-vault's `send-sms/`)

  Files: `supabase/functions/notify-sms/`, `supabase/functions/password-reminders/`, `supabase/functions/escalations/`, `supabase/functions/admin-create-user/`, `supabase/functions/admin-reset-password/`, `supabase/functions/admin-update-email/`, `supabase/functions/complete-password-change/`, `supabase/functions/ops-send-sms/`  
  Verify: `dir supabase/functions` shows 13 function directories total (5 from ums-docs-vault + 8 from uptime-hub).

---

- [ ] 12. **Create merged Supabase migration: `supabase/migrations/20261015000000_ops_schema.sql`**

  This is the single new migration file that adds all uptime-hub tables that don't conflict with the ums-docs-vault base schema. The ums-docs-vault 29 migrations run first (they define `profiles`, `user_roles`, `documents`, `sms_logs`, `app_role` enum, `has_role()`, `update_updated_at_column()`). This migration runs after them and adds only what's new.

  **Conflict analysis and resolution:**
  - `app_role` enum: uptime-hub uses `admin|manager|user`; ums-docs-vault uses `admin|staff|customer` — **ums-docs-vault wins**. The new migration does NOT recreate the enum. It adds the `manager` and `user` values to the existing enum as aliases (the ops pages map `manager→staff`, `user→staff`). Actually since app_role is an enum with fixed values, we simply extend it: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';` — this allows uptime-hub RLS policies that reference `has_role(uid, 'manager'::app_role)` to still work.
  - `profiles` table: ums-docs-vault wins. The migration adds uptime-hub's extra columns via `ADD COLUMN IF NOT EXISTS`: `title TEXT`, `department TEXT`, `phone_number TEXT`. These columns may already exist if ums-docs-vault added them — use `IF NOT EXISTS` to be safe.
  - `user_roles` table: ums-docs-vault wins (already exists). No changes needed.
  - `documents` table: ums-docs-vault wins (rich schema with `customer_id`, `category_id`, `status`, etc.). Uptime-hub's simpler `documents` table is a subset. Do NOT recreate it. The `OpDocuments.tsx` page will be adapted in step 16 to use the ums-docs-vault `documents` schema.
  - `sms_logs` table: ums-docs-vault wins. Both schemas are structurally identical — column names match. No change needed.
  - `update_updated_at_column()` function: already exists from ums-docs-vault migration 1. Do not recreate.
  - `has_role()` function: already exists. Do not recreate.

  **New tables to create (from uptime-hub Drizzle migration + SQL migrations):**

  ```sql
  -- Migration: uptime-hub ops schema additions
  -- All ums-docs-vault tables already exist. This adds ops-specific tables only.

  -- Extend app_role enum to support uptime-hub's 'manager' and 'user' values
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

  -- Extend profiles with ops-specific columns (ums-docs-vault may have some already)
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

  -- Incidents (entirely new — not in ums-docs-vault)
  CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department TEXT, incident_type TEXT, date_of_incident DATE, time_of_incident TIME,
    date_reported DATE DEFAULT CURRENT_DATE, location TEXT, reported_by TEXT,
    witnesses TEXT, persons_involved TEXT, description TEXT,
    item_description TEXT, item_quantity INTEGER, serial_numbers TEXT,
    estimated_value DECIMAL, supporting_docs TEXT[], safety_impact TEXT[],
    operational_impact TEXT[], financial_impact TEXT, financial_amount DECIMAL,
    severity TEXT, urgency TEXT, immediate_actions TEXT[], containment_details TEXT,
    problem_statement TEXT, why_1 TEXT, why_2 TEXT, why_3 TEXT, why_4 TEXT, why_5 TEXT,
    root_cause_categories TEXT[], root_cause_statement TEXT,
    capa_action TEXT, capa_owner TEXT, capa_deadline DATE, capa_status TEXT DEFAULT 'open',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view all incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
  CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  CREATE SEQUENCE IF NOT EXISTS public.incident_number_seq START 48;
  CREATE OR REPLACE FUNCTION public.generate_incident_number() RETURNS TRIGGER AS $$
  BEGIN NEW.incident_number = 'UMS-INC-' || LPAD(nextval('public.incident_number_seq')::TEXT,3,'0'); RETURN NEW; END;
  $$ LANGUAGE plpgsql SET search_path = public;
  CREATE TRIGGER set_incident_number BEFORE INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.generate_incident_number();

  -- Vendor issues (entirely new)
  CREATE TABLE IF NOT EXISTS public.vendor_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor TEXT NOT NULL, system_name TEXT, issue TEXT NOT NULL,
    impact TEXT NOT NULL DEFAULT 'Minor', downtime TEXT,
    status TEXT NOT NULL DEFAULT 'Open', rca_status TEXT DEFAULT 'Pending',
    date_reported DATE DEFAULT CURRENT_DATE,
    uptime_percentage NUMERIC DEFAULT NULL, uptime_start DATE DEFAULT NULL, uptime_end DATE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.vendor_issues ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view all vendor issues" ON public.vendor_issues FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can create vendor issues" ON public.vendor_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update vendor issues" ON public.vendor_issues FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
  CREATE TRIGGER update_vendor_issues_updated_at BEFORE UPDATE ON public.vendor_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Passwords (entirely new)
  CREATE TABLE IF NOT EXISTS public.passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    system_name TEXT NOT NULL, username TEXT NOT NULL, assigned_to TEXT,
    expiry_date DATE NOT NULL, notified BOOLEAN DEFAULT FALSE, last_notified_at TIMESTAMPTZ,
    phone_number TEXT, owner_user_id UUID, backup_user_id UUID,
    rotation_days INTEGER NOT NULL DEFAULT 90, last_renewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view all passwords" ON public.passwords FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can create passwords" ON public.passwords FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update passwords" ON public.passwords FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Admins can delete passwords" ON public.passwords FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  CREATE TRIGGER update_passwords_updated_at BEFORE UPDATE ON public.passwords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Password renewals (new)
  CREATE TABLE IF NOT EXISTS public.password_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_id UUID NOT NULL REFERENCES public.passwords(id) ON DELETE CASCADE,
    renewed_by UUID, previous_expiry DATE, new_expiry DATE NOT NULL,
    notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.password_renewals ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "View renewals" ON public.password_renewals FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Log renewals" ON public.password_renewals FOR INSERT TO authenticated WITH CHECK (renewed_by = auth.uid());

  -- Escalation levels (new)
  CREATE TABLE IF NOT EXISTS public.escalation_levels (
    level INTEGER PRIMARY KEY, name TEXT NOT NULL,
    target_role public.app_role, hours_to_next INTEGER
  );
  ALTER TABLE public.escalation_levels ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "View levels" ON public.escalation_levels FOR SELECT TO authenticated USING (true);
  INSERT INTO public.escalation_levels VALUES
    (1,'Level 1 – Assignee',NULL,4),(2,'Level 2 – Managers','manager',24),(3,'Level 3 – Administrators','admin',NULL)
  ON CONFLICT DO NOTHING;

  -- Escalations (new)
  CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL, source_id UUID NOT NULL, title TEXT NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'open',
    assigned_to UUID, level_deadline TIMESTAMPTZ, created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
  );
  ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "View escalations" ON public.escalations FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Manage escalations" ON public.escalations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

  -- Escalation events (new)
  CREATE TABLE IF NOT EXISTS public.escalation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_id UUID NOT NULL REFERENCES public.escalations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, from_level INTEGER, to_level INTEGER,
    actor_id UUID, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "View escalation events" ON public.escalation_events FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Insert escalation events" ON public.escalation_events FOR INSERT TO authenticated WITH CHECK (true);

  -- Ops notifications table (separate from ums-docs-vault's in_app_notifications)
  -- Named ops_notifications to avoid collision
  CREATE TABLE IF NOT EXISTS public.ops_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT,
    read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.ops_notifications ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Own ops notifications" ON public.ops_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Mark own read" ON public.ops_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Insert ops notifications" ON public.ops_notifications FOR INSERT WITH CHECK (true);

  -- Extensions needed for cron jobs (may already be enabled in project)
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  ```

  **Important note on `notifications` table conflict:** uptime-hub has a `notifications` table; ums-docs-vault has `in_app_notifications`. Both serve the same purpose. Rather than merging them (which would require changing 10+ files), this migration creates `ops_notifications` as the uptime-hub equivalent for the ops section. The `OpNotificationBell.tsx` component (step 8) will be updated in step 16 to query `ops_notifications` instead of `notifications`.

  Files: `supabase/migrations/20261015000000_ops_schema.sql`  
  Verify: File is valid SQL — no syntax errors visible on read. Full verification is on the live DB in a later step.

---

- [ ] 13. **Create unified `src/hooks/useUserRole.ts`**

  Replace the existing ums-docs-vault `src/hooks/useUserRole.ts` (if one exists — the base repo does not have this file in hooks; it's embedded in AuthContext). Create it fresh:

  ```ts
  // src/hooks/useUserRole.ts
  // Unified role hook covering both apps.
  // ums-docs-vault roles: admin | staff | customer
  // uptime-hub roles mapped: manager → staff, user → staff
  import { useAuth } from '@/contexts/AuthContext';

  export function useUserRole() {
    const { role, isAdmin, isStaff, isCustomer } = useAuth();

    return {
      role: role ?? 'customer',
      isAdmin,
      isStaff,
      isCustomer,
      // isManager is an alias for isStaff — uptime-hub components use isManager
      isManager: isAdmin || isStaff,
      loading: false, // role is loaded synchronously from AuthContext
    };
  }
  ```

  Files: `src/hooks/useUserRole.ts`  
  Verify: No TypeScript errors — `npm run build` (after step 16) compiles without errors on this file.

---

- [ ] 14. **Update `src/contexts/AuthContext.tsx` — extend for ops**

  The ums-docs-vault `AuthContext.tsx` is used as the base (it's already complete). Make the following minimal additions only:

  1. In `fetchUserData`, after the role is fetched, add a check: if the DB returns a role of `'manager'` or `'user'` (from uptime-hub rows), map them: `'manager'` → `'staff'`, `'user'` → `'staff'`. This handles any existing uptime-hub user rows in the new shared `user_roles` table.

  2. Extend `AuthContextType` interface to export `signIn` (it already does — no change needed).

  The mapping logic in `fetchUserData` after `setRole(roleData.role as AppRole)`:
  ```ts
  // Map uptime-hub legacy roles to ums-docs-vault roles
  const rawRole = roleData.role as string;
  const mappedRole: AppRole = rawRole === 'manager' || rawRole === 'user' ? 'staff' : rawRole as AppRole;
  setRole(mappedRole);
  ```

  Files: `src/contexts/AuthContext.tsx`  
  Verify: TypeScript compiles without errors.

---

- [ ] 15. **Update all import paths in copied uptime-hub operation pages**

  For every file in `src/pages/operations/` and `src/components/operations/`, perform these find-and-replace operations:

  **Import path rewrites (apply to all 11 page files and 6 component files):**

  | Old import | New import |
  |---|---|
  | `from "@/components/AppLayout"` | `from "@/components/layout/AppLayout"` |
  | `from "@/components/AppSidebar"` | *(remove — sidebar is part of AppLayout)* |
  | `from "@/components/ProtectedRoute"` | `from "@/components/ProtectedRoute"` *(no change — same path)* |
  | `from "@/components/StatsCard"` | `from "@/components/operations/StatsCard"` |
  | `from "@/components/PageHeader"` | `from "@/components/operations/PageHeader"` |
  | `from "@/components/ExportMenu"` | `from "@/components/operations/ExportMenu"` |
  | `from "@/components/NotificationBell"` | `from "@/components/operations/OpNotificationBell"` |
  | `from "@/components/VendorPicker"` | `from "@/components/operations/VendorPicker"` |
  | `from "@/components/ChunkErrorBoundary"` | `from "@/components/operations/ChunkErrorBoundary"` |
  | `from "@/lib/exportUtils"` | `from "@/lib/exportUtils"` *(no change — same path)* |
  | `from "@/lib/mask"` | `from "@/lib/mask"` *(no change — same path)* |
  | `from "@/hooks/useUserRole"` | `from "@/hooks/useUserRole"` *(no change — merged hook at same path)* |

  **Role references in ops pages:** In `OpSmsLogs.tsx` and `OpUserManagement.tsx`, calls to `useUserRole()` check `isAdmin`/`isManager`. The unified `useUserRole` from step 13 provides both — no code logic changes needed, just import path fixes.

  **`OpDocuments.tsx` specific changes:** The uptime-hub `Documents.tsx` page uses its own simple `documents` table schema (`name`, `file_path`, `file_size`, `file_type`, `uploaded_by`). The ums-docs-vault `documents` table has a different schema (`customer_id`, `category_id`, `title`, etc.). Since we created a separate ops file storage feature, `OpDocuments.tsx` should remain as-is (querying the simpler columns that do exist in the ums-docs-vault `documents` table). Update the SELECT query to only select columns that exist: `id, title as name, file_path, file_type, uploaded_by, created_at`. Change the select call: `.select('id, title, file_path, file_type, uploaded_by, created_at')` and map `title` as the `name` field in display. This is the one functional adaptation needed.

  **`OpNotificationBell.tsx` specific changes:** The uptime-hub `NotificationBell.tsx` queries the `notifications` table. Change the table name to `ops_notifications` (as created in migration step 12).

  Files: All files in `src/pages/operations/` and `src/components/operations/`  
  Verify: `npm run build` produces no "Cannot find module" errors for the ops pages.

---

- [ ] 16. **Update `src/components/layout/AppSidebar.tsx` — unified nav**

  Replace the ums-docs-vault `AppSidebar.tsx` entirely with a new version that:
  1. Has a UMS Hub logo and "UMS Hub" title in the header
  2. Has a "Home" back-to-launcher link (`/`) at the top of navigation
  3. Has three collapsible navigation groups:
     - **Document Vault** (all existing doc nav items with `/docs/` prefix — see route table below)
     - **Operations Hub** (all ops nav items with `/ops/` prefix — admin/staff only)
     - **Administration** (existing admin-only items, `/docs/` prefix)
  4. Customers only see the Document Vault group (Operations Hub is hidden when `isCustomer`)
  5. Bottom footer unchanged (avatar + logout)

  **Document Vault nav items** (updated URLs with `/docs/` prefix):
  ```ts
  const docNavItems = [
    { title: 'Dashboard', url: '/docs', icon: LayoutDashboard },
    { title: 'Upload Document', url: '/docs/upload', icon: Upload },
    { title: 'All Documents', url: '/docs/documents', icon: FileText },
    { title: 'Doc Expiry', url: '/docs/document-expiry', icon: CalendarClock },
    { title: 'Private Folders', url: '/docs/folders', icon: FolderLock },
    { title: 'Tasks', url: '/docs/tasks', icon: ListTodo, badge: 'tasks' },
    { title: 'Reminders', url: '/docs/reminders', icon: Bell, badge: 'reminders' },
    { title: 'Team Chat', url: '/docs/chat', icon: MessageSquare },
    { title: 'Search', url: '/docs/search', icon: Search },
    { title: 'Customers', url: '/docs/customers', icon: Users },
  ];
  ```

  **Document Vault customer-only items**:
  ```ts
  const docCustomerItems = [
    { title: 'My Documents', url: '/docs/my-documents', icon: FolderOpen },
    { title: 'Shared Folders', url: '/docs/folders', icon: FolderLock },
    { title: 'Tasks', url: '/docs/tasks', icon: ListTodo, badge: 'tasks' },
    { title: 'Reminders', url: '/docs/reminders', icon: Bell, badge: 'reminders' },
    { title: 'Team Chat', url: '/docs/chat', icon: MessageSquare },
  ];
  ```

  **Operations Hub nav items** (admin/staff only):
  ```ts
  const opsNavItems = [
    { title: 'Ops Dashboard', url: '/ops', icon: LayoutDashboard },
    { title: 'Vendor Issues', url: '/ops/vendor-issues', icon: AlertTriangle },
    { title: 'Vendor Uptime', url: '/ops/vendor-uptime', icon: Activity },
    { title: 'Incidents', url: '/ops/incidents', icon: FileWarning },
    { title: 'Passwords', url: '/ops/passwords', icon: KeyRound },
    { title: 'Documents', url: '/ops/documents', icon: FolderOpen },
    { title: 'Analytics', url: '/ops/analytics', icon: BarChart3 },
    { title: 'SMS Logs', url: '/ops/sms-logs', icon: MessageSquare },
    { title: 'Escalations', url: '/ops/escalations', icon: Siren },
    { title: 'Users', url: '/ops/users', icon: Users },
  ];
  ```

  **Administration items** (admin-only, `/docs/` prefix):
  ```ts
  const adminDocItems = [
    { title: 'User Management', url: '/docs/users', icon: Users },
    { title: 'Reports', url: '/docs/reports', icon: BarChart3 },
    { title: 'Notifications', url: '/docs/notifications', icon: MessageSquare },
    { title: 'Deletion Requests', url: '/docs/deletion-requests', icon: Trash2, badge: 'deletions' },
    { title: 'Categories', url: '/docs/categories', icon: FolderOpen },
    { title: 'Audit Logs', url: '/docs/audit-logs', icon: ClipboardList },
    { title: 'Storage Analytics', url: '/docs/storage-analytics', icon: HardDrive },
    { title: 'Activity Heatmap', url: '/docs/activity-heatmap', icon: Flame },
    { title: 'Database Export', url: '/docs/database-export', icon: DatabaseBackup, superAdminOnly: true },
  ];
  ```

  Use Supabase `SidebarGroup` with `SidebarGroupLabel` and wrap each section in a `<Collapsible>` component (imported from `@/components/ui/collapsible`). Keep the existing `useNotificationCounts` hook for badge counts.

  Files: `src/components/layout/AppSidebar.tsx`  
  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 17. **Create `src/pages/AppLauncher.tsx`**

  Create a new file at `src/pages/AppLauncher.tsx`. This is the home screen after login:

  ```tsx
  // src/pages/AppLauncher.tsx
  // Unified app launcher — shown at "/" after authentication.
  // Shows Document Vault and Operations Hub cards.
  // Customers only see Document Vault.
  import { useNavigate } from 'react-router-dom';
  import { useAuth } from '@/contexts/AuthContext';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
  import { ThemeToggle } from '@/components/ThemeToggle';
  import { Badge } from '@/components/ui/badge';
  import { FileText, Activity, LogOut } from 'lucide-react';
  import { useQuery } from '@tanstack/react-query';
  import { supabase } from '@/integrations/supabase/client';

  export default function AppLauncher() {
    const { profile, role, isCustomer, signOut } = useAuth();
    const navigate = useNavigate();

    // Recent activity: last 5 unread in_app_notifications
    const { data: recentNotifs = [] } = useQuery({
      queryKey: ['launcher-notifications'],
      queryFn: async () => {
        const { data } = await supabase
          .from('in_app_notifications')
          .select('id, title, message, created_at, is_read')
          .order('created_at', { ascending: false })
          .limit(5);
        return data ?? [];
      },
    });

    const apps = [
      {
        id: 'docs',
        title: 'Document Vault',
        description: 'Manage customer documents, folders, tasks, and reminders.',
        icon: FileText,
        href: '/docs',
        color: 'from-blue-600 to-blue-800',
        visible: true,
      },
      {
        id: 'ops',
        title: 'Operations Hub',
        description: 'Track vendor issues, incidents, passwords, and escalations.',
        icon: Activity,
        href: '/ops',
        color: 'from-emerald-600 to-emerald-800',
        visible: !isCustomer,
      },
    ];

    return (
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <img src="/ums-logo.png" alt="UMS Hub" className="h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <h1 className="font-bold text-lg leading-none">UMS Hub</h1>
              <p className="text-xs text-muted-foreground">Unified Management Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {role && <Badge variant="outline" className="capitalize">{role}</Badge>}
            {profile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name}</span>
                <Avatar className="h-8 w-8">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-xs">
                    {profile.full_name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-10 max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">Good {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}</h2>
            <p className="text-muted-foreground mt-1">Choose an application to get started.</p>
          </div>

          {/* App cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {apps.filter(a => a.visible).map(app => (
              <Card
                key={app.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 border-2 hover:border-primary/40"
                onClick={() => navigate(app.href)}
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-3`}>
                    <app.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{app.title}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Open {app.title} →</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent activity */}
          {recentNotifs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {recentNotifs.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border ${!n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
  ```

  Files: `src/pages/AppLauncher.tsx`  
  Verify: `npm run build` compiles without errors.

---

- [ ] 18. **Rewrite `src/App.tsx` — unified route structure**

  Replace the existing `src/App.tsx` entirely. The new version:

  1. Keeps all ums-docs-vault providers (`QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `BrowserRouter`, `AuthProvider`, `InactivityWrapper`)
  2. Adds `AppLauncher` at the root `/`
  3. Moves all doc routes under `/docs/*`
  4. Adds all ops routes under `/ops/*`
  5. The root `AuthenticatedRedirect` (currently redirects to `/dashboard` or `/my-documents`) should now redirect to `/` (the AppLauncher) for all roles
  6. The `ProtectedRoute` `allowedRoles` redirects for customers should now go to `/docs/my-documents`

  **Key structure of the new App.tsx:**

  ```tsx
  // Imports: all existing ums-docs-vault page imports with updated paths
  // New imports: AppLauncher + all ops pages

  // Route table:
  // /auth                   → <Auth /> (public)
  // /setup                  → <SetupAdmin /> (public)
  // /                       → AppLauncher (protected, any role)
  // /docs                   → <ProtectedRoute> wraps <AppLayout with <Outlet />>
  //   /docs                 → <Dashboard /> (staff/admin)
  //   /docs/upload          → <Upload />
  //   /docs/documents       → <Documents />
  //   /docs/my-documents    → <MyDocuments />
  //   /docs/search          → <SearchPage />
  //   /docs/customers       → <Customers />
  //   /docs/folders         → <Folders />
  //   /docs/reminders       → <Reminders />
  //   /docs/tasks           → <Tasks />
  //   /docs/chat            → <Chat />
  //   /docs/users           → <Users /> (admin)
  //   /docs/users/:userId/activity → <UserActivityLog /> (admin)
  //   /docs/audit-logs      → <AuditLogs /> (admin)
  //   /docs/categories      → <Categories /> (admin)
  //   /docs/deletion-requests → <DeletionRequests /> (admin)
  //   /docs/notifications   → <Notifications /> (admin/staff)
  //   /docs/in-app-notifications → <InAppNotifications />
  //   /docs/activity        → <ActivityFeed /> (admin)
  //   /docs/reports         → <Reports /> (admin)
  //   /docs/document-expiry → <DocumentExpiry /> (admin/staff)
  //   /docs/storage-analytics → <StorageAnalytics /> (admin)
  //   /docs/activity-heatmap → <ActivityHeatmap /> (admin)
  //   /docs/database-export → <DatabaseExport /> (admin)
  //   /docs/settings        → <Settings />
  // /ops                    → <ProtectedRoute allowedRoles={['admin','staff']}> wraps <AppLayout>
  //   /ops                  → <OpDashboard />
  //   /ops/vendor-issues    → <OpVendorIssues />
  //   /ops/vendor-uptime    → <OpVendorUptime />
  //   /ops/incidents        → <OpIncidents />
  //   /ops/passwords        → <OpPasswords />
  //   /ops/documents        → <OpDocuments />
  //   /ops/analytics        → <OpAnalytics />
  //   /ops/sms-logs         → <OpSmsLogs />
  //   /ops/escalations      → <OpEscalations />
  //   /ops/users            → <OpUserManagement /> (admin only)
  // *                       → <NotFound />
  ```

  **Important implementation notes:**
  - `AppLauncher` does NOT use `AppLayout` (it has its own minimal header). Wrap it in just `<ProtectedRoute>` without a role constraint.
  - The `InactivityWrapper` still wraps all routes as before.
  - The existing `AuthenticatedRedirect` function should redirect to `/` instead of `/dashboard` or `/my-documents`.
  - The existing `AuthPageWrapper` redirects logged-in users to `/` instead of role-split destinations.
  - The `/docs` subtree uses `<AppLayout />` as a nested `<Outlet />` wrapper (same as ums-docs-vault's current pattern, but nested under the `/docs` route).
  - The `/ops` subtree also uses `<AppLayout />` as the layout shell — the same shared layout is correct here since AppLayout + AppSidebar now show both sections.
  - `ProtectedRoute` for ops routes that previously allowed `isAdmin` or `isManager` should use `allowedRoles={['admin', 'staff']}` (since `manager` maps to `staff`).

  Files: `src/App.tsx`  
  Verify: `npm run build` — no TypeScript import errors.

---

- [ ] 19. **Update all internal route references in ums-docs-vault pages**

  All `navigate(...)` and `<Link to="...">` calls inside `src/pages/` and `src/components/` (the docs side) that used bare paths like `/dashboard`, `/documents`, `/my-documents`, etc., must be updated to the `/docs/` prefix.

  **Find-and-replace map (apply across all files in `src/pages/` (excluding `operations/`) and `src/components/` (excluding `operations/`):**

  | Old path | New path |
  |---|---|
  | `to="/dashboard"` | `to="/docs"` |
  | `navigate('/dashboard')` | `navigate('/docs')` |
  | `to="/documents"` | `to="/docs/documents"` |
  | `navigate('/documents')` | `navigate('/docs/documents')` |
  | `to="/my-documents"` | `to="/docs/my-documents"` |
  | `navigate('/my-documents')` | `navigate('/docs/my-documents')` |
  | `to="/upload"` | `to="/docs/upload"` |
  | `navigate('/upload')` | `navigate('/docs/upload')` |
  | `to="/customers"` | `to="/docs/customers"` |
  | `to="/users"` | `to="/docs/users"` |
  | `to="/audit-logs"` | `to="/docs/audit-logs"` |
  | `to="/categories"` | `to="/docs/categories"` |
  | `to="/folders"` | `to="/docs/folders"` |
  | `to="/tasks"` | `to="/docs/tasks"` |
  | `to="/reminders"` | `to="/docs/reminders"` |
  | `to="/chat"` | `to="/docs/chat"` |
  | `to="/search"` | `to="/docs/search"` |
  | `to="/settings"` | `to="/docs/settings"` |
  | `to="/reports"` | `to="/docs/reports"` |
  | `to="/notifications"` | `to="/docs/notifications"` |
  | `to="/deletion-requests"` | `to="/docs/deletion-requests"` |
  | `to="/storage-analytics"` | `to="/docs/storage-analytics"` |
  | `to="/activity-heatmap"` | `to="/docs/activity-heatmap"` |
  | `to="/database-export"` | `to="/docs/database-export"` |
  | `to="/document-expiry"` | `to="/docs/document-expiry"` |
  | `to="/activity"` | `to="/docs/activity"` |

  Also update the `isActive` path checks in `AppSidebar.tsx` — these are handled by the rewrite in step 16.

  Also update `ProtectedRoute.tsx` redirect targets:
  - `<Navigate to="/my-documents" replace />` → `<Navigate to="/docs/my-documents" replace />`
  - `<Navigate to="/dashboard" replace />` → `<Navigate to="/docs" replace />`

  Files: All files in `src/pages/` (excluding `operations/`), all files in `src/components/` (excluding `operations/` and `ui/`)  
  Verify: `npm run build` — no TypeScript errors. Then `npm run dev` and manually navigate to `/` to confirm the launcher loads.

---

- [ ] 20. **Update `src/integrations/supabase/types.ts` — merge schemas**

  The ums-docs-vault `types.ts` needs to be extended with all the new tables added in the migration (step 12). Append the following table types to the existing `Tables` block. This is manually maintained (not auto-generated) until the Supabase CLI can regenerate it against the new project:

  Add these table type definitions inside the `public: { Tables: { ... } }` block:
  - `incidents` (columns: all from migration step 12)
  - `vendor_issues` (columns: all from migration step 12, including uptime columns)
  - `passwords` (columns: all from migration step 12, including ownership columns)
  - `password_renewals`
  - `escalation_levels`
  - `escalations`
  - `escalation_events`
  - `ops_notifications`

  Also extend the `Enums` block: add `app_role` with the full set: `"admin" | "staff" | "customer" | "manager" | "user"`.

  Extend the `Functions` block with: `generate_incident_number`, `get_user_role`.

  The easiest approach: copy the table type definitions from `.agents/temp/uptime-hub/src/integrations/supabase/types.ts` for the tables above (they already have the right shape). For `notifications`, rename it to `ops_notifications`.

  Files: `src/integrations/supabase/types.ts`  
  Verify: `npm run build` compiles without "Property X does not exist on type" errors in ops pages.

---

- [ ] 21. **Update `public/manifest.json`**

  Update the PWA manifest at `public/manifest.json`:
  ```json
  {
    "name": "UMS Hub",
    "short_name": "UMS Hub",
    "description": "UMS Hub — Unified Management Platform",
    "theme_color": "#1e5799",
    "background_color": "#f8fafc",
    "display": "standalone",
    "scope": "/",
    "start_url": "/"
  }
  ```

  Files: `public/manifest.json`  
  Verify: File is valid JSON.

---

- [ ] 22. **Replace old Supabase credentials everywhere**

  Search all files for the old ums-docs-vault project ID `ixdhpeuzpxqlcqctofsd` and old URL `https://ixdhpeuzpxqlcqctofsd.supabase.co`, and replace with `mmnpopwzfjyfasvzzatg` / `https://mmnpopwzfjyfasvzzatg.supabase.co`.

  Also search for the old uptime-hub project ID `bcrzhajeiybglhwfrqye` and replace with `mmnpopwzfjyfasvzzatg`.

  Files to check: `supabase/config.toml`, `.env`, all files in `supabase/functions/` (edge functions may have hardcoded project refs), `src/integrations/supabase/types.ts`, any `.md` files referencing the old URL.

  The auto-escalation cron migration (`20261014120000_auto_escalation_cron.sql`) has `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` placeholders — replace `<PROJECT_REF>` with `mmnpopwzfjyfasvzzatg`. The `<SERVICE_ROLE_KEY>` placeholder must remain as-is (it will be filled in when deploying — this is a secret that should not be in source).

  Files: `supabase/config.toml`, `supabase/migrations/20261014120000_auto_escalation_cron.sql`, all `supabase/functions/*/index.ts`, `src/integrations/supabase/types.ts`  
  Verify: `grep -r "ixdhpeuzpxqlcqctofsd" src/ supabase/` returns no results.

---

- [ ] 23. **Final build verification**

  Run from workspace root:
  ```
  npm run build
  ```

  Expected outcome: Zero TypeScript errors. Vite produces `dist/` directory. There may be warnings about chunk size — these are acceptable as long as `build` exits 0.

  If there are remaining TypeScript errors, fix them:
  - "Cannot find module" errors → fix the import path
  - "Property does not exist" on a Supabase table type → add the missing column to `types.ts`
  - "Type X is not assignable to type Y" on roles → ensure the mapped role union in AuthContext covers all cases

  Then run:
  ```
  npm run lint
  ```

  Expected: No ESLint errors (warnings are acceptable).

  Files: None new — this is a verification step  
  Verify: `npm run build` exits with code 0.

---

- [ ] 24. **Run unit tests**

  ```
  npm run test
  ```

  ums-docs-vault has tests in `src/test/`. They test utility functions (`cn()`, etc.) and should still pass since the underlying utilities are unchanged.

  Files: None  
  Verify: `npm run test` exits with code 0 (or shows only pre-existing failures, not new ones introduced by this merge).

---

## Migration Conflict Summary

| uptime-hub table/type | Action | Reason |
|---|---|---|
| `app_role` enum | Extend existing — add `manager`, `user` values | ums-docs-vault wins, uptime-hub roles are aliases |
| `profiles` | ALTER TABLE ADD COLUMN IF NOT EXISTS (title, department, phone_number, avatar_url) | ums-docs-vault version is richer, just add missing cols |
| `user_roles` | No change | Identical structure, ums-docs-vault version used |
| `documents` | No change — uptime-hub's simple schema is a strict subset | ums-docs-vault rich schema used; OpDocuments.tsx adapted to query compatible columns |
| `sms_logs` | No change — structurally identical | ums-docs-vault version used |
| `notifications` (uptime-hub) | Renamed to `ops_notifications` | ums-docs-vault has `in_app_notifications`; avoid collision |
| `handle_new_user()` trigger | Use ums-docs-vault version — SKIP uptime-hub's | ums-docs-vault's trigger also assigns `customer` role; uptime-hub's assigns `user` role |
| `update_updated_at_column()` | Use ums-docs-vault version — SKIP uptime-hub's | Already exists, same implementation |
| `has_role()` function | Use ums-docs-vault version — SKIP uptime-hub's | Already exists, same implementation |
| Storage bucket `documents` | Use ums-docs-vault version — SKIP uptime-hub's INSERT | Already exists from ums-docs-vault migration 1 |
| `incidents` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| `vendor_issues` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| `passwords` | CREATE TABLE IF NOT EXISTS (new, combined) | Only in uptime-hub |
| `password_renewals` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| `escalation_levels` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| `escalations` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| `escalation_events` | CREATE TABLE IF NOT EXISTS (new) | Only in uptime-hub |
| pg_cron / pg_net extensions | CREATE EXTENSION IF NOT EXISTS | Needed by both |

---

## TypeScript Type Conflicts to Resolve

1. **`AppRole` type** — ums-docs-vault defines `'admin' | 'staff' | 'customer'`; uptime-hub defines `'admin' | 'manager' | 'user'`. Resolution: keep ums-docs-vault's `AppRole` as the canonical type in `AuthContext.tsx`. The DB can contain `manager`/`user` rows; they are mapped to `'staff'` in `AuthContext.fetchUserData` (step 14). The unified `useUserRole` hook exposes `isManager` as an alias.

2. **`Documents` table type** — ums-docs-vault has a rich `documents` row type with `customer_id`, `category_id`, `title`, `file_name`, etc. uptime-hub's `Documents.tsx` expects `name`, `file_path`, etc. Resolution: `OpDocuments.tsx` is adapted in step 15 to use the columns that exist in the merged schema.

3. **`notifications` vs `in_app_notifications`** — uptime-hub's `NotificationBell.tsx` queries `notifications`; ums-docs-vault has `in_app_notifications`. Resolution: ops_notifications table is created (step 12) and `OpNotificationBell.tsx` queries `ops_notifications` (step 15).

4. **`useUserRole` hook return type** — uptime-hub's hook returns `{ role, isAdmin, isManager, loading }`; ums-docs-vault's `useAuth` returns `{ isAdmin, isStaff, isCustomer }`. Resolution: unified `useUserRole.ts` (step 13) returns all fields including `isManager` as an alias for `isStaff`.

---

## File Copy Reference

### Files copied verbatim from ums-docs-vault (step 1)
All of `src/`, `public/`, `supabase/` minus the `.env` and config changes in subsequent steps.

### Files copied/adapted from uptime-hub
| uptime-hub path | Final path | Adaptation |
|---|---|---|
| `src/pages/Dashboard.tsx` | `src/pages/operations/OpDashboard.tsx` | Import paths |
| `src/pages/VendorIssues.tsx` | `src/pages/operations/OpVendorIssues.tsx` | Import paths |
| `src/pages/VendorUptime.tsx` | `src/pages/operations/OpVendorUptime.tsx` | Import paths |
| `src/pages/Incidents.tsx` | `src/pages/operations/OpIncidents.tsx` | Import paths |
| `src/pages/Passwords.tsx` | `src/pages/operations/OpPasswords.tsx` | Import paths |
| `src/pages/Documents.tsx` | `src/pages/operations/OpDocuments.tsx` | Import paths + query column adaptation |
| `src/pages/Analytics.tsx` | `src/pages/operations/OpAnalytics.tsx` | Import paths |
| `src/pages/SmsLogs.tsx` | `src/pages/operations/OpSmsLogs.tsx` | Import paths |
| `src/pages/Escalations.tsx` | `src/pages/operations/OpEscalations.tsx` | Import paths |
| `src/pages/UserManagement.tsx` | `src/pages/operations/OpUserManagement.tsx` | Import paths |
| `src/pages/ForcePasswordChange.tsx` | `src/pages/operations/OpForcePasswordChange.tsx` | Import paths |
| `src/components/StatsCard.tsx` | `src/components/operations/StatsCard.tsx` | Import paths |
| `src/components/ExportMenu.tsx` | `src/components/operations/ExportMenu.tsx` | Import paths |
| `src/components/PageHeader.tsx` | `src/components/operations/PageHeader.tsx` | Import paths |
| `src/components/ChunkErrorBoundary.tsx` | `src/components/operations/ChunkErrorBoundary.tsx` | Import paths |
| `src/components/VendorPicker.tsx` | `src/components/operations/VendorPicker.tsx` | Import paths |
| `src/components/NotificationBell.tsx` | `src/components/operations/OpNotificationBell.tsx` | Import paths + table rename to ops_notifications |
| `src/lib/exportUtils.ts` | `src/lib/exportUtils.ts` | None |
| `src/lib/mask.ts` | `src/lib/mask.ts` | None |
| `supabase/functions/send-sms/` | `supabase/functions/ops-send-sms/` | Directory rename |
| `supabase/functions/notify-sms/` | `supabase/functions/notify-sms/` | None |
| `supabase/functions/password-reminders/` | `supabase/functions/password-reminders/` | None |
| `supabase/functions/escalations/` | `supabase/functions/escalations/` | None |
| `supabase/functions/admin-create-user/` | `supabase/functions/admin-create-user/` | None |
| `supabase/functions/admin-reset-password/` | `supabase/functions/admin-reset-password/` | None |
| `supabase/functions/admin-update-email/` | `supabase/functions/admin-update-email/` | None |
| `supabase/functions/complete-password-change/` | `supabase/functions/complete-password-change/` | None |
| `drizzle/` (full dir) | `drizzle/` | Copy as-is — tooling reference only |

### New files created from scratch
| File | Purpose |
|---|---|
| `package.json` | Merged dependencies, name=ums-hub |
| `vite.config.ts` | Merged config with PWA + build optimisations |
| `.env` | New Supabase project credentials |
| `.env.example` | Template |
| `src/pages/AppLauncher.tsx` | App selection screen at `/` |
| `src/hooks/useUserRole.ts` | Unified role hook |
| `supabase/migrations/20261015000000_ops_schema.sql` | All ops tables |

### Modified files from ums-docs-vault base
| File | Modification |
|---|---|
| `src/App.tsx` | Full rewrite — `/docs/*` and `/ops/*` route trees |
| `src/components/layout/AppSidebar.tsx` | Full rewrite — unified nav with collapsible sections |
| `src/contexts/AuthContext.tsx` | Add role mapping (manager→staff, user→staff) |
| `src/components/ProtectedRoute.tsx` | Update redirect paths (`/docs/my-documents`, `/docs`) |
| `src/integrations/supabase/client.ts` | Dual env var key fallback |
| `src/integrations/supabase/types.ts` | Extend with ops tables |
| `supabase/config.toml` | New project ID + all edge function JWT settings |
| `public/manifest.json` | Name updated to UMS Hub |
| All doc pages/components | Route path prefix changes (`/docs/*`) |
