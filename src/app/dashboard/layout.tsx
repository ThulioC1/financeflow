
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
import { Code2, Heart, Download } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { APP_VERSION } from '@/lib/version';
import { Button } from '@/components/ui/button';

const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M17.523 15.3414C17.523 15.8647 17.1004 16.2874 16.5771 16.2874C16.0538 16.2874 15.6312 15.8647 15.6312 15.3414C15.6312 14.8181 16.0538 14.3955 16.5771 14.3955C17.1004 14.3955 17.523 14.8181 17.523 15.3414ZM8.36885 15.3414C8.36885 15.8647 7.94625 16.2874 7.42295 16.2874C6.89965 16.2874 6.47705 15.8647 6.47705 15.3414C6.47705 14.8181 6.89965 14.3955 7.42295 14.3955C7.94625 14.3955 8.36885 14.8181 8.36885 15.3414ZM17.9171 11.5312L19.5594 8.68594C19.6453 8.53723 19.5937 8.34863 19.4449 8.26277C19.2961 8.17691 19.1075 8.22851 19.0217 8.37722L17.359 11.2573C15.9329 10.6094 14.3419 10.2443 12.6644 10.2443C10.9868 10.2443 9.39587 10.6094 7.9698 11.2573L6.30704 8.37722C6.22118 8.22851 6.03258 8.17691 5.88387 8.26277C5.73516 8.34863 5.68356 8.53723 5.76941 8.68594L7.41169 11.5312C4.19794 13.1558 2.00012 16.4851 2.00012 20.3524H22.0001C22.0001 16.4851 19.8023 13.1558 17.9171 11.5312Z" />
  </svg>
);

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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 shrink-0 rounded-lg shadow-lg" />
            <span className="font-headline text-xl font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Ca$h<span className="text-primary">Ord</span>
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden flex flex-col gap-3">
          <Button 
            asChild 
            variant="secondary" 
            size="sm" 
            className="w-full justify-start gap-2 bg-sidebar-accent/30 hover:bg-sidebar-accent/60 text-sidebar-foreground border-sidebar-border/50 h-9"
          >
            <a 
              href="https://dub.sh/M0e5D3a" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <AndroidIcon />
              <span className="text-xs font-semibold">Baixar APK Android</span>
            </a>
          </Button>

          <div className="rounded-xl bg-sidebar-accent/50 p-3 text-[10px] text-sidebar-foreground/60 border border-sidebar-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Code2 className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider">Credits</span>
            </div>
            <p className="leading-tight">
              Desenvolvido por <span className="text-sidebar-foreground font-medium">Thulio Costa</span> & <span className="text-primary font-medium italic">AI Partner</span>
            </p>
            <div className="mt-2 flex items-center justify-between opacity-40">
              <div className="flex items-center gap-1">
                <span>Made with</span>
                <Heart className="h-2 w-2 fill-current text-destructive" />
                <span>in Studio</span>
              </div>
              <span className="font-mono text-[8px]">{APP_VERSION}</span>
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
          <NotificationChecker />
          {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
