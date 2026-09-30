import { NextResponse } from 'next/server'
import { getBroadcastNotice } from '@/lib/courses-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notice = getBroadcastNotice()
    return NextResponse.json({ success: true, notice })
  } catch {
    return NextResponse.json({ success: false, notice: null }, { status: 500 })
  }
}
