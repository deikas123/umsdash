# UMS Hub — Project Overview

**UMS Hub** is a unified, role-based management platform for organisations that need to manage customer documents and track operational events in one place. Two full applications are bundled under a single login, database, and UI shell.

## The Two Applications

| App | Path | Purpose |
|---|---|---|
| **Document Vault** | `/docs/*` | Upload, categorise, and share customer documents; manage tasks, reminders, and team chat |
| **Operations Hub** | `/ops/*` | Track vendor issues, uptime, incidents, passwords, escalations, and on-call schedules |

Both apps share the same Supabase project (auth, DB, storage), the same React shell, and the same user accounts. A top-bar app switcher in the sidebar lets staff switch contexts without losing their place.

## Who It's For

- **Admin / Staff** — full access to Document Vault plus Operations Hub  
- **Customer** — self-service portal to view their own documents and shared folders  
- **Super Admin** (`amsterntechhub@gmail.com`) — exclusive access to Tour Manager, Database Export, and system-level settings

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui (Radix UI) |
| Routing | React Router DOM v6 |
| State / Data | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | Supabase (PostgreSQL 14, Auth, Storage, Edge Functions via Deno) |
| SMS | TextSMS Kenya API (`sms.textsms.co.ke`) |
| Export | jsPDF, jspdf-autotable, xlsx |
| PWA | vite-plugin-pwa (Workbox, autoUpdate) |
| Testing | Vitest + Testing Library |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/deikas123/umsdash.git
cd umsdash

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in:
#   VITE_SUPABASE_URL=
#   VITE_SUPABASE_ANON_KEY=
#   VITE_SUPABASE_PUBLISHABLE_KEY=
#   VITE_SUPABASE_PROJECT_ID=

# 4. Push database migrations
npx supabase db push

# 5. Deploy Edge Functions (requires Supabase CLI and project linked)
npx supabase functions deploy

# 6. Set Supabase secrets (for SMS and other integrations)
npx supabase secrets set TEXTSMS_API_KEY=... TEXTSMS_PARTNER_ID=... TEXTSMS_SHORTCODE=...

# 7. Start the development server (port 8080)
npm run dev
```

After the first run, visit `/setup` to create the initial admin account.

## Documentation Index

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level architecture, component hierarchy, app launcher design, sidebar switching |
| [DATABASE.md](./DATABASE.md) | All tables, views, functions, triggers, RLS policies, enums, migration history |
| [FEATURES.md](./FEATURES.md) | Every feature: what it does, URL, role access, key files |
| [API.md](./API.md) | All 17 Edge Functions, TextSMS Kenya, Supabase Storage, Realtime, Web Push, export utilities |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Auth flow, roles, RBAC, super admin, RLS, password expiry, MFA, inactivity timeout |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Environment variables, Supabase setup, migrations, Edge Function deployment, hosting |
| [GAMIFICATION.md](./GAMIFICATION.md) | Streak system, XP, achievements, daily challenges, leaderboard |
| [ONBOARDING.md](./ONBOARDING.md) | Tour types, step types, spotlight tooltip, Tour Manager, user controls |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Project structure, coding conventions, how to add pages/routes/permissions/migrations |

## GitHub Repository

<https://github.com/deikas123/umsdash>
