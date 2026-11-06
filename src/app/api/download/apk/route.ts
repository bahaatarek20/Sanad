import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const apkPath = path.join(process.cwd(), 'public', 'downloads', 'Sanad.apk')
    if (!fs.existsSync(apkPath)) {
      return new NextResponse('APK file not found', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(apkPath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="Sanad.apk"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return new NextResponse('Error reading APK file', { status: 500 })
  }
}
