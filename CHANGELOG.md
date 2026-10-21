# UMS Hub — Changelog

## Overview

**UMS Hub** is a unified management platform that combines two previously separate applications:

1. **Document Vault** (from `ums-docs-vault`) — Customer document management, folders, tasks, reminders, team chat, and admin tools.
2. **Operations Hub** (from `uptime-hub`) — Vendor issue tracking, uptime monitoring, incident reporting, password expiry management, and escalations.

Both apps share a single login, user profile, and Supabase backend.

## Supabase Project

- **Project URL:** `https://mmnpopwzfjyfasvzzatg.supabase.co`
- **Project ID:** `mmnpopwzfjyfasvzzatg`

## Route Structure

| Path | Description |
|---|---|
| `/` | App Launcher — choose Document Vault or Operations Hub |
| `/auth` | Login page (public) |
| `/docs` | Document Vault dashboard (staff/admin) |
| `/docs/upload` | Upload documents |
| `/docs/documents` | All documents |
| `/docs/my-documents` | Customer document view |
| `/docs/customers` | Customer management |
| `/docs/folders` | Private folders |
| `/docs/tasks` | Tasks |
| `/docs/reminders` | Reminders |
| `/docs/chat` | Team chat |
| `/docs/users` | User management (admin) |
| `/docs/settings` | Settings |
| `/ops` | Operations Hub dashboard (staff/admin) |
| `/ops/vendor-issues` | Vendor issue tracking & RCA |
| `/ops/vendor-uptime` | SLA uptime monitoring |
| `/ops/incidents` | Incident reports (Form UMS-INC-01) |
| `/ops/passwords` | Password expiry tracking |
| `/ops/documents` | Ops document storage |
| `/ops/analytics` | Analytics & trends |
| `/ops/sms-logs` | SMS notification logs |
| `/ops/escalations` | Escalation workflows |
| `/ops/users` | Ops user management (admin) |

## Edge Functions

| Function | Purpose |
|---|---|
| `seed-admin` | Bootstrap first admin user |
| `send-sms` | Docs SMS notifications |
| `reset-user-password` | Docs password reset |
| `export-database` | Database export |
| `watermark-download` | Document watermarking |
| `ops-send-sms` | Ops SMS (password reminders) |
| `notify-sms` | Ops event notifications |
| `password-reminders` | Automated password expiry reminders |
| `escalations` | Escalation workflow management |
| `admin-create-user` | Admin user creation |
| `admin-reset-password` | Admin password reset |
| `admin-update-email` | Admin email update |
| `complete-password-change` | Force-password-change flow |

## Release History

### v1.0.0 — Initial Unified Release
- FEAT-001: Scaffolded workspace from ums-docs-vault base, updated Supabase project to mmnpopwzfjyfasvzzatg
- FEAT-002: Integrated all uptime-hub pages, components, edge functions, and DB migrations
- FEAT-003: Unified routing (/docs/*, /ops/*), AppLauncher at /, collapsible sidebar with all sections
- FEAT-004: Merged Supabase type definitions, cleaned up TypeScript, full production build
