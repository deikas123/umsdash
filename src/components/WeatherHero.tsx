/**
 * WeatherHero — animated time-of-day weather banner.
 * Morning: rising sun with rays + clouds
 * Afternoon: high sun + drifting clouds
 * Evening/Night: moon + stars + shooting stars
 * Uses only Framer Motion + Tailwind — no canvas, no external libs.
 */
import { motion } from 'framer-motion';
import { useMemo } from 'react';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

const gradients: Record<TimeOfDay, string> = {
  morning:   'from-amber-400 via-orange-400 to-sky-500',
  afternoon: 'from-sky-500 via-blue-500 to-cyan-600',
  evening:   'from-orange-600 via-purple-700 to-indigo-900',
  night:     'from-indigo-950 via-slate-900 to-slate-800',
};

// ── Sun ───────────────────────────────────────────────────────────────
function Sun({ tod }: { tod: TimeOfDay }) {
  if (tod === 'evening' || tod === 'night') return null;

  const isMorning = tod === 'morning';
  // Morning: partially risen (bottom of banner), Afternoon: high up
  const sunY = isMorning ? '75%' : '20%';
  const sunColor = isMorning ? '#FCD34D' : '#FDE68A';
  const glowColor = isMorning ? 'rgba(252,211,77,0.35)' : 'rgba(253,230,138,0.25)';
  const rayCount = 12;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: '10%', top: sunY, transform: 'translate(-50%, -50%)' }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 120, height: 120,
          background: glowColor,
          left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Sun disc */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 56, height: 56,
          background: sunColor,
          left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          boxShadow: `0 0 24px 8px ${glowColor}`,
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Rays */}
      <motion.div
        className="absolute"
        style={{ width: 160, height: 160, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: rayCount }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 2,
              height: 28,
              background: `${sunColor}99`,
              borderRadius: 2,
              left: '50%',
              top: '50%',
              transformOrigin: '50% 100%',
              transform: `translateX(-50%) rotate(${(360 / rayCount) * i}deg) translateY(-52px)`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// ── Moon ──────────────────────────────────────────────────────────────
function Moon({ tod }: { tod: TimeOfDay }) {
  if (tod === 'morning' || tod === 'afternoon') return null;
  const isEvening = tod === 'evening';

  return (
    <div
      className="absolute pointer-events-none"
      style={{ right: '12%', top: isEvening ? '30%' : '15%' }}
    >
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 80, height: 80,
          background: 'rgba(226,232,240,0.15)',
          left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Moon crescent */}
      <motion.div
        style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: '#E2E8F0',
          position: 'relative',
          boxShadow: '0 0 20px 4px rgba(226,232,240,0.3)',
        }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Crater cutout (creates crescent shape) */}
        <div style={{
          position: 'absolute',
          width: 34, height: 34,
          borderRadius: '50%',
          background: isEvening ? '#7C3AED' : '#1E293B',
          top: -6, right: -6,
        }} />
        {/* Small craters */}
        <div style={{ position:'absolute', width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.15)', top:12, left:8 }} />
        <div style={{ position:'absolute', width:4, height:4, borderRadius:'50%', background:'rgba(0,0,0,0.12)', top:24, left:16 }} />
      </motion.div>
    </div>
  );
}

// ── Stars ──────────────────────────────────────────────────────────────
function Stars({ tod }: { tod: TimeOfDay }) {
  if (tod === 'morning' || tod === 'afternoon') return null;

  const stars = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 2 + 2,
    })), []);

  return (
    <>
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
}

// ── Shooting Stars ────────────────────────────────────────────────────
function ShootingStars({ tod }: { tod: TimeOfDay }) {
  if (tod !== 'night') return null;

  const shoots = useMemo(() =>
    Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      startX: 10 + i * 30,
      startY: 5 + i * 8,
      delay: i * 4 + 1,
    })), []);

  return (
    <>
      {shoots.map(s => (
        <motion.div
          key={s.id}
          className="absolute pointer-events-none"
          style={{
            left: `${s.startX}%`,
            top: `${s.startY}%`,
            width: 60,
            height: 1.5,
            background: 'linear-gradient(90deg, transparent, white, transparent)',
            borderRadius: 2,
            rotate: 25,
          }}
          animate={{
            x: [0, 120],
            y: [0, 60],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: s.delay,
            repeatDelay: 8,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

// ── Clouds ─────────────────────────────────────────────────────────────
function Clouds({ tod }: { tod: TimeOfDay }) {
  if (tod === 'night') return null;

  const isEvening = tod === 'evening';
  const cloudColor = isEvening
    ? 'rgba(251,146,60,0.25)'
    : 'rgba(255,255,255,0.18)';

  const clouds = [
    { w: 100, h: 36, x: '15%', y: '18%', speed: 60 },
    { w: 72,  h: 28, x: '55%', y: '8%',  speed: 90 },
    { w: 56,  h: 22, x: '78%', y: '28%', speed: 70 },
    { w: 88,  h: 32, x: '-5%', y: '45%', speed: 110 },
  ];

  return (
    <>
      {clouds.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ top: cloud.y, left: cloud.x }}
          animate={{ x: ['0%', '8%', '0%'] }}
          transition={{
            duration: cloud.speed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 8,
          }}
        >
          {/* Cloud body */}
          <div
            style={{
              width: cloud.w,
              height: cloud.h,
              background: cloudColor,
              borderRadius: 50,
              position: 'relative',
              backdropFilter: 'blur(1px)',
            }}
          >
            {/* Cloud bumps */}
            <div style={{ position:'absolute', width: cloud.w * 0.45, height: cloud.h * 1.2, background: cloudColor, borderRadius:'50%', top: -cloud.h * 0.3, left: cloud.w * 0.2 }} />
            <div style={{ position:'absolute', width: cloud.w * 0.3, height: cloud.h * 0.9, background: cloudColor, borderRadius:'50%', top: -cloud.h * 0.15, left: cloud.w * 0.5 }} />
          </div>
        </motion.div>
      ))}
    </>
  );
}

// ── Rain ──────────────────────────────────────────────────────────────
function Rain() {
  const drops = useMemo(() =>
    Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: Math.random() * 0.4 + 0.5,
      opacity: Math.random() * 0.3 + 0.15,
      height: Math.random() * 10 + 10,
    })), []);

  return (
    <>
      {drops.map(drop => (
        <motion.div
          key={drop.id}
          className="absolute pointer-events-none"
          style={{
            left: `${drop.x}%`,
            top: 0,
            width: 1.5,
            height: drop.height,
            background: 'rgba(186,230,253,0.6)',
            borderRadius: 2,
            opacity: drop.opacity,
          }}
          animate={{ y: ['0%', '800%'], opacity: [drop.opacity, 0] }}
          transition={{
            duration: drop.duration,
            repeat: Infinity,
            delay: drop.delay,
            ease: 'linear',
          }}
        />
      ))}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────
interface WeatherHeroProps {
  greeting: { text: string; emoji: string };
  firstName: string;
  stats: { docsCount: number; customersCount: number; incidentsCount: number; streak: number };
  showRain?: boolean;
}

export function WeatherHero({ greeting, firstName, stats, showRain = false }: WeatherHeroProps) {
  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const gradient = gradients[tod];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} mb-8 p-6 sm:p-8 text-white`}
      style={{ minHeight: 130 }}
    >
      {/* Weather layers */}
      <Stars tod={tod} />
      <ShootingStars tod={tod} />
      <Moon tod={tod} />
      <Clouds tod={tod} />
      <Sun tod={tod} />
      {showRain && <Rain />}

      {/* Content */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/70 mb-0.5">
            {greeting.emoji} {greeting.text}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow-sm">
            {firstName}
          </h1>
          <p className="text-sm text-white/70 mt-1">Choose a module to get started</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 sm:gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold drop-shadow-sm">{stats.docsCount.toLocaleString()}</p>
            <p className="text-xs text-white/70">Documents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold drop-shadow-sm">{stats.customersCount.toLocaleString()}</p>
            <p className="text-xs text-white/70">Customers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold drop-shadow-sm">{stats.incidentsCount}</p>
            <p className="text-xs text-white/70">Open Incidents</p>
          </div>
          {stats.streak > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold drop-shadow-sm">{stats.streak} 🔥</p>
              <p className="text-xs text-white/70">Day Streak</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
