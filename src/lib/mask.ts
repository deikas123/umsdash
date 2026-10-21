/**
 * Masking helpers for sensitive PII shown in the UI.
 * Only administrators should see full values.
 */

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const s = String(phone).replace(/\s+/g, "");
  if (s.length <= 4) return "***" + s;
  const last = s.slice(-3);
  const first = s.slice(0, 3);
  return `${first}${"*".repeat(Math.max(3, s.length - 6))}${last}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [local, domain] = String(email).split("@");
  if (!domain) return "***";
  const shownLocal = local.length <= 2 ? local[0] + "*" : local.slice(0, 2) + "***";
  return `${shownLocal}@${domain}`;
}

export function maskMessage(msg?: string | null, keep = 40): string {
  if (!msg) return "";
  const cleaned = String(msg);
  if (cleaned.length <= keep) return cleaned.slice(0, 6) + "…";
  return cleaned.slice(0, 6) + "… [redacted — admin only]";
}

/** Normalize a free-text vendor / system name for consistent grouping. */
export function normalizeName(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ");
}
