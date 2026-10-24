# UMS Hub — Gamification System

The gamification system rewards users for productive activity. It covers document uploads, task and reminder completions, streaks, achievements, daily challenges, and a leaderboard.

## Database Tables

| Table | Purpose |
|---|---|
| `user_xp` | Cumulative XP and level per user |
| `upload_streaks` | Consecutive upload day tracker |
| `achievements` | Achievement definitions (seed data) |
| `user_achievements` | Earned achievements per user |
| `daily_challenges` | One challenge per calendar date |
| `user_daily_progress` | Per-user daily challenge progress |
| `xp_transactions` | Immutable XP event log |

---

## XP System

### XP Sources

| Action | XP Awarded | Trigger |
|---|---|---|
| Upload a document | +50 XP | DB trigger on `documents` INSERT → `process_document_upload()` |
| Complete a task | +30 XP | DB trigger on `task_assignees` UPDATE (status → `completed`) |
| Complete a reminder | +20 XP | DB trigger on `reminders` UPDATE (status → `completed`) |
| Unlock an achievement | Varies | Inserted by gamification functions |

### Level Calculation

Level is computed inline whenever XP is awarded:

```sql
level = GREATEST(1, floor(1 + sqrt(total_xp::float / 100))::int)
```

| Total XP | Level |
|---|---|
| 0 | 1 |
| 100 | 2 |
| 400 | 3 |
| 900 | 4 |
| 1600 | 5 |
| 2500 | 6 |
| … | … |

### XP Award Function

`award_xp(p_user_id, p_amount, p_reason, p_ref_id)` — `SECURITY DEFINER` function called from triggers and other SECURITY DEFINER functions. It:
1. Inserts a row in `xp_transactions`.
2. UPSERTs `user_xp` — adds to `total_xp` and recalculates `level`.

---

## Streak System

### How Streaks Work

The `upload_streaks` table stores `current_streak`, `longest_streak`, and `last_upload_date` per user.

The `process_document_upload()` function (called by the `gamification_on_document_upload` trigger on every document INSERT) evaluates the streak:

| Condition | Result |
|---|---|
| No existing streak row | Start at streak = 1 |
| `last_upload_date = CURRENT_DATE` | Same-day re-upload — streak unchanged |
| `last_upload_date = CURRENT_DATE - 1` | Consecutive day — `current_streak + 1` |
| `last_upload_date` more than 1 day ago | Streak reset to 1 |

`longest_streak` is updated whenever `current_streak` exceeds it.

### Shield Mechanic

There is no automated streak shield in the current implementation. Streak protection (preventing a reset on a missed day) would need to be added as a new feature. Currently, any gap of more than one calendar day resets the streak to 1.

---

## Achievements

Nine achievements are seeded. Achievement unlock logic runs inside `process_document_upload()` and the task/reminder trigger functions.

### Achievement Catalogue

| Key | Name | Icon | Category | Condition | XP Reward |
|---|---|---|---|---|---|
| `first_upload` | First Upload | 📄 | upload | Upload first document | 50 |
| `streak_3` | 3-Day Streak | 🔥 | streak | 3 consecutive upload days | 75 |
| `streak_7` | Week Warrior | ⚡ | streak | 7 consecutive upload days | 150 |
| `streak_14` | Fortnight Fire | 🏆 | streak | 14 consecutive upload days | 300 |
| `streak_30` | Monthly Master | 👑 | streak | 30 consecutive upload days | 500 |
| `uploads_10` | Document Hoarder | 📚 | volume | 10 total uploads | 100 |
| `uploads_50` | Archive Legend | 🗄️ | volume | 50 total uploads | 250 |
| `task_complete` | Task Crusher | ✅ | tasks | Complete first task | 30 |
| `reminder_champion` | On Time | ⏰ | reminders | Complete a reminder | 20 |

### Unlock Mechanism

All unlocks use `INSERT … ON CONFLICT DO NOTHING` on `user_achievements` to ensure idempotency — each achievement can only be earned once per user.

Streak achievements also trigger in-app notifications when first earned (using `insert_in_app_notification_for_user()`).

### Adding New Achievements

1. Insert a new row into `achievements` via migration.
2. Add unlock logic to the appropriate trigger function or a new SECURITY DEFINER function.
3. Grant execute on any new function to `authenticated`.

---

## Daily Challenges

### How They Work

The `daily_challenges` table has one row per calendar date with a `type` (e.g. `upload` or `task`), `target_count`, and `xp_reward`.

`user_daily_progress` tracks each user's progress against today's challenge:
- `progress` counts how many qualifying actions the user has performed today.
- `completed = true` when `progress >= target_count`.
- `completed_at` is set the first time `completed` flips to `true`.

### Challenge Rotation Logic

The migration seeds 7 days ahead with alternating types:

```sql
-- Even days: upload challenge (50 XP)
-- Odd days: task challenge (30 XP)
```

In production, a cron job should call a function or SQL to seed new daily challenge rows to keep the table populated. Currently, the seeding only runs at migration time and covers 7 days.

### Tracking Progress

Progress is incremented automatically by the gamification trigger functions:

- `process_document_upload()` increments `user_daily_progress.progress` when today's challenge `type = 'upload'`.
- Task/reminder triggers do not yet increment daily challenge progress for `task`-type challenges (this is a gap to address if needed).

---

## Leaderboard

The leaderboard shows the top 10 users by `user_xp.total_xp`.

### Ranking Logic

```sql
SELECT total_xp, level, user_id, profiles!inner(full_name, avatar_url)
FROM user_xp
ORDER BY total_xp DESC
LIMIT 10
```

### Weekly Reset

There is no automated weekly reset in the current implementation. The leaderboard shows all-time totals. To add weekly resets, create a new `user_xp_weekly` table populated by a cron job that resets every Monday.

---

## Hook & Component Reference

### Hooks

| Hook | File | Purpose |
|---|---|---|
| `useGamification()` | `src/hooks/useGamification.ts` | Fetch user's XP, streak, achievements, XP transactions; realtime subscription on `user_xp` |
| `useLeaderboard()` | `src/hooks/useGamification.ts` | Fetch top-10 leaderboard |
| `useDailyChallenge()` | `src/hooks/useGamification.ts` | Fetch today's challenge and user's progress |
| `useStreakWidget()` | `src/hooks/useStreakWidget.ts` | Lightweight streak display data for sidebar/dashboard |

### Components

| Component | Location | Purpose |
|---|---|---|
| `GamificationDashboard` | `src/pages/GamificationDashboard.tsx` | Full gamification page |
| Gamification components | `src/components/gamification/` | Individual widgets (XP bar, streak card, achievement badge, leaderboard row, etc.) |

### Realtime

The `useGamification` hook subscribes to `user_xp` changes via Supabase Realtime (`postgres_changes` on INSERT/UPDATE/DELETE filtered to `user_id = <current>`). Any XP award triggers a refetch, so the UI updates immediately without polling.

---

## XP Transaction Log

Every XP award is recorded immutably in `xp_transactions`:

```
amount  | reason                | ref_id (related record)
--------|------------------------|------------------------
50      | document_upload       | <document_id>
30      | task_completed        | <task_id>
20      | reminder_completed    | <reminder_id>
```

Users can view their XP history on the My Progress page (`/docs/gamification`).
