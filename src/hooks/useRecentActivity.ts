// src/hooks/useRecentActivity.ts
// localStorage key: 'ums_recent_activity'
import { useEffect, useState } from 'react';

export type RecentEntry = {
  type: 'document' | 'ticket' | 'employee' | 'device' | 'customer';
  id: string;
  label: string;
  subLabel: string;
  href: string;
  module: 'docs' | 'ops' | 'hr' | 'it';
  timestamp: number;
};

const STORAGE_KEY = 'ums_recent_activity';
const MAX_ITEMS = 10;
const EVENT_NAME = 'ums_recent_activity_updated';

function readStorage(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentEntry[];
  } catch {
    return [];
  }
}

export function addRecent(entry: RecentEntry): void {
  const existing = readStorage();
  // Dedupe by id, then prepend, then cap
  const deduped = existing.filter((e) => e.id !== entry.id);
  const next = [entry, ...deduped].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // storage unavailable — ignore
  }
}

export function useRecentActivity(): RecentEntry[] {
  const [entries, setEntries] = useState<RecentEntry[]>(() => readStorage());

  useEffect(() => {
    const refresh = () => setEntries(readStorage());

    // Cross-tab updates
    window.addEventListener('storage', refresh);
    // Same-tab updates dispatched by addRecent
    window.addEventListener(EVENT_NAME, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  return entries;
}
