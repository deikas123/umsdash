# Authentication & Security

## Login Flow

1. User submits email + password on `/auth`
2. `supabase.auth.signInWithPassword({ email, password })` is called
3. On success, `AuthProvider` (in `src/contexts/AuthContext.tsx`) loads:
   - `profiles` record for the user
   - `user_roles` record → `AppRole` enum value
   - `customers` record (if the user is linked to a customer account)
4. If `app_metadata.must_change_password === true`, the user is redirected to the forced password change screen via `PasswordExpiryGate`
5. If MFA is enrolled, `supabase.auth.mfa.challenge()` is triggered before proceeding

The `AuthContext` exposes:
- `user` — raw Supabase `User` object
- `profile` — `profiles` row
- `role` — `AppRole`
- `isAdmin`, `isStaff`, `isCustomer` — convenience booleans
- `customerId` — for customer portal users
- `signOut()` — calls `supabase.auth.signOut()`

---

## AppRole Enum

Defined in the `app_role` PostgreSQL enum and mirrored in the frontend:

| Value | Description |
|---|---|
| `admin` | Full access to all features including admin-only pages |
| `staff` | Access to Document Vault and Operations Hub, no admin tools |
| `customer` | Customer portal only (My Documents, Shared Folders, Tasks, Reminders, Chat) |
| `manager` | Legacy value — treated as `staff` in application layer |
| `user` | Legacy value — treated as `staff` in application layer |

---

## ProtectedRoute

`src/components/ProtectedRoute.tsx` wraps every authenticated route. It checks:

1. **Auth state** — redirects to `/auth` if not logged in
2. **`allowedRoles`** — if specified, user's role must be in the array
3. **`requireSuperAdmin`** — if `true`, only `amsterntechhub@gmail.com` may access

Super admin bypasses all `allowedRoles` checks — it has unrestricted access everywhere.

```tsx
// Example usage in App.tsx
<Route path="/admin/roles" element={
  <ProtectedRoute requireSuperAdmin>
    <RoleManager />
  </ProtectedRoute>
} />
```

---

## Super Admin

The super admin email is `amsterntechhub@gmail.com`. This identity:

- Bypasses all `allowedRoles` checks in `ProtectedRoute`
- Is the only account that can access `/admin/roles` (Role Manager)
- Is the only account that can access `/docs/tour-manager` (Tour Manager)
- Is the only account that can access `/docs/database-export` (Database Export)
- Can see super-admin-only sidebar items
- Is identified in `AppSidebar` via `SUPER_ADMIN_EMAIL` constant comparison against `user.email`
- Database function `is_super_admin(user_id)` returns `true` for this account and is used in RLS policies

---

## Custom RBAC

On top of the base `app_role` system, UMS Hub provides a custom RBAC layer managed from `/admin/roles`.

**Tables involved**:
- `custom_roles` — role definitions (name, display_name, base_role, color, permissions)
- `role_permissions` — individual permission keys granted to a role
- `user_custom_roles` — assignment of custom roles to users

**Hooks**:
- `useRBAC()` (`src/hooks/useRBAC.ts`) — loads the current user's custom roles and their permission keys
- `usePermission(key)` — returns `true` if the user holds a custom role that includes the given permission key

**RoleManager UI** (`/admin/roles`):
- Super admin creates and edits custom roles
- Assigns permission keys (e.g., `documents.delete`, `reports.export`) from a predefined list
- Assigns/removes custom roles from specific users

---

## Password Expiry

`PasswordExpiryGate` wraps all protected routes. On every navigation it checks:

1. `profiles.must_reset_password === true` — set by admin when resetting a user's password
2. `app_metadata.must_change_password === true` — set by the `admin-reset-password` edge function

If either flag is set, the user sees a mandatory password change dialog. They cannot navigate anywhere else until they complete the change via the `complete-password-change` edge function.

Optional per-user password expiry is configured via `profiles.password_expiry_days`. When set, `usePasswordExpiry` (`src/hooks/usePasswordExpiry.ts`) calculates whether the password has expired relative to `profiles.password_changed_at`.

---

## MFA (TOTP)

MFA enrollment and challenge use the `supabase.auth.mfa.*` API:

- **Enrollment**: Settings → Security → Enable Two-Factor Authentication. Calls `supabase.auth.mfa.enroll({ factorType: 'totp' })`, displays QR code and backup codes.
- **Challenge on login**: After password verification, if a TOTP factor is enrolled, `supabase.auth.mfa.challenge({ factorId })` is called, then `supabase.auth.mfa.verify({ factorId, challengeId, code })` validates the OTP.
- `useMFA()` (`src/hooks/useMFA.ts`) — manages the enrollment state.

---

## Inactivity Timeout

`useInactivityTimeout()` is mounted inside `InactivityWrapper` in `App.tsx`. It:

1. Listens for `mousemove`, `mousedown`, `keypress`, `scroll`, and `touchstart` events
2. Resets a timer on each event
3. After a configurable idle period (loaded from `system_settings`), calls `supabase.auth.signOut()` and redirects to `/auth`

The timeout duration is admin-configurable via `system_settings` key `session_timeout_minutes`.

---

## Row Level Security

All tables have RLS enabled. Key policy patterns:

- Users can only read/write their own rows (e.g., `user_id = auth.uid()`)
- Admin-only tables check `has_role('admin', auth.uid())` or `is_super_admin(auth.uid())`
- Reference tables (achievements, tour_definitions when active) are readable by all authenticated users
- The `documents` bucket uses Storage policies that mirror document RLS

The DB functions `get_user_role()`, `has_role()`, and `is_super_admin()` are `SECURITY DEFINER` and used throughout RLS policies to avoid privilege escalation.

---

## Session Management

Sessions page (`/docs/sessions`) shows active Supabase Auth sessions. Users can revoke individual sessions. Supabase JWT access tokens expire after the configured token lifetime (default 1 hour), with silent refresh using the refresh token.
