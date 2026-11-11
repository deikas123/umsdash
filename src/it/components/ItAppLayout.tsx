import { ReactNode } from 'react';
import ItSidebar from './ItSidebar';

export default function ItAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex w-full overflow-hidden bg-background">
      <ItSidebar />
      <main className="flex-1 ml-64 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}
