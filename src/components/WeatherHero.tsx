/**
 * WeatherHero — real-weather animated banner.
 *
 * Data: Open-Meteo (free, no API key) + browser geolocation.
 * Falls back to time-of-day scene if location is denied/unavailable.
 * All animations: Framer Motion only — no canvas, no external libs.
 *
 * Scenes driven by WMO weather codes:
 *   clear-day      → sun + rotating rays + clouds
 *   clear-night    → moon + stars + shooting stars
 *   partly-cloudy  → sun/moon + more clouds
 *   cloudy         → heavy cloud cover, grey-blue gradient
 *   fog            → misty overlay, grey gradient
 *   drizzle        → light rain + clouds
 *   rain           → heavy rain + dark clouds
 *   thunderstorm   → rain + lightning flash + dark gradient
 *   snow           → falling snowflakes + pale blue gradient
 *   hail           → bouncing hail pellets
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { useWeather, WeatherScene } from '@/hooks/useWeather';
import { MapPin, Wind, Thermometer } from 'lucide-react';
import { getFestiveScene, getGreetingOverride, getStreakEmoji } from '@/lib/festiveCalendar';

// ── Gradient per scene ────────────────────────────────────────────────
const gradients: Record<WeatherScene, string> = {
  'clear-day':     'from-amber-400 via-sky-400 to-blue-500',
  'clear-night':   'from-indigo-950 via-slate-900 to-slate-800',
  'partly-cloudy': 'from-sky-400 via-blue-400 to-blue-500',
  'cloudy':        'from-slate-500 via-slate-600 to-slate-700',
  'fog':           'from-slate-400 via-slate-500 to-slate-600',
  'drizzle':       'from-slate-500 via-blue-700 to-slate-700',
  'rain':          'from-slate-700 via-blue-900 to-slate-800',
  'thunderstorm':  'from-slate-800 via-indigo-900 to-slate-900',
  'snow':          'from-sky-200 via-blue-300 to-indigo-200',
  'hail':          'from-slate-500 via-slate-700 to-indigo-800',
};

// ── Sun ───────────────────────────────────────────────────────────────
function Sun({ scene }: { scene: WeatherScene }) {
  const show = scene === 'clear-day' || scene === 'partly-cloudy';
  if (!show) return null;
  const isMuted = scene === 'partly-cloudy';
  const sunColor = isMuted ? '#FDE68A' : '#FCD34D';
  const glowColor = isMuted ? 'rgba(253,230,138,0.2)' : 'rgba(252,211,77,0.35)';

  return (
    <div className="absolute pointer-events-none" style={{ left: '8%', top: '50%', transform: 'translate(-50%,-50%)' }}>
      <motion.div className="absolute rounded-full" style={{ width:120, height:120, background:glowColor, left:'50%', top:'50%', transform:'translate(-50%,-50%)' }}
        animate={{ scale:[1,1.2,1], opacity:[0.5,1,0.5] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }} />
      <motion.div className="absolute rounded-full" style={{ width:52, height:52, background:sunColor, left:'50%', top:'50%', transform:'translate(-50%,-50%)', boxShadow:`0 0 28px 8px ${glowColor}` }}
        animate={{ scale:[1,1.05,1] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut' }} />
      <motion.div className="absolute" style={{ width:160, height:160, left:'50%', top:'50%', transform:'translate(-50%,-50%)' }}
        animate={{ rotate:360 }} transition={{ duration:22, repeat:Infinity, ease:'linear' }}>
        {Array.from({ length:12 }).map((_,i) => (
          <div key={i} className="absolute" style={{ width:2.5, height:26, background:`${sunColor}aa`, borderRadius:2, left:'50%', top:'50%', transformOrigin:'50% 100%', transform:`translateX(-50%) rotate(${(360/12)*i}deg) translateY(-52px)` }} />
        ))}
      </motion.div>
    </div>
  );
}

// ── Moon ──────────────────────────────────────────────────────────────
function Moon({ scene }: { scene: WeatherScene }) {
  const show = scene === 'clear-night';
  if (!show) return null;
  return (
    <div className="absolute pointer-events-none" style={{ right:'10%', top:'18%' }}>
      <motion.div className="absolute rounded-full" style={{ width:90, height:90, background:'rgba(226,232,240,0.12)', left:'50%', top:'50%', transform:'translate(-50%,-50%)' }}
        animate={{ scale:[1,1.25,1], opacity:[0.4,0.9,0.4] }} transition={{ duration:4.5, repeat:Infinity, ease:'easeInOut' }} />
      <motion.div style={{ width:48, height:48, borderRadius:'50%', background:'#E2E8F0', position:'relative', boxShadow:'0 0 24px 6px rgba(226,232,240,0.25)' }}
        animate={{ y:[0,-5,0] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}>
        <div style={{ position:'absolute', width:38, height:38, borderRadius:'50%', background:'#1E293B', top:-8, right:-8 }} />
        <div style={{ position:'absolute', width:7, height:7, borderRadius:'50%', background:'rgba(0,0,0,0.18)', top:14, left:9 }} />
        <div style={{ position:'absolute', width:4, height:4, borderRadius:'50%', background:'rgba(0,0,0,0.14)', top:26, left:18 }} />
      </motion.div>
    </div>
  );
}

// ── Stars ──────────────────────────────────────────────────────────────
function Stars({ scene }: { scene: WeatherScene }) {
  if (scene !== 'clear-night') return null;
  const stars = useMemo(() => Array.from({ length:50 }).map((_,i) => ({
    id:i, x:Math.random()*100, y:Math.random()*100, size:Math.random()*2+0.8, delay:Math.random()*5, duration:Math.random()*2+2,
  })), []);
  return <>{stars.map(s => (
    <motion.div key={s.id} className="absolute rounded-full bg-white pointer-events-none"
      style={{ left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size }}
      animate={{ opacity:[0.1,1,0.1], scale:[0.7,1.3,0.7] }}
      transition={{ duration:s.duration, repeat:Infinity, delay:s.delay, ease:'easeInOut' }} />
  ))}</>;
}

// ── Shooting Stars ────────────────────────────────────────────────────
function ShootingStars({ scene }: { scene: WeatherScene }) {
  if (scene !== 'clear-night') return null;
  const shoots = useMemo(() => Array.from({ length:3 }).map((_,i) => ({
    id:i, startX:5+i*28, startY:5+i*7, delay:i*5+2,
  })), []);
  return <>{shoots.map(s => (
    <motion.div key={s.id} className="absolute pointer-events-none"
      style={{ left:`${s.startX}%`, top:`${s.startY}%`, width:70, height:1.5, background:'linear-gradient(90deg,transparent,white,transparent)', borderRadius:2, rotate:25 }}
      animate={{ x:[0,140], y:[0,70], opacity:[0,1,1,0] }}
      transition={{ duration:1.2, repeat:Infinity, delay:s.delay, repeatDelay:9, ease:'easeOut' }} />
  ))}</>;
}

// ── Clouds ─────────────────────────────────────────────────────────────
type CloudDensity = 'none' | 'light' | 'medium' | 'heavy' | 'dark';
function cloudDensityForScene(scene: WeatherScene): CloudDensity {
  if (scene === 'clear-day' || scene === 'clear-night') return 'none';
  if (scene === 'partly-cloudy') return 'light';
  if (scene === 'cloudy' || scene === 'fog') return 'heavy';
  if (scene === 'drizzle' || scene === 'rain' || scene === 'snow' || scene === 'hail') return 'medium';
  if (scene === 'thunderstorm') return 'dark';
  return 'none';
}
function Clouds({ scene }: { scene: WeatherScene }) {
  const density = cloudDensityForScene(scene);
  if (density === 'none') return null;

  const colorMap: Record<CloudDensity, string> = {
    none: '', light: 'rgba(255,255,255,0.22)', medium: 'rgba(200,210,220,0.3)',
    heavy: 'rgba(180,190,200,0.35)', dark: 'rgba(60,60,80,0.5)',
  };
  const cloudColor = colorMap[density];
  const count = density === 'light' ? 3 : density === 'medium' ? 4 : 5;
  const clouds = Array.from({ length: count }).map((_, i) => ({
    w: 80 + i * 20, h: 28 + i * 6,
    x: `${-5 + i * 22}%`, y: `${8 + (i % 3) * 20}%`,
    speed: 60 + i * 25, delay: i * 7,
  }));

  return <>{clouds.map((c,i) => (
    <motion.div key={i} className="absolute pointer-events-none" style={{ top:c.y, left:c.x }}
      animate={{ x:['0%','6%','0%'] }} transition={{ duration:c.speed, repeat:Infinity, ease:'easeInOut', delay:c.delay }}>
      <div style={{ width:c.w, height:c.h, background:cloudColor, borderRadius:50, position:'relative' }}>
        <div style={{ position:'absolute', width:c.w*0.44, height:c.h*1.25, background:cloudColor, borderRadius:'50%', top:-c.h*0.3, left:c.w*0.2 }} />
        <div style={{ position:'absolute', width:c.w*0.3, height:c.h*0.9, background:cloudColor, borderRadius:'50%', top:-c.h*0.1, left:c.w*0.52 }} />
      </div>
    </motion.div>
  ))}</>;
}

// ── Rain ──────────────────────────────────────────────────────────────
function Rain({ scene }: { scene: WeatherScene }) {
  const show = scene === 'rain' || scene === 'drizzle' || scene === 'thunderstorm';
  if (!show) return null;
  const heavy = scene === 'rain' || scene === 'thunderstorm';
  const count = heavy ? 45 : 22;
  const opacity = heavy ? 0.5 : 0.3;
  const drops = useMemo(() => Array.from({ length:count }).map((_,i) => ({
    id:i, x:Math.random()*105, delay:Math.random()*1.5, duration:Math.random()*0.35+0.4, h:Math.random()*10+8,
  })), []);
  return <>{drops.map(d => (
    <motion.div key={d.id} className="absolute pointer-events-none"
      style={{ left:`${d.x}%`, top:0, width:1.5, height:d.h, background:'rgba(186,230,253,0.7)', borderRadius:2, opacity }}
      animate={{ y:['0%','900%'], opacity:[opacity,0] }}
      transition={{ duration:d.duration, repeat:Infinity, delay:d.delay, ease:'linear' }} />
  ))}</>;
}

// ── Snow ──────────────────────────────────────────────────────────────
function Snow({ scene }: { scene: WeatherScene }) {
  if (scene !== 'snow') return null;
  const flakes = useMemo(() => Array.from({ length:30 }).map((_,i) => ({
    id:i, x:Math.random()*100, size:Math.random()*5+3, delay:Math.random()*3, duration:Math.random()*2+3, sway:Math.random()*40+20,
  })), []);
  return <>{flakes.map(f => (
    <motion.div key={f.id} className="absolute pointer-events-none rounded-full bg-white"
      style={{ left:`${f.x}%`, top:-8, width:f.size, height:f.size, opacity:0.85 }}
      animate={{ y:['0px','140px'], x:[0, f.sway, 0, -f.sway, 0], opacity:[0.85, 0.85, 0] }}
      transition={{ duration:f.duration, repeat:Infinity, delay:f.delay, ease:'linear' }} />
  ))}</>;
}

// ── Hail ──────────────────────────────────────────────────────────────
function Hail({ scene }: { scene: WeatherScene }) {
  if (scene !== 'hail') return null;
  const pellets = useMemo(() => Array.from({ length:20 }).map((_,i) => ({
    id:i, x:Math.random()*100, delay:Math.random()*1.2, duration:Math.random()*0.3+0.3,
  })), []);
  return <>{pellets.map(p => (
    <motion.div key={p.id} className="absolute pointer-events-none rounded-full"
      style={{ left:`${p.x}%`, top:0, width:5, height:5, background:'rgba(226,232,240,0.9)' }}
      animate={{ y:['0px','130px'], opacity:[1,1,0] }}
      transition={{ duration:p.duration, repeat:Infinity, delay:p.delay, ease:'easeIn' }} />
  ))}</>;
}

// ── Lightning ─────────────────────────────────────────────────────────
function Lightning({ scene }: { scene: WeatherScene }) {
  if (scene !== 'thunderstorm') return null;
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const schedule = () => {
      const wait = Math.random() * 7000 + 3000;
      return setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 120);
        timerRef = schedule();
      }, wait);
    };
    let timerRef = schedule();
    return () => clearTimeout(timerRef);
  }, []);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background:'rgba(255,255,255,0.08)' }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.06 }} />
      )}
    </AnimatePresence>
  );
}

// ── Fog overlay ───────────────────────────────────────────────────────
function Fog({ scene }: { scene: WeatherScene }) {
  if (scene !== 'fog') return null;
  return (
    <motion.div className="absolute inset-0 pointer-events-none rounded-2xl"
      style={{ background:'linear-gradient(180deg,rgba(200,210,220,0.18) 0%,rgba(200,210,220,0.35) 100%)' }}
      animate={{ opacity:[0.6,1,0.6] }} transition={{ duration:6, repeat:Infinity, ease:'easeInOut' }} />
  );
}

// ── Christmas Lights ──────────────────────────────────────────────────
function ChristmasLights() {
  const colors = ['#EF4444','#22C55E','#EAB308','#3B82F6','#EF4444','#22C55E','#EAB308'];
  return (
    <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none flex items-end px-4 gap-0">
      {/* Wire */}
      <div className="absolute top-2 left-0 right-0 h-px bg-white/20" />
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="relative flex-1 flex justify-center">
          <div className="absolute top-0 w-px h-2 bg-white/20" />
          <motion.div
            className="absolute top-2 w-3 h-4 rounded-b-full"
            style={{ background: colors[i % colors.length] }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 1.2 + (i % 4) * 0.3, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
          />
        </div>
      ))}
    </div>
  );
}

// ── New Year Sparkles ─────────────────────────────────────────────────
function NewYearSparkles() {
  const sparks = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    id: i, x: 5 + i * 8, y: 10 + (i % 3) * 20,
    delay: i * 0.4, duration: 1.5 + (i % 3) * 0.5,
  })), []);
  return <>
    {sparks.map(s => (
      <motion.div key={s.id} className="absolute pointer-events-none text-yellow-300 font-bold"
        style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: 12 + (s.id % 3) * 4 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5], y: [-10, -30, -10] }}
        transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeOut' }}>
        ✦
      </motion.div>
    ))}
  </>;
}

// ── Weather badge (shows real data) ──────────────────────────────────
function WeatherBadge({ temp, wind, city, scene }: { temp:number; wind:number; city:string; scene:WeatherScene }) {
  const sceneLabel: Record<WeatherScene, string> = {
    'clear-day':'Clear','clear-night':'Clear night','partly-cloudy':'Partly cloudy',
    'cloudy':'Cloudy','fog':'Foggy','drizzle':'Drizzle','rain':'Raining',
    'thunderstorm':'Thunderstorm','snow':'Snowing','hail':'Hail',
  };
  return (
    <div className="flex items-center gap-3 mt-2 flex-wrap">
      {city && (
        <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
          <MapPin className="h-3 w-3" />{city}
        </span>
      )}
      <span className="flex items-center gap-1 text-xs text-white/80">
        <Thermometer className="h-3 w-3" />{temp}°C
      </span>
      <span className="flex items-center gap-1 text-xs text-white/80">
        <Wind className="h-3 w-3" />{wind} km/h
      </span>
      <span className="text-xs text-white/70 italic">{sceneLabel[scene]}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export interface PersonalStatsChips {
  myDocsThisMonth: number;
  leaveBalance: number | null;
  myOpenTickets: number;
}

interface WeatherHeroProps {
  greeting: { text: string; emoji: string };
  firstName: string;
  stats: { docsCount: number; customersCount: number; incidentsCount: number; streak: number };
  personalStats?: PersonalStatsChips;
}

export function WeatherHero({ greeting, firstName, stats, personalStats }: WeatherHeroProps) {
  const { weather, loading, hasLocation } = useWeather();

  // Check for festive scene override (Christmas / New Year)
  const festiveScene = getFestiveScene();
  const greetingOverride = getGreetingOverride();
  const activeGreeting = greetingOverride ?? greeting;

  // Fallback: derive scene from time-of-day when no location yet
  const hour = new Date().getHours();
  const fallbackScene: WeatherScene = hour >= 5 && hour < 20 ? 'clear-day' : 'clear-night';
  const scene: WeatherScene = weather?.scene ?? fallbackScene;

  // Festive gradient overrides
  const festiveGradient = festiveScene === 'christmas'
    ? 'from-green-800 via-red-900 to-green-900'
    : festiveScene === 'newyear'
    ? 'from-indigo-950 via-purple-900 to-black'
    : null;
  const gradient = festiveGradient ?? gradients[scene];

  return (
    <motion.div
      initial={{ opacity:0, y:-10 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} mb-8 p-6 sm:p-8 text-white`}
      style={{ minHeight:140 }}
    >
      {/* Weather layers — rendered in z order */}
      {/* On festive scenes, force snow/clear-night but keep the festive gradient */}
      <Stars scene={festiveScene === 'newyear' ? 'clear-night' : scene} />
      <ShootingStars scene={festiveScene === 'newyear' ? 'clear-night' : scene} />
      <Moon scene={scene} />
      <Sun scene={scene} />
      <Clouds scene={scene} />
      <Rain scene={scene} />
      <Snow scene={festiveScene === 'christmas' ? 'snow' : scene} />
      <Hail scene={scene} />
      <Fog scene={scene} />
      <Lightning scene={scene} />

      {/* Christmas lights string across top */}
      {festiveScene === 'christmas' && <ChristmasLights />}
      {/* New Year firework particles */}
      {festiveScene === 'newyear' && <NewYearSparkles />}

      {/* Loading shimmer while fetching location */}
      {!weather && hasLocation && loading && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay:'0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay:'150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay:'300ms' }} />
        </div>
      )}

      {/* Text content */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/70 mb-0.5">
            {activeGreeting.emoji} {activeGreeting.text}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow-sm">
            {firstName}
          </h1>
          <p className="text-sm text-white/70 mt-0.5">Choose a module to get started</p>
          {weather && (
            <WeatherBadge
              temp={weather.temperature}
              wind={weather.windspeed}
              city={weather.city}
              scene={scene}
            />
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
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
                <p className="text-2xl font-bold drop-shadow-sm">{stats.streak} {getStreakEmoji()}</p>
                <p className="text-xs text-white/70">Day Streak</p>
              </div>
            )}
          </div>

          {/* Personal stat chips */}
          {personalStats && (personalStats.myDocsThisMonth > 0 || (personalStats.leaveBalance !== null && personalStats.leaveBalance > 0) || personalStats.myOpenTickets > 0) && (
            <div className="flex gap-2 flex-wrap justify-end">
              {personalStats.myDocsThisMonth > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white font-medium backdrop-blur-sm">
                  <span className="font-bold">{personalStats.myDocsThisMonth}</span>
                  <span className="opacity-80">my docs</span>
                </span>
              )}
              {personalStats.leaveBalance !== null && personalStats.leaveBalance > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white font-medium backdrop-blur-sm">
                  <span className="font-bold">{personalStats.leaveBalance}</span>
                  <span className="opacity-80">leave days</span>
                </span>
              )}
              {personalStats.myOpenTickets > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white font-medium backdrop-blur-sm">
                  <span className="font-bold">{personalStats.myOpenTickets}</span>
                  <span className="opacity-80">my tickets</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
