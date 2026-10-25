import type { MetadataRoute } from 'next'

// Lets church staff add Canopy to their phone's home screen and open it like
// an app (full screen, own icon), straight into the dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ivula Canopy',
    short_name: 'Canopy',
    description: 'Members, volunteer shifts, events and attendance for your church or nonprofit.',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#1b3d33',
    categories: ['productivity', 'business'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Events', url: '/events' },
      { name: 'Members', url: '/members' },
      { name: 'Tasks', url: '/tasks' },
    ],
  }
}
