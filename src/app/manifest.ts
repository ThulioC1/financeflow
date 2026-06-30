
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const logoSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='url(%23g)'/%3E%3Cpath d='M12 28V12H28M12 20H24M18 28L28 18' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='28' cy='18' r='3' fill='%2310b981'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='40' y2='40' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%233b82f6'/%3E%3Cstop offset='1' stop-color='%231d4ed8'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

  return {
    name: 'Ca$hOrd - Organizador Financeiro',
    short_name: 'Ca$hOrd',
    description: 'Seu organizador financeiro pessoal para manter suas contas em ordem.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: logoSvg,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: logoSvg,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
