import { ReactNode } from 'react';
import ItSidebar from './ItSidebar';

export default function ItAppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-screen flex w-full overflow-hidden bg-background"
      style={{
        '--sidebar-primary':            '189 94% 43%',  /* cyan */
        '--sidebar-primary-foreground': '0 0% 100%',
        '--sidebar-ring':               '189 94% 43%',
      } as React.CSSProperties}
    >
      <ItSidebar />
      <main className="flex-1 ml-64 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}
