// src/lib/festiveCalendar.ts
// Central festive date logic for UMS Hub Christmas + New Year features.
// All functions are pure — no side effects, no imports.

export type FestiveGreeting = {
  text: string;
  emoji: string;
} | null;

export type FestiveScene = 'christmas' | 'newyear' | null;

/** Dec 1 – Jan 6 (inclusive) */
export function isSnowPeriod(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1; // 1-based
  const d = date.getDate();
  if (m === 12) return d >= 1;
  if (m === 1) return d <= 6;
  return false;
}

/** Dec 1 – Dec 23 */
export function isAdventPeriod(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return m === 12 && d >= 1 && d <= 23;
}

/** Dec 1 – Dec 26 (countdown card active) */
export function isFestivePeriod(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12) return d >= 1 && d <= 26;
  return false;
}

/** Dec 24 – Dec 26 */
export function isChristmasScene(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return m === 12 && d >= 24 && d <= 26;
}

/** Jan 1 all day */
export function isNewYearScene(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return m === 1 && d === 1;
}

/** Dec 31 23:55 – Jan 1 00:08 */
export function isCountdownPeriod(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  if (m === 12 && d === 31 && h === 23 && min >= 55) return true;
  if (m === 1 && d === 1 && h === 0 && min <= 8) return true;
  return false;
}

/** Dec 26 – Jan 7 */
export function isYearInReview(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12) return d >= 26;
  if (m === 1) return d <= 7;
  return false;
}

/** Jan 1 – Jan 31 */
export function isGoalSetterMonth(date: Date = new Date()): boolean {
  return date.getMonth() + 1 === 1;
}

/**
 * Returns a greeting override for special festive dates,
 * or null if normal greeting should be used.
 */
export function getGreetingOverride(date: Date = new Date()): FestiveGreeting {
  if (isChristmasScene(date)) {
    return { text: 'Merry Christmas', emoji: '🎅' };
  }
  if (isNewYearScene(date)) {
    return { text: 'Happy New Year 2027', emoji: '🎆' };
  }
  return null;
}

/**
 * Returns the special scene for WeatherHero,
 * or null for normal weather display.
 */
export function getFestiveScene(date: Date = new Date()): FestiveScene {
  if (isChristmasScene(date)) return 'christmas';
  if (isNewYearScene(date)) return 'newyear';
  return null;
}

/**
 * Returns the streak emoji appropriate for the date.
 * December → 🎄, Jan 1 → 🎆, otherwise → 🔥
 */
export function getStreakEmoji(date: Date = new Date()): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12) return '🎄';
  if (m === 1 && d === 1) return '🎆';
  return '🔥';
}
