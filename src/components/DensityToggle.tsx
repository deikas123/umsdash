import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlignJustify } from 'lucide-react';

type Density = 'compact' | 'comfortable' | 'spacious';

const STORAGE_KEY = 'umshub_density';

function applyDensity(d: Density) {
  document.documentElement.setAttribute('data-density', d);
}

export function DensityToggle() {
  const [density, setDensity] = useState<Density>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Density) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const set = (d: Density) => {
    setDensity(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch { /* ignore */ }
    applyDensity(d);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Density">
          <AlignJustify className="h-4 w-4" />
          <span className="sr-only">Toggle density</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['compact', 'comfortable', 'spacious'] as Density[]).map((d) => (
          <DropdownMenuItem
            key={d}
            onClick={() => set(d)}
            className={density === d ? 'bg-accent' : ''}
          >
            <span className="capitalize">{d}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
