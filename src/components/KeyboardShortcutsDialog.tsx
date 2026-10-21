import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeyboardShortcuts();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Keyboard Shortcuts (Alt+?)">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm">{s.description}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                Alt + {s.key.toUpperCase()}
              </kbd>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm">Show this dialog</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + ?</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
