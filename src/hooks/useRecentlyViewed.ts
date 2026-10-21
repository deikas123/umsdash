import { useState, useCallback } from 'react';

const KEY = 'umshub_recently_viewed_docs';
const MAX = 5;

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addRecentDoc = useCallback((id: string) => {
    setRecentIds(prev => {
      const filtered = prev.filter(i => i !== id);
      const next = [id, ...filtered].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_e) { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { recentIds, addRecentDoc };
}
