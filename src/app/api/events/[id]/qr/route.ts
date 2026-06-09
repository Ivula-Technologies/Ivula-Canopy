import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('checkin_token')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${event.checkin_token}`
  const png = await QRCode.toBuffer(url, { width: 400, margin: 2 })

  return new NextResponse(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
