import { useCallback, useRef } from 'react';

// Generate notification sounds using Web Audio API
function createNotificationSound(type: 'task' | 'reminder' | 'alert') {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  
  switch (type) {
    case 'task':
      oscillator.frequency.setValueAtTime(587, ctx.currentTime); // D5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.15); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      break;
    case 'reminder':
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      break;
    case 'alert':
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      break;
  }
}

export function useNotificationSound() {
  const lastPlayed = useRef<Record<string, number>>({});

  const playSound = useCallback((type: 'task' | 'reminder' | 'alert') => {
    // Throttle: don't play same sound within 10 seconds
    const now = Date.now();
    if (lastPlayed.current[type] && now - lastPlayed.current[type] < 10000) return;
    lastPlayed.current[type] = now;
    
    try {
      createNotificationSound(type);
    } catch {
      // Audio API may not be available
    }
  }, []);

  return { playSound };
}
