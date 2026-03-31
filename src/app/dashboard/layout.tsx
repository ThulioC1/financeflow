
'use client';

import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { Logo } from '@/components/icons';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { NotificationChecker } from '@/components/dashboard/notification-checker';
import { Code2, Heart } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

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
    return null;
  }

  return (
    <SidebarProvider>
      <NotificationChecker />
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 shrink-0 rounded-lg shadow-lg" />
            <span className="font-headline text-xl font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Finance<span className="text-primary">Flow</span>
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
          <div className="rounded-xl bg-sidebar-accent/50 p-3 text-[10px] text-sidebar-foreground/60 border border-sidebar-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Code2 className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider">Credits</span>
            </div>
            <p className="leading-tight">
              Desenvolvido por <span className="text-sidebar-foreground font-medium">Thulio Costa</span> & <span className="text-primary font-medium italic">AI Partner</span>
            </p>
            <div className="mt-2 flex items-center gap-1 opacity-40">
              <span>Made with</span>
              <Heart className="h-2 w-2 fill-current text-destructive" />
              <span>in Studio</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <div className="hidden md:block">
               <h2 className="text-sm font-medium text-muted-foreground">Bem-vindo, <span className="text-foreground font-bold">{user.displayName?.split(' ')[0]}</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:p-6 lg:p-8 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
