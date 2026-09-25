'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  TrendingUp,
  LayoutGrid,
  User,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/challenges', label: 'Challenges', icon: LayoutGrid },
  { href: '/settings', label: 'Profile', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (index === 2) {
            return (
              <div key="new-challenge" className="flex items-center">
                <Link
                  href="/create"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 -translate-y-3 transition-transform hover:scale-105"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
