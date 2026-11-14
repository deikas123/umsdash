// src/components/festive/AdventCalendar.tsx
// Dec 1–25: 25-door advent calendar on launcher right panel.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock } from 'lucide-react';

const YEAR = new Date().getFullYear();
const OPENED_KEY = `ums_advent_opened_${YEAR}`;

function getOpened(): Set<number> {
  try {
    const raw = localStorage.getItem(OPENED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch { return new Set(); }
}

function saveOpened(opened: Set<number>) {
  try { localStorage.setItem(OPENED_KEY, JSON.stringify([...opened])); } catch {}
}

type AdventMessage = { day: number; message: string };

function isOpenable(day: number): boolean {
  const now = new Date();
  const m = now.getMonth() + 1;
  if (m !== 12) return false;
  return now.getDate() >= day;
}

function isAdventActive(): boolean {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return m === 12 && d >= 1 && d <= 25;
}

export function AdventCalendar() {
  const [opened, setOpened] = useState<Set<number>>(getOpened);
  const [viewDay, setViewDay] = useState<number | null>(null);
  const [viewMsg, setViewMsg] = useState<string>('');

  const { data: messages = [] } = useQuery<AdventMessage[]>({
    queryKey: ['advent-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_advent_messages').select('day,message').order('day');
      if (error) throw error;
      return data as AdventMessage[];
    },
    enabled: isAdventActive(),
    staleTime: 60 * 60 * 1000,
  });

  if (!isAdventActive()) return null;

  const msgMap = Object.fromEntries(messages.map(m => [m.day, m.message]));

  const openDoor = (day: number) => {
    if (!isOpenable(day)) return;
    const msg = msgMap[day] ?? '🎄 Merry Christmas from UMS Kenya!';
    setViewMsg(msg);
    setViewDay(day);
    const next = new Set(opened);
    next.add(day);
    setOpened(next);
    saveOpened(next);
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎄</span>
        <h3 className="text-sm font-semibold">Advent Calendar</h3>
        <span className="text-xs text-muted-foreground ml-auto">{new Date().getDate()} / 25</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 25 }, (_, i) => i + 1).map(day => {
          const canOpen = isOpenable(day);
          const isOpened = opened.has(day);
          const isToday = new Date().getMonth() === 11 && new Date().getDate() === day;

          return (
            <button
              key={day}
              onClick={() => openDoor(day)}
              disabled={!canOpen}
              className={`
                aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all
                ${isOpened ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' : ''}
                ${canOpen && !isOpened ? 'bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20' : ''}
                ${!canOpen ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' : ''}
                ${isToday && !isOpened ? 'ring-2 ring-primary ring-offset-1' : ''}
              `}
              title={canOpen ? `Open day ${day}` : `Unlocks on Dec ${day}`}
            >
              {isOpened ? '🎁' : !canOpen ? <Lock className="h-3 w-3" /> : day}
            </button>
          );
        })}
      </div>

      <Dialog open={viewDay !== null} onOpenChange={() => setViewDay(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">
              🎄 December {viewDay}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-4xl mb-4">🎁</p>
            <p className="text-base leading-relaxed">{viewMsg}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
