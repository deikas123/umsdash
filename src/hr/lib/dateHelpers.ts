/** Date utilities: weekend + public-holiday-aware day counting. */

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Counts working days in [start, end] inclusive, excluding weekends and any dates in `holidays`. */
export function countWorkingDays(start: string, end: string, holidays: string[] = []): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
  const holidaySet = new Set(holidays);
  let days = 0;
  const current = new Date(s);
  while (current <= e) {
    const iso = current.toISOString().slice(0, 10);
    if (!isWeekend(current) && !holidaySet.has(iso)) days++;
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Returns true if the given ISO date string is a weekend or a public holiday. */
export function isNonWorkingDay(dateIso: string, holidays: string[] = []): boolean {
  const d = new Date(dateIso);
  if (isWeekend(d)) return true;
  return holidays.includes(dateIso);
}

/** Extract date of birth from a Kenyan ID number if encoded; otherwise return null. */
export function dobFromKenyanId(_idNumber: string | null | undefined): string | null {
  // Kenyan national IDs do not consistently encode DOB in a parseable form,
  // so we rely on the explicit date_of_birth column. Helper kept for future expansion.
  return null;
}

/** Returns YYYY-MM-DD for today. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Days until the next anniversary of a date-of-birth, ignoring year. */
export function daysUntilBirthday(dob: string, now: Date = new Date()): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return Infinity;
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  const target = thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())
    ? new Date(now.getFullYear() + 1, d.getMonth(), d.getDate())
    : thisYear;
  const diffMs = target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round(diffMs / 86400000);
}