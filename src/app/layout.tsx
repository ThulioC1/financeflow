
import type { Metadata, Viewport } from 'next';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

// Logo SVG data URI — identidade Ca$hOrd com fundo grafite (§16, Craft).
const logoSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='9' fill='url(%23g)'/%3E%3Cpath d='M26 14C24.5 12.5 22.5 12 20 12C14.5 12 11 15.5 11 20C11 24.5 14.5 28 20 28C22.5 28 24.5 27.5 26 26' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M20 9V31' stroke='white' stroke-width='2.5' stroke-opacity='0.4' stroke-linecap='round'/%3E%3Ccircle cx='29' cy='11' r='4' fill='%231a9c6e' stroke='white' stroke-width='1.5'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='40' y2='40' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%233a3d45'/%3E%3Cstop offset='1' stop-color='%2315171c'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: 'Ca$hOrd',
  description: 'Seu organizador financeiro inteligente para manter o dinheiro em ordem.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ca$hOrd',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: logoSvg,
    shortcut: logoSvg,
    apple: logoSvg,
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f7f8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Sem webfont: a system font já tem optical sizing e tracking tables (§15).
          Também remove 2 requests bloqueantes do first paint em 3G/4G. */}
      <body className="font-body antialiased">
          <FirebaseClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
