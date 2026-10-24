import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useOrgSettings } from '@/hooks/useOrgSettings';

const STORAGE_KEY = 'umshub_announcement_dismissed';

const colorMap: Record<string, string> = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-400 text-black',
  red: 'bg-red-600 text-white',
  purple: 'bg-purple-600 text-white',
};

export function AnnouncementBanner() {
  const { settings } = useOrgSettings();
  const ann = settings.announcement;
  const [dismissed, setDismissed] = useState(false);

  // Track which announcement text was dismissed so new ones re-appear
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === ann.text);
    } catch {
      setDismissed(false);
    }
  }, [ann.text]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, ann.text); } catch { /* ignore */ }
  };

  if (!ann.active || !ann.text || dismissed) return null;

  const cls = colorMap[ann.color] || colorMap.blue;
  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium ${cls}`}>
      <span className="flex-1 text-center">{ann.text}</span>
      <button
        onClick={dismiss}
        className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
