
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const logoSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='10' fill='url(%23g)'/%3E%3Cpath d='M26 14C24.5 12.5 22.5 12 20 12C14.5 12 11 15.5 11 20C11 24.5 14.5 28 20 28C22.5 28 24.5 27.5 26 26' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M20 9V31' stroke='white' stroke-width='2.5' stroke-opacity='0.4' stroke-linecap='round'/%3E%3Ccircle cx='29' cy='11' r='4' fill='%2310b981' stroke='white' stroke-width='1.5'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='40' y2='40' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%233b82f6'/%3E%3Cstop offset='1' stop-color='%231d4ed8'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

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
