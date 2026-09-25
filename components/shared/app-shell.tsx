'use client';

import { Sidebar } from './sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { ProtectedRoute } from './protected-route';

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {showNav && <Sidebar />}
        <main className={showNav ? 'lg:pl-64' : ''}>
          <div className={showNav ? 'min-h-screen pb-20 lg:pb-0' : 'min-h-screen'}>
            {children}
          </div>
        </main>
        {showNav && <MobileBottomNav />}
      </div>
    </ProtectedRoute>
  );
}
