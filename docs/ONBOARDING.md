# UMS Hub — Onboarding Tour System

The onboarding tour system guides new users through the platform. Tours are stored in the database, managed by the super admin, and auto-start on first login.

## Tour Types

Four tours are seeded by default:

| Key | Name | Target Role | Description |
|---|---|---|---|
| `platform_welcome` | Platform Welcome | All roles (null) | 5-step intro to the App Launcher, apps, and user profile |
| `docs_welcome` | Document Vault Tour | admin | 4-step walkthrough of Document Vault for admin/staff |
| `ops_welcome` | Operations Hub Tour | staff | 4-step walkthrough of Operations Hub |
| `customer_welcome` | Customer Portal Tour | customer | 4-step intro for customer portal users |

**Role filter:** `target_role = null` means the tour is shown to all roles. A specific value restricts the tour to that role only. The client filters tours after fetching:

```typescript
const filtered = defs.filter(
  t => t.is_active && (t.target_role === null || t.target_role === role)
);
```

---

## When Tours Trigger

### Auto-start

600ms after a user logs in, `OnboardingTourProvider` checks for the first tour with `status = 'not_started'` (or no progress row). That tour starts automatically. Only one tour auto-starts per session — subsequent eligible tours queue for the next login.

```typescript
// In useOnboardingTour.ts
useEffect(() => {
  if (loading || !user || isOpen || !queryData) return;
  const timer = setTimeout(() => {
    const first = queryData.tours.find(tour => {
      const prog = progress[tour.key];
      return !prog || prog.status === 'not_started';
    });
    if (first) startTour(first.key);
  }, 600);
}, [queryData, user]);
```

### Manual start

Users can replay any tour from **Settings → Onboarding Tours** → "Replay" button. This calls `resetTour(key)` followed by `startTour(key)`.

### Admin reset

Super admin can reset a specific user's tour progress from **Tour Manager** (`/docs/tour-manager`).

---

## Tour Step Types

Each tour step is a JSON object in the `steps` array of `tour_definitions.steps`:

```typescript
type TourStep = {
  title: string;         // Step heading
  body: string;          // Step body text
  selector: string | null; // CSS data-tour attribute value, or null for modal
  route?: string | null;   // Optional: navigate to this route before showing step
  placement?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};
```

### Modal Step (selector = null)

When `selector` is `null`, the step renders as a centred dialog overlay on top of the page content. Used for introductory and closing steps that don't point at a specific element.

### Spotlight Tooltip Step (selector = string)

When `selector` is a non-null string (e.g. `'docs-vault-card'`), the `TourController` looks for a DOM element with `data-tour="<selector>"`. It renders a spotlight (darkened overlay with a cutout around the target) and positions a tooltip adjacent to it using the `placement` value.

Elements that can be targeted must have the `data-tour` attribute and the `tour-target` CSS class:

```tsx
<Card data-tour="docs-vault-card" className="tour-target">
```

**Existing `data-tour` targets in the codebase:**

| Selector | Element | Location |
|---|---|---|
| `app-launcher` | Entire App Launcher page | `AppLauncher.tsx` |
| `docs-vault-card` | Document Vault app card | `AppLauncher.tsx` |
| `ops-hub-card` | Operations Hub app card | `AppLauncher.tsx` |
| `app-store-card` | App Store card | `AppLauncher.tsx` |
| `user-avatar` | User avatar in header/launcher | `AppLayout.tsx`, `AppLauncher.tsx` |

---

## Spotlight Tooltip Implementation

`src/components/onboarding/TourController.tsx` renders the active tour overlay:

1. Reads `activeTour`, `currentStep`, and `isOpen` from `OnboardingTourContext`.
2. If the current step has a `selector`, finds `document.querySelector('[data-tour="<selector>"]')`.
3. Computes the element's `getBoundingClientRect()`.
4. Renders a full-screen dark overlay with a transparent cutout over the target element.
5. Positions a tooltip card adjacent to the cutout according to `placement`.
6. If `route` is set on the step, the tour navigates to that route before showing the step.

For modal steps (no selector), a centred dialog is shown with the page dimmed.

---

## Tour Progress States

Each `user_tour_progress` row tracks one user's journey through one tour:

| Status | Meaning |
|---|---|
| `not_started` | No progress row, or row with this status |
| `in_progress` | Tour started but not finished |
| `completed` | User clicked through all steps |
| `dismissed` | User closed the tour without completing it |

`completed` and `dismissed` tours do not auto-start again. `not_started` tours are eligible for auto-start. `in_progress` tours also auto-start (they resume, but currently restart from step 0).

---

## Admin Tour Manager

**URL:** `/docs/tour-manager`  
**Access:** Super admin only (`requireSuperAdmin` on `ProtectedRoute`)

The Tour Manager (`src/pages/TourManager.tsx`) allows the super admin to:

1. **View all tour definitions** — name, key, target role, active status, step count.
2. **Edit tour steps** — JSON editor for the `steps` JSONB array. Changes are saved back to `tour_definitions`.
3. **Toggle active status** — deactivate a tour so it won't be shown to users.
4. **View user progress** — see which users have completed, dismissed, or are in progress for each tour.
5. **Reset a user's progress** — sets `user_tour_progress.status = 'not_started'` so the tour auto-starts again for that user on next login.

**RLS on `tour_definitions`:**
- Authenticated users: SELECT (active tours only, or all if super admin)
- Super admin: ALL (INSERT, UPDATE, DELETE)

---

## User Controls

### Replay from Settings

Users can manage their own tour progress from `/docs/settings` → **Onboarding Tours** section:

- Lists all active tours relevant to the user's role.
- Shows current status (completed, dismissed, in progress, not started).
- **Replay** button calls `resetTour(key)` then `startTour(key)`.

### Skip / Dismiss

During a tour:
- **Previous / Next** buttons navigate between steps.
- **Skip** or the **×** close button calls `dismiss()`, which sets `status = 'dismissed'` in DB.
- Closing the tour (clicking overlay or pressing Escape) calls `close()`, which hides the UI but does NOT change the DB status — the tour remains `in_progress` and will auto-start again next time.

### Complete

When the user clicks **Next** on the last step, `complete()` is called, setting `status = 'completed'` and `completed_at = now()`.

---

## Adding New Tours

1. Insert a new row into `tour_definitions` via migration or Tour Manager:

```sql
INSERT INTO public.tour_definitions (key, name, description, target_role, is_active, steps, display_order)
VALUES (
  'my_new_tour',
  'My New Feature Tour',
  'Introduces the new feature.',
  'staff',     -- or null for all roles
  true,
  '[
    {"title": "Step 1", "body": "Welcome to the new feature.", "selector": null, "placement": "center"},
    {"title": "Step 2", "body": "Click here to get started.", "selector": "my-feature-element", "placement": "right"}
  ]'::jsonb,
  10           -- display_order (higher = starts later)
);
```

2. Add `data-tour="my-feature-element"` and `className="tour-target"` to the target element in the React component.

3. The tour will auto-start for eligible users on their next login (after any higher-priority tours are done).
