import { assetLinks } from '@/lib/app-platform'

// Read at request time, so a fingerprint added in cPanel works after a restart.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(assetLinks(), { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
