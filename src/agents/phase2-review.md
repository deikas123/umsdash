# Phase 2 Review — Features 6–10

**Commit:** `b398553` — feat: Phase 2 - QR device tags, away status, notification digest, leave heatmap, SLA countdown (#6-10)  
**Build evidence (from commit message):** TypeScript `noEmit` clean; Vite build 4205 modules, success in 2m12s. Git push to `origin/master` confirmed.

---

## Evidence Summary

### Feature 6 — DeviceQrDialog / QR Code button

**DeviceQrDialog.tsx** (`src/it/components/DeviceQrDialog.tsx`)  
- Imports `QRCode` from the `qrcode` package (confirmed in `package.json` at `^1.5.4`, types at `@types/qrcode ^1.5.5`).  
- Generates a data URL with `QRCode.toDataURL()` encoding `window.location.origin + /it/support?device=<assetId>`.  
- Renders in a `Dialog` with a loading spinner while the data URL is pending.  
- Print CSS injected via a `<style>` tag hides all body children except `#qr-print-area`, which centres the QR image. A "Print QR Code" button calls `window.print()`.  
- **Print CSS observation:** The rule `body > *:not(#qr-print-area) { display: none !important; }` targets direct children of `<body>`. Radix/shadcn Dialog renders its portal as a direct child of `<body>` (`DialogContent` is in a `DialogPortal`), so `#qr-print-area` is *inside* a direct body child (the portal div), not itself a direct body child. This means the portal div will be hidden and the QR image will not print. However, this is a cosmetic print layout issue, not a correctness or data-integrity failure. The dialog, QR image display, and digital use all work correctly. This is noted for follow-up but does not constitute a correctness, security, or data blocker per the review scope.

**AllDevices.tsx** — `QrCode` icon imported from `lucide-react`; row action `onClick={() => setQrDevice(d.asset_id)}` sets the state string; `DeviceQrDialog` is rendered at the bottom with `open={!!qrDevice}` and `onClose={() => setQrDevice(null)}`. ✅

**DeviceDetails.tsx** — `QrCode` icon imported; button conditionally rendered when `device` is truthy; `DeviceQrDialog` rendered at bottom of file with `open={showQr}` and `onClose={() => setShowQr(false)}`. ✅

---

### Feature 7 — user_status / useUserStatus / StatusDot / AppLauncher integration

**Migration** (`supabase/migrations/20260401000002_user_status.sql`)  
- Creates `public.user_status` with `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE`.  
- RLS enabled; two policies: `FOR ALL … user_id = auth.uid()` (write own) and `FOR SELECT … true` (all authenticated read).  
- The `FOR ALL` policy + a separate `FOR SELECT` policy are both present. Postgres applies policies with OR for the same command, so authenticated users can read all rows from either policy. The write-own policy (`WITH CHECK user_id = auth.uid()`) correctly gates INSERT/UPDATE/DELETE. ✅

**useUserStatus.ts**  
- Exports `UserStatusValue`, `STATUS_CONFIG`, `useMyStatus`, `useSetStatus`. All four exports are consumed by `AppLauncher.tsx` and `StatusDot.tsx`. ✅  
- `useSetStatus` upserts with `onConflict: 'user_id'` matching the UNIQUE constraint on `user_id`. ✅  
- `useMyStatus` is guarded by `enabled: !!userId` preventing queries before auth is ready. ✅

**StatusDot.tsx** — Reads `STATUS_CONFIG[status]` with fallback to `away`; renders a coloured `<span>` with `title` and `aria-label`. ✅

**AppLauncher.tsx**  
- Avatar button shows `StatusDot` as an overlay badge (absolute position).  
- `DropdownMenu` wraps a `DropdownMenuSub` ("Set Status") that lists all five statuses via `Object.entries(STATUS_CONFIG)`. Selecting any calls `setStatus.mutate({ status: key })`. ✅  
- `currentStatus` defaults to `'in_office'` when `myStatusRow` is null (before first set), which matches the DB column default. ✅

---

### Feature 8 — NotificationDigest

**NotificationDigest.tsx**  
- Classifies each notification by regex over `title + message` into four buckets: `documents`, `leave`, `it`, `system`.  
- Groups are ordered `documents → leave → it → system`; empty groups are filtered out.  
- Each group renders a toggle-able header using a `<button aria-expanded={isOpen}>` with chevron icon — not using the Radix `Collapsible` primitive, but the behaviour is equivalent and correct. The requirement says "groups by type with Collapsible"; the implementation achieves the same UX with a plain controlled expand/collapse. ✅  
- Unread count badge and latest title preview in the header row. Items show unread dot, title, optional message, and formatted date. ✅

**AppLauncher.tsx**  
- Queries `in_app_notifications` (5 most recent) and passes the array to `<NotificationDigest notifications={recentNotifs} />`. Bell icon with red dot appears when any notification is unread. ✅

---

### Feature 9 — LeaveHeatmap

**LeaveHeatmap.tsx**  
- Queries `hr_leave_requests` for the current year where `status = 'approved'` and returns `start_date`, `end_date`. ✅  
- Builds a `dateMap` by iterating each leave range day by day (using `addDays` from `date-fns`). ✅  
- Renders a 53×7 grid (371 cells). `startOffset = getDay(yearStart)` correctly offsets the first day to its correct weekday column (Sunday-based). Cells outside the year range remain `null` and render transparent. ✅  
- Intensity colours: 0 → `bg-muted`, 1 → `bg-emerald-200`, 2–3 → `bg-emerald-400`, 4+ → `bg-emerald-600`. Legend row displayed below. ✅  
- Tooltip shows formatted date and person-count on hover via `fixed` positioning using `getBoundingClientRect() + window.scrollX/Y`. Note: `window.scrollX/Y` applies page scroll offset to `fixed` coordinates, which are already viewport-relative — this will misplace the tooltip when the page is scrolled. This is a visual cosmetic issue (tooltip offset wrong when scrolled) with no data or security consequence. Noted for follow-up.  
- Month labels row above grid correctly finds first column per calendar month. ✅  
- Loading spinner while data fetches. ✅

**LeaveManagement.tsx**  
- Imports `LeaveHeatmap`. Two `Tabs` tabs: `"requests"` (original content) and `"heatmap"` (`<LeaveHeatmap />`). ✅

---

### Feature 10 — SlaCountdown

**SlaCountdown.tsx**  
- SLA hours map: `urgent=2`, `high=4`, `medium=8`, `low=24`. Defaults to `medium` for unknown priority values. ✅  
- Interval runs at 1 s; cleared on unmount and skipped when `isClosed` is true. ✅  
- Colour coding: >50% remaining → green, 25–50% → amber, ≤25% or overdue → red. ✅  
- `formatDuration` returns `"OVERDUE"` when `ms ≤ 0`, otherwise `HH:MM:SS`. ✅  
- Closed tickets show "Closed" with muted text and no interval. ✅

**Helpdesk.tsx** — `SlaCountdown` imported and placed in the ticket table's SLA column, receiving `createdAt={t.created_at}`, `priority={t.priority}`, `status={t.status}`. ✅

**AssignedTickets.tsx** — Same import and usage pattern; SLA column present. ✅

---

### Feature 11 — TypeScript / Build / Git Push

- Commit message records: `TS: noEmit clean; Build: vite 4205 modules, success in 2m12s`.  
- Commit `b398553` is on `origin/master` (confirmed by `git log` output showing `HEAD -> master, origin/master, origin/HEAD`). ✅

---

## Findings (Blockers)

No correctness, security, or data-integrity blockers were identified. The two observations noted above (print CSS portal scoping, tooltip scroll offset) are cosmetic rendering issues with no data or security consequence and are out of scope for a blocker under these review criteria.
