import { ReactNode } from 'react';
import HrSidebar from './HrSidebar';

export default function HrAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex w-full overflow-hidden bg-background">
      <HrSidebar />
      <main className="flex-1 ml-64 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}
