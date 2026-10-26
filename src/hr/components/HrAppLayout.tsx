import { ReactNode } from 'react';
import HrSidebar from './HrSidebar';

export default function HrAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <HrSidebar />
      <main className="ml-64 p-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
