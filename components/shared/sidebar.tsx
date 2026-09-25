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
import { Logo } from './logo';

const navItems = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/challenges', label: 'Challenges', icon: LayoutGrid },
  { href: '/settings', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-20 items-center px-6">
        <Link href="/dashboard">
          <Logo size="md" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          New Challenge
        </Link>
      </div>
    </aside>
  );
}
