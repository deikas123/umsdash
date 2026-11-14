// src/components/festive/MidnightCountdown.tsx
// Full-screen midnight countdown Dec 31 23:55 → Jan 1 00:08
// Fireworks burst at midnight using canvas-confetti.
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { isCountdownPeriod } from '@/lib/festiveCalendar';

function getSecondsToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  if (now.getMonth() === 11 && now.getDate() === 31) {
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
  } else {
    midnight.setHours(0, 0, 0, 0);
  }
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function launchFireworks() {
  const duration = 8000;
  const end = Date.now() + duration;
  const colors = ['#FFD700','#C0C0C0','#FF0000','#00FF00','#0066FF','#FF6600'];

  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  frame();
  // Big burst at start
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors });
}

export function MidnightCountdown() {
  const [visible, setVisible] = useState(false);
  const [secs, setSecs] = useState(getSecondsToMidnight);
  const firedRef = useRef(false);

  useEffect(() => {
    setVisible(isCountdownPeriod());
    const id = setInterval(() => {
      setVisible(isCountdownPeriod());
      const s = getSecondsToMidnight();
      setSecs(s);
      if (s === 0 && !firedRef.current) {
        firedRef.current = true;
        launchFireworks();
        setTimeout(() => setVisible(false), 8500);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-center"
          >
            {secs > 0 ? (
              <>
                <p className="text-white/70 text-lg font-medium mb-4 tracking-widest uppercase">New Year countdown</p>
                <p className="text-white font-mono text-7xl sm:text-9xl font-bold tracking-tight tabular-nums drop-shadow-2xl">
                  {formatCountdown(secs)}
                </p>
                <p className="text-white/50 text-sm mt-6">🥂 Get ready…</p>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <p className="text-7xl sm:text-9xl mb-4">🎆</p>
                <p className="text-white text-4xl sm:text-6xl font-bold">Happy New Year 2027!</p>
                <p className="text-white/60 text-lg mt-4">From everyone at UMS Kenya 🥂</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
