
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
  PiggyBank as PiggyIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/cofrinhos', label: 'Cofrinhos', icon: PiggyIcon },
  { href: '/dashboard/receitas', label: 'Receitas', icon: Wallet },
  { href: '/dashboard/despesas', label: 'Despesas', icon: Landmark },
  { href: '/dashboard/historico', label: 'Histórico', icon: History },
  { href: '/dashboard/perfil', label: 'Perfil', icon: User },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={link.label}
            >
              <Link href={link.href}>
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
