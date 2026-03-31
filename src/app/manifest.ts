
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinanceFlow - Gestão Financeira',
    short_name: 'FinanceFlow',
    description: 'Seu assistente financeiro pessoal de alta performance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: 'https://picsum.photos/seed/financeflow/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://picsum.photos/seed/financeflow/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/financeflow/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
