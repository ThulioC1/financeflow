
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinanceFlow',
    short_name: 'FinanceFlow',
    description: 'Seu assistente financeiro pessoal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#71b7ef',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
