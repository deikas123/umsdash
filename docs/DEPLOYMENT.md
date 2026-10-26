# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`npm install -g supabase` or included as a dev dependency)
- Git

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** from Settings → API
3. Note your **Project Ref** (e.g., `mmnpopwzfjyfasvzzatg`) from Settings → General

---

## 2. Configure Environment Variables

Create `.env` in the workspace root (copy from `.env.example` if it exists):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

These variables are embedded into the Vite build at build time. They are **not secret** — the anon key is safe to expose in the browser because database access is controlled by Row Level Security.

---

## 3. Run Database Migrations

Link the CLI to your project and push all migrations:

```bash
supabase link --project-ref mmnpopwzfjyfasvzzatg
supabase db push
```

This runs all SQL files in `supabase/migrations/` in chronological order, creating all tables, functions, triggers, RLS policies, and seed data.

To verify:

```bash
supabase db diff
```

---

## 4. Deploy Edge Functions

Deploy all 17 Edge Functions:

```bash
supabase functions deploy --project-ref mmnpopwzfjyfasvzzatg
```

To deploy a single function:

```bash
supabase functions deploy send-sms --project-ref mmnpopwzfjyfasvzzatg
```

---

## 5. Set Edge Function Secrets

Set the TextSMS Kenya credentials and any other secrets:

```bash
supabase secrets set \
  TEXTSMS_API_KEY=your_textsms_api_key \
  TEXTSMS_PARTNER_ID=your_partner_id \
  TEXTSMS_SHORTCODE="UMS PREPAID" \
  --project-ref mmnpopwzfjyfasvzzatg
```

Verify secrets are set:

```bash
supabase secrets list --project-ref mmnpopwzfjyfasvzzatg
```

The following secrets are automatically available in all Edge Functions and do not need to be set manually:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## 6. Configure Storage Buckets

Create the four private buckets in Supabase Dashboard → Storage (or via migrations):

| Bucket | Public |
|---|---|
| `documents` | No |
| `task-files` | No |
| `avatars` | No |
| `db-exports` | No |

Storage policies are defined in the migrations. If they were not applied automatically, create them from the Storage → Policies tab matching the RLS rules in the migrations.

---

## 7. Set Up Cron Jobs

Two Edge Functions need to run on a schedule. Set them up in Supabase Dashboard → Database → Extensions → pg_cron, or via the SQL editor:

```sql
-- Auto-advance overdue escalations every 15 minutes
SELECT cron.schedule(
  'auto-escalation',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/escalations',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}',
    body := '{"action":"auto_advance"}'
  )$$
);

-- Password expiry reminders daily at 8am EAT (5am UTC)
SELECT cron.schedule(
  'password-reminders',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/password-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}',
    body := '{}'
  )$$
);
```

---

## 8. Seed the First Admin User

After deploying, navigate to `https://your-domain.com/setup` to create the first admin account. This calls the `seed-admin` Edge Function which creates the user in Supabase Auth and sets their role to `admin`.

This endpoint only works once — if an admin already exists, it returns an error.

---

## 9. Build the Frontend

```bash
npm install
npm run build
```

This produces a `dist/` directory containing the static SPA. The PWA service worker is generated automatically by `vite-plugin-pwa`.

---

## 10. Deploy to Hosting

### Vercel

Create `vercel.json` in the project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

Then deploy:

```bash
npx vercel --prod
```

Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables (same as `.env` above).

### Netlify

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

In Netlify, open **Site configuration → Environment variables** and add:

- `VITE_SUPABASE_URL` — the Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the project's publishable/anon key

Alternatively, set `VITE_SUPABASE_ANON_KEY` instead of
`VITE_SUPABASE_PUBLISHABLE_KEY`. These values must be available to the build;
adding them only at runtime will not work because Vite embeds them during
`npm run build`. Trigger a new deploy after saving the variables.

### Nginx (VPS)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/umsdash/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

The key requirement for all hosting: **all URLs must serve `index.html`** to support React Router's client-side routing.

---

## 11. PWA Configuration

`vite-plugin-pwa` generates the service worker and web app manifest during `npm run build`. No additional configuration is needed for basic PWA support (install prompt, offline shell).

To customize the PWA manifest (name, icons, theme color), edit `vite.config.ts` and update the `pwa` plugin options.

---

## Updating the Application

```bash
git pull origin master
npm install          # if package.json changed
npm run build
# redeploy dist/ to your hosting provider
```

For database changes:

```bash
supabase db push --project-ref mmnpopwzfjyfasvzzatg
```

For Edge Function changes:

```bash
supabase functions deploy <function-name> --project-ref mmnpopwzfjyfasvzzatg
```
