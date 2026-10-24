# Gamification System

The gamification system rewards users for consistent document management activity. It is entirely server-side — XP is awarded by PostgreSQL triggers and `SECURITY DEFINER` functions, so it cannot be manipulated from the browser.

---

## Tables

| Table | Purpose |
|---|---|
| `user_xp` | Current XP total and level per user |
| `upload_streaks` | Daily upload streak tracking |
| `xp_transactions` | Immutable ledger of every XP award |
| `achievements` | Reference table of achievement definitions |
| `user_achievements` | Which achievements each user has unlocked |
| `daily_challenges` | One challenge per calendar day |
| `user_daily_progress` | Per-user progress against the daily challenge |

---

## XP Sources

| Action | XP Awarded | Trigger |
|---|---|---|
| Document upload | 50 XP | `gamification_on_document_upload` trigger on `documents` INSERT |
| Task completed | 30 XP | `gamification_on_task_complete` trigger on `task_assignees` UPDATE WHERE status = 'completed' |
| Reminder completed | 20 XP | `gamification_on_reminder_complete` trigger on `reminders` UPDATE WHERE status = 'completed' |
| Achievement unlocked | achievement.xp_reward | Awarded at the time the achievement is inserted into `user_achievements` |

---

## Level Thresholds

The level is calculated by the `award_xp` function using the formula:

```sql
level = GREATEST(1, floor(1 + sqrt(total_xp::float / 100))::int)
```

Approximate thresholds:

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Rookie |
| 2 | 100 | |
| 3 | 400 | Contributor |
| 5 | 1,600 | |
| 7 | 3,600 | Specialist |
| 10 | 8,100 | Expert |
| 14 | 16,900 | Master |
| 20 | 36,100 | Legend |

The level label displayed in the UI (`GamificationDashboard`) maps approximate ranges:

| XP Range | Label |
|---|---|
| 0 – 199 | Rookie |
| 200 – 499 | Contributor |
| 500 – 999 | Specialist |
| 1,000 – 1,999 | Expert |
| 2,000 – 3,999 | Master |
| 4,000+ | Legend |

---

## Streak Logic

The `process_document_upload(user_id, doc_id)` SECURITY DEFINER function handles streak tracking on every document INSERT:

```
Upload received
  └── Look up upload_streaks for this user
       ├── No row yet → create with current_streak = 1
       ├── last_upload_date = today → same-day re-upload, no change
       ├── last_upload_date = yesterday → consecutive day, increment streak
       └── last_upload_date < yesterday → gap, reset streak to 1
  └── Update longest_streak if current_streak > longest_streak
  └── Award 50 XP via award_xp()
  └── Update daily challenge progress
  └── Check streak milestone achievements
  └── Check volume achievements
```

### Shield Mechanic

> Note: The shield mechanic described in the original design (`streak_shield_available` at day 7) is referenced in the product spec but the current database schema for `upload_streaks` does not include a `streak_shield_available` column. The streak implementation in the migration uses a simple consecutive-day check. The shield feature may be added in a future migration.

---

## Achievements

9 achievements are seeded by the gamification migration. All are checked server-side.

| Key | Name | Icon | XP Reward | Category | Unlock Condition |
|---|---|---|---|---|---|
| `first_upload` | First Upload | 📄 | 50 | upload | Upload your first document |
| `streak_3` | 3-Day Streak | 🔥 | 75 | streak | Upload documents 3 days in a row |
| `streak_7` | Week Warrior | ⚡ | 150 | streak | Upload 7 days in a row |
| `streak_14` | Fortnight Fire | 🏆 | 300 | streak | 14-day upload streak |
| `streak_30` | Monthly Master | 👑 | 500 | streak | 30-day upload streak |
| `uploads_10` | Document Hoarder | 📚 | 100 | volume | Upload 10 total documents |
| `uploads_50` | Archive Legend | 🗄️ | 250 | volume | Upload 50 total documents |
| `task_complete` | Task Crusher | ✅ | 30 | tasks | Complete your first task |
| `reminder_champion` | On Time | ⏰ | 20 | reminders | Complete a reminder on time |

Achievements are awarded with `ON CONFLICT DO NOTHING`, so they can only be earned once per user.

---

## Daily Challenges

One challenge exists per calendar date. Two types alternate:

| Type | Label | Icon | XP |
|---|---|---|---|
| `upload` | Upload a document today | 📤 | 50 |
| `task` | Complete a task today | ✅ | 30 |

The migration seeds the next 7 days on first run. The `run-scheduled-export` edge function (or a cron job) should seed new daily challenges as dates roll over.

`user_daily_progress` tracks each user's progress against the current day's challenge. Once `progress >= target_count`, `completed = true` and the XP is awarded via `award_xp`.

---

## UI Components

The gamification UI lives in `src/components/gamification/` and `src/pages/GamificationDashboard.tsx`:

- **XP Bar** — progress bar showing XP toward next level
- **Level Badge** — current level number and label
- **Streak Widget** — flame icon + current streak count
- **Achievement Gallery** — all 9 achievements, locked/unlocked state
- **Daily Challenge Card** — today's challenge with progress bar
- **XP Leaderboard** — top users by total XP
- **XP Transaction History** — log of recent XP awards

Data is fetched via `useGamification()` hook in `src/hooks/useGamification.ts`.

---

## Notifications

Streak milestone achievements trigger in-app notifications via `insert_in_app_notification_for_user()`:

- 🔥 3-Day Streak → "You've uploaded documents 3 days in a row. Keep it up!"
- ⚡ Week Warrior (7 days) → "Amazing! 7-day upload streak achieved."
- 🏆 Fortnight Fire (14 days) → "You've uploaded documents for 14 days straight!"
- 👑 Monthly Master (30 days) → "Incredible! 30-day upload streak. You are a legend!"
