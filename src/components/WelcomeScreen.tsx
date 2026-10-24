// src/components/WelcomeScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import umsLogo from '@/assets/ums-logo.png';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { profile, isCustomer } = useAuth();
  const [hiding, setHiding] = useState(false);

  // Auto-advance to hide after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setHiding(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Allow clicking to skip
  const handleClick = () => setHiding(true);

  const apps = [
    { icon: '📁', name: 'Document Vault', desc: 'Documents & customers', show: true },
    { icon: '⚙️', name: 'Operations Hub', desc: 'Incidents & vendors', show: !isCustomer },
    { icon: '🛍️', name: 'App Store', desc: 'More applications', show: !isCustomer },
  ].filter((a) => a.show);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!hiding && (
        <motion.div
          key="welcome"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onClick={handleClick}
        >
          {/* Logo */}
          <motion.img
            src={umsLogo}
            alt="UMS Hub"
            className="h-20 w-auto object-contain mb-4"
            initial={{ opacity: 0, y: -40, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6, type: 'spring', bounce: 0.4 }}
          />

          {/* App name — letter-by-letter stagger */}
          <motion.div className="flex mb-2" aria-label="UMS Hub">
            {'UMS Hub'.split('').map((char, i) => (
              <motion.span
                key={i}
                className="text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + i * 0.05, duration: 0.3 }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="text-white/80 text-lg mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, duration: 0.4 }}
          >
            Unified Management Platform
          </motion.p>

          {/* App preview cards */}
          <div className="flex gap-3 mb-8 flex-wrap justify-center px-4">
            {apps.map((app, i) => (
              <motion.div
                key={app.name}
                className="px-4 py-3 rounded-xl text-center min-w-[120px]"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + i * 0.15, duration: 0.4, type: 'spring' }}
              >
                <div className="text-2xl mb-1">{app.icon}</div>
                <div className="text-white text-xs font-semibold">{app.name}</div>
                <div className="text-white/60 text-[10px]">{app.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Personalised welcome message */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 0.5 }}
          >
            <p className="text-white/90 text-lg font-medium">
              {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </p>
            <p className="text-white/60 text-sm mt-1">Click anywhere to continue</p>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.4)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.3, duration: 2.7, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
