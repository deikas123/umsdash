import { ReactNode } from 'react';
import HrSidebar from './HrSidebar';

export default function HrAppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-screen flex w-full overflow-hidden bg-background"
      style={{ '--sidebar-primary': 'hsl(38 92% 50%)', '--sidebar-primary-foreground': 'hsl(0 0% 100%)' } as React.CSSProperties}
    >
      <HrSidebar />
      <main className="flex-1 ml-64 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}
