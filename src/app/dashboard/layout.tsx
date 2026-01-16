'use client';

import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { Logo } from '@/components/icons';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SidebarInset } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    // You can add a global loading spinner here
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
          <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
               <Logo className="h-8 w-8 shrink-0"/>
               <span className="font-headline text-xl font-semibold">FinanceFlow</span>
            </div>
            <div className="hidden md:block">
              <MainNav />
            </div>
          </div>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b bg-background/80 px-4 backdrop-blur-sm">
          <UserNav />
        </header>
        <main className="flex-1 p-4 pb-20 md:p-6 lg:p-8 md:pb-6 lg:pb-8">
          {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
