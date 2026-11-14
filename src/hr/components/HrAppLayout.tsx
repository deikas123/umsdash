import { ReactNode } from 'react';
import HrSidebar from './HrSidebar';

export default function HrAppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-screen flex w-full overflow-hidden bg-background"
      style={{
        '--sidebar-primary':            '38 92% 50%',   /* amber */
        '--sidebar-primary-foreground': '0 0% 100%',
        '--sidebar-ring':               '38 92% 50%',
      } as React.CSSProperties}
    >
      <HrSidebar />
      <main className="flex-1 ml-64 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}
