# Onboarding Tours

The onboarding tour system provides guided walkthroughs for new users. Tours are stored in the database, making them editable without a code deployment. The super admin can create, edit, and preview tours from the Tour Manager UI.

---

## Database Tables

### `tour_definitions`

Stores the tour configuration.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `key` | text | Unique slug used to reference the tour (e.g., `platform_welcome`) |
| `name` | text | Human-readable tour name |
| `description` | text | Short description shown in Settings |
| `target_role` | app_role nullable | If set, tour is only shown to this role. `NULL` means all roles |
| `is_active` | boolean | Inactive tours are hidden from users but visible to super admin |
| `steps` | jsonb | Array of step objects (see schema below) |
| `display_order` | integer | Order in the Settings tour list |

### `user_tour_progress`

Tracks each user's progress per tour.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `tour_key` | text | FK → tour_definitions(key) |
| `status` | text | `not_started`, `in_progress`, `completed`, `dismissed` |
| `current_step` | integer | 0-based index of the current step |
| `completed_at` | timestamptz | Set when status = 'completed' |

---

## Step Schema (JSONB)

Each element in the `steps` array:

```json
{
  "title": "Step title",
  "body": "Step description text shown to the user.",
  "selector": "css-selector-or-null",
  "placement": "center | right | left | top | bottom"
}
```

- `selector: null` with `placement: "center"` → **modal** step: centered dialog with a full-screen backdrop
- `selector: "element-id"` with a direction placement → **tooltip** step: spotlight overlay positioned near the target DOM element

---

## Default Tours (seeded by migration)

### 1. `platform_welcome` — Platform Welcome
- **Target role**: All roles (target_role = NULL)
- **Steps**: 5
  1. Welcome to UMS Hub! (modal/center)
  2. Document Vault — card on launcher (tooltip)
  3. Operations Hub — card on launcher (tooltip)
  4. Your Profile — user avatar (tooltip)
  5. You are all set! (modal/center)

### 2. `docs_welcome` — Document Vault Tour
- **Target role**: `admin` (also shown to staff via UI logic)
- **Steps**: 4
  1. Document Vault overview (modal/center)
  2. Upload Documents (modal/center)
  3. Tasks & Reminders (modal/center)
  4. Ready to go! (modal/center)

### 3. `ops_welcome` — Operations Hub Tour
- **Target role**: `staff` (also shown to admin via UI logic)
- **Steps**: 4
  1. Operations Hub overview (modal/center)
  2. Vendor Issues (modal/center)
  3. Incidents with 5-Why RCA (modal/center)
  4. You are ready! (modal/center)

### 4. `customer_welcome` — Customer Portal Tour
- **Target role**: `customer`
- **Steps**: 4
  1. Welcome, Customer! (modal/center)
  2. My Documents (modal/center)
  3. Tasks & Reminders (modal/center)
  4. You are all set! (modal/center)

---

## How Tours Are Triggered

`OnboardingTourProvider` (in `src/hooks/useOnboardingTour.ts`) is mounted inside `InactivityWrapper` in `App.tsx`, making it available across all routes including the App Launcher.

On load, the provider:
1. Fetches `tour_definitions` for the current user's role (active tours only)
2. Fetches `user_tour_progress` for the current user
3. For each tour with no progress record (status = `not_started`), queues it to auto-start
4. Starts the highest-priority queued tour

`TourController` renders the active tour overlay — either a `TourModal` (for center/modal steps) or a `TourTooltip` (for spotlight steps). It handles Next, Previous, Skip, and Finish actions, writing progress back to `user_tour_progress`.

---

## User Controls

Users can manage their tours from **Settings → Onboarding Tours**:

- See the status of each tour (not started / in progress / completed / dismissed)
- **Replay** any completed or dismissed tour — resets progress and re-runs from step 1
- **Dismiss** a tour without completing it

---

## Tour Manager (Admin)

Accessible at `/docs/tour-manager` — super admin only.

Features:
- List all tour definitions with their status and step count
- **Create** a new tour with a step-by-step editor
- **Edit** an existing tour (name, description, target role, steps, active state)
- **Preview** any tour as if you were a new user
- **Reset for all users** — deletes all `user_tour_progress` rows for a given tour key, causing it to re-trigger for everyone on their next login

---

## Adding a New Tour via SQL

```sql
INSERT INTO public.tour_definitions (key, name, description, target_role, is_active, steps, display_order)
VALUES (
  'my_new_tour',
  'My New Feature Tour',
  'Introduces the new feature to staff.',
  'staff',
  true,
  '[
    {"title": "New Feature", "body": "We added something cool.", "selector": null, "placement": "center"},
    {"title": "Find it here", "body": "Look in the sidebar under Documents.", "selector": "sidebar-docs-link", "placement": "right"}
  ]'::jsonb,
  5
);
```
