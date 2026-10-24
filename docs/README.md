# UMS Hub

UMS Hub is a unified management platform for UMS Kenya combining Document Vault (document management) and Operations Hub (vendor/incident tracking) into a single React SPA.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, TanStack Query v5, Tailwind CSS, framer-motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **SMS**: TextSMS Kenya API (`sms.textsms.co.ke`)
- **PWA**: vite-plugin-pwa

## Quick Start

1. Clone: `git clone https://github.com/deikas123/umsdash.git`
2. Install: `npm install`
3. Environment: copy `.env.example` to `.env` and fill values
4. Run: `npm run dev` → http://localhost:8080

## Environment Variables

```
VITE_SUPABASE_URL=https://mmnpopwzfjyfasvzzatg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_PROJECT_ID=mmnpopwzfjyfasvzzatg
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest tests once |
| `npm run lint` | ESLint check |

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Database Schema](DATABASE.md)
- [Feature Reference](FEATURES.md)
- [API & Integrations](API.md)
- [Authentication & Security](AUTHENTICATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Gamification System](GAMIFICATION.md)
- [Onboarding Tours](ONBOARDING.md)
- [Contributing Guide](CONTRIBUTING.md)
