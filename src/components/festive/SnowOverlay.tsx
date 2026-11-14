// src/components/festive/SnowOverlay.tsx
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake } from 'lucide-react';
import { isSnowPeriod } from '@/lib/festiveCalendar';

const STORAGE_KEY = 'ums_snow_enabled';

function getSnowEnabled(): boolean {
  if (!isSnowPeriod()) return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') return false;
    return true; // default true during snow period
  } catch {
    return true;
  }
}

interface Flake {
  id: number;
  x: number;      // % from left
  size: number;   // px
  duration: number; // seconds
  delay: number;  // seconds
  sway: number;   // px horizontal sway
}

function generateFlakes(count: number): Flake[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 6 + 4, // 4–10px
    duration: Math.random() * 8 + 6, // 6–14s
    delay: Math.random() * 10,
    sway: Math.random() * 60 + 20,
  }));
}

export function SnowOverlay() {
  const [enabled, setEnabled] = useState(getSnowEnabled);
  const inPeriod = isSnowPeriod();
  const flakes = useMemo(() => generateFlakes(60), []);

  // Keep in sync if another tab changes storage
  useEffect(() => {
    const handler = () => setEnabled(getSnowEnabled());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!inPeriod) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  };

  return (
    <>
      {/* Snow toggle button — fixed top-right, above header */}
      <button
        onClick={toggle}
        title={enabled ? 'Disable snow' : 'Enable snow'}
        className="fixed top-2 right-16 z-[10000] p-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border hover:bg-background/90 transition-colors"
        aria-label={enabled ? 'Disable falling snow' : 'Enable falling snow'}
      >
        <Snowflake
          className={`h-4 w-4 transition-colors ${enabled ? 'text-sky-400' : 'text-muted-foreground'}`}
        />
      </button>

      {/* Snowflake overlay */}
      <AnimatePresence>
        {enabled && (
          <div
            className="fixed inset-0 pointer-events-none"
            style={{zIndex: 9999}}
            aria-hidden
          >
            {flakes.map(f => (
              <motion.div
                key={f.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${f.x}%`,
                  top: -f.size,
                  width: f.size,
                  height: f.size,
                  opacity: 0.75,
                }}
                animate={{y: ['0px', '105vh'],
                  x: [0, f.sway, 0, -f.sway, 0],
                  opacity: [0.75, 0.75, 0],}}
                transition={{duration: f.duration,
                  delay: f.delay,
                  repeat: Infinity,
                  ease: 'linear',}}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
