# UMS Hub — Authentication & Security

## Auth Flow

UMS Hub uses Supabase Auth (GoTrue) for identity management. All auth state is managed in `src/contexts/AuthContext.tsx` and made available to the entire app via `useAuth()`.

### Sign-In

```
1. User submits email + password on /auth
2. AuthContext.signIn() calls supabase.auth.signInWithPassword()
3. Supabase returns a JWT (access token) + refresh token
4. onAuthStateChange fires, setting session + user in context
5. fetchUserData() is called (deferred with setTimeout to avoid deadlock):
   - Queries user_roles for role
   - Queries profiles for profile data
   - If role === 'customer', queries customers for customerId
6. PasswordExpiryGate checks profiles.must_reset_password
   - If true, user is gated until password is changed via complete-password-change Edge Function
7. MaintenanceGate checks system_settings.maintenance_mode
8. User is redirected to / (AppLauncher)
```

### Session Management

- Supabase JWTs default to 1-hour expiry with automatic silent refresh.
- `supabase.auth.onAuthStateChange()` listens to all token events (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT).
- On TOKEN_REFRESHED: session and user state update automatically.
- On SIGNED_OUT: all state cleared, user redirected to `/auth`.

### Sign-Out

```
1. User clicks Sign Out in sidebar footer
2. AuthContext.signOut() calls supabase.auth.signOut()
3. onAuthStateChange fires with SIGNED_OUT
4. All context state cleared: user, session, role, profile, customerId
5. ProtectedRoute catches null user and redirects to /auth
```

### Inactivity Timeout

Implemented in `src/hooks/useInactivityTimeout.ts`:

- **Timeout:** 15 minutes (`INACTIVITY_TIMEOUT = 15 * 60 * 1000`)
- **Warning:** 1 minute before logout (`WARNING_BEFORE_TIMEOUT = 60 * 1000`)
- **Events tracked:** `mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`, `click`
- **Throttle:** Reset is throttled to max once per second to avoid excessive processing.
- On timeout: `signOut()` is called and a "Session Expired" toast is shown.
- Timer is cleared when user is not logged in.

---

## Role System

### Base Roles

The `app_role` enum defines the core roles. Each user has exactly one row in `user_roles`.

| Role | Access Level |
|---|---|
| `admin` | Full access to all features; can manage users, roles, system settings |
| `staff` | Operational access — documents, tasks, reminders, Operations Hub |
| `customer` | Self-service portal — own documents and shared folders only |
| `manager` | Legacy; mapped to `staff` at runtime in `AuthContext` |
| `user` | Legacy; mapped to `staff` at runtime in `AuthContext` |

**Role mapping in AuthContext:**
```typescript
const rawRole = roleData.role as string;
mappedRole = (rawRole === 'manager' || rawRole === 'user') ? 'staff' : rawRole as AppRole;
```

### Staff Position (secondary classification)

The `staff_position` enum in `profiles` provides a secondary classification for admin/staff users:

| Position | Description |
|---|---|
| `super_admin` | Can access all admin features including system-level tools |
| `hr` | Human Resources |
| `hod` | Head of Department |
| `staff` | Regular staff member |

This field is informational; it does not gate routes. Super admin gating is done by email check (see below).

---

## Super Admin

The email address `amsterntechhub@gmail.com` has special privileges beyond the `admin` role.

### Super Admin Gates

| Feature | Gate |
|---|---|
| Tour Manager (`/docs/tour-manager`) | `requireSuperAdmin` prop on `ProtectedRoute` |
| Database Export (`/docs/database-export`) | Both `ProtectedRoute` (admin role) and `export-database` Edge Function checks `user.email === SUPER_ADMIN_EMAIL` |
| Manage tour definitions | RLS policy: `is_super_admin(auth.uid())` |

### Implementation

In `src/components/ProtectedRoute.tsx`:
```typescript
const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

if (requireSuperAdmin && (user?.email ?? '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
  return <Navigate to="/docs" replace />;
}
```

In `src/components/layout/AppSidebar.tsx`:
```typescript
const isSuperAdmin = (user?.email ?? profile?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
const visibleAdminItems = adminDocItems.filter(i => !i.superAdminOnly || isSuperAdmin);
```

The DB function `is_super_admin(_user_id)` also checks the user's email against this constant for RLS policies.

---

## Custom RBAC System

Beyond the base roles, UMS Hub controls per-app access via the `user_app_access` table:

```sql
user_app_access (user_id, app_id)
-- app_id is 'docs' or 'ops'
```

Admins manage these grants through the **User Hub** page. By default, when a user is created they are granted `docs` access; staff and admins are also granted `ops` access (seeded by the unified user management migration).

The `user_activity_summary` view gives admins a complete picture of each user's activity, role, and app access in one query.

---

## Protected Route Implementation

`src/components/ProtectedRoute.tsx` wraps every route that requires authentication:

```typescript
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];      // if set, user must have one of these roles
  requireSuperAdmin?: boolean;   // if true, user email must be SUPER_ADMIN_EMAIL
}
```

**Logic:**
1. While `loading` is true → show spinner (prevents flash of unauthorised content).
2. If `!user` → redirect to `/auth`.
3. If `allowedRoles` is set and user's role is not in the list:
   - Customers → redirect to `/docs/my-documents`
   - Others → redirect to `/docs`
4. If `requireSuperAdmin` and email doesn't match → redirect to `/docs`.
5. Otherwise render children.

---

## Row Level Security (RLS)

RLS is enabled on every table. Policies use the DB helper functions:
- `auth.uid()` — current user's UUID
- `has_role('admin', auth.uid())` — true if user is admin
- `is_super_admin(auth.uid())` — true if user is super admin
- `has_folder_access(_folder_id, auth.uid())` — true if user owns or has a share
- `is_task_assignee(_task_id, auth.uid())` — true if user is assigned

### Key Policy Patterns

**Own-row only:**
```sql
USING (user_id = auth.uid())
```

**Admin-only write:**
```sql
FOR ALL USING (has_role('admin', auth.uid()))
```

**Admin/staff read:**
```sql
FOR SELECT USING (
  has_role('admin', auth.uid()) OR has_role('staff', auth.uid())
)
```

**Documents — customer can read their own:**
```sql
FOR SELECT USING (
  has_role('admin', auth.uid()) OR
  has_role('staff', auth.uid()) OR
  (has_role('customer', auth.uid()) AND customer_id = get_customer_id_for_user(auth.uid()))
)
```

**Gamification — leaderboard allows any authenticated user to read all XP:**
```sql
ON user_xp FOR SELECT TO authenticated USING (true)
```

---

## Password Expiry Enforcement

### Flow

1. `profiles.password_expiry_days` — configurable per-user (null = never expires).
2. `profiles.password_changed_at` — updated when password is changed.
3. On login, `PasswordExpiryGate` (`src/components/PasswordExpiryGate.tsx`) checks:
   - `profiles.must_reset_password === true` → force change immediately
   - `(now - password_changed_at) > password_expiry_days` → force change
4. User is gated (cannot access any other page) until they set a new password.
5. On submission, `complete-password-change` Edge Function:
   - Updates auth password via admin API
   - Sets `profiles.must_reset_password = false`
   - Sets `profiles.password_changed_at = now()`
6. Admins can manually set `must_reset_password = true` from User Hub to force a reset on next login.

### Password Expiry Banner

`src/components/PasswordExpiryBanner.tsx` shows a non-blocking warning banner when the user's password is expiring within 7 days. Uses `src/hooks/usePasswordExpiry.ts`.

---

## MFA / TOTP

Supabase Auth built-in TOTP multi-factor authentication is exposed via `src/hooks/useMFA.ts`.

### Setup Flow

1. User opens Settings → Security → Enable MFA.
2. `useMFA.enroll()` calls `supabase.auth.mfa.enroll({ factorType: 'totp' })`.
3. Supabase returns a TOTP URI and QR code data.
4. User scans the QR code with their authenticator app.
5. User enters the 6-digit code → `useMFA.challengeAndVerify(factorId, code)`:
   - Creates a challenge: `supabase.auth.mfa.challenge({ factorId })`
   - Verifies it: `supabase.auth.mfa.verify({ factorId, challengeId, code })`
6. Factor is now `status: 'verified'` in `supabase.auth.mfa.listFactors()`.

### Login with MFA

When a user with a verified TOTP factor logs in:
1. Normal email/password sign-in succeeds, but the session has `aal1` assurance level.
2. App detects pending MFA challenge via `supabase.auth.mfa.listFactors()`.
3. MFA challenge dialog is shown.
4. User enters code → `challengeAndVerify()` upgrades the session to `aal2`.

### Unenrol

```typescript
useMFA.unenroll(factorId)  // calls supabase.auth.mfa.unenroll({ factorId })
```

### Hook API

```typescript
const { loading, error, listFactors, enroll, challenge, verify, challengeAndVerify, unenroll } = useMFA();
```

File: `src/hooks/useMFA.ts`

---

## First-Time Setup

The `/setup` route (`src/pages/SetupAdmin.tsx`) is available to unauthenticated users and calls the `seed-admin` Edge Function to create the initial admin account. After creation, navigates to `/auth`.

The `seed-admin` function has `verify_jwt = false` in `supabase/functions/config.toml` so it can be called without a session.
