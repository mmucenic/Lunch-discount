import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cheap is Cheap',
    short_name: 'Cheap is Cheap',
    description: 'Lunch deals and discount codes near Canary Wharf, London.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#059669',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
