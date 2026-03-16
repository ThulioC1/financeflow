'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  History,
  User,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/receitas', label: 'Receitas', icon: Wallet },
  { href: '/dashboard/despesas', label: 'Despesas', icon: Landmark },
  { href: '/dashboard/historico', label: 'Histórico', icon: History },
  { href: '/dashboard/perfil', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-6 items-center">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link href={link.href} key={link.href} className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground transition-colors",
              isActive && "text-primary"
            )}>
              <link.icon className="h-5 w-5" />
              <span className="truncate px-0.5">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
