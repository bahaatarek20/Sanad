import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyAdminSession, SANAD_ADMIN_ENTRY_KEY } from '@/lib/admin-security'
import { getActiveCourses, getBroadcastNotice, getActiveCategories } from '@/lib/courses-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Sanad Universal Waqf Export Engine (محرّك التصدير والأرشفة الوقفية الشاملة)
 * ═════════════════════════════════════════════════════════════════════════════
 * يتيح تصدير كافة المتون والدروس والتسجيلات والمصادر بضغطة زر واحدة كحزمة JSON قياسية
 * قابلة للنقل الفوري لأي سيرفر، أو استعادتها مستقبلاً دون الارتهان لأي مزود سحابي.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const queryKey = url.searchParams.get('key')
    const isDirectDownload = url.searchParams.get('download') === 'true'

    // التحقق الأمني: جلسة المشرف أو مفتاح الأرشفة المباشر
    const isSessionAuth = await verifyAdminSession()
    const isKeyAuth = queryKey === SANAD_ADMIN_ENTRY_KEY

    if (!isSessionAuth && !isKeyAuth) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح: يتطلب صلاحية المشرف العام لتصدير الأرشيف الوقفي' },
        { status: 401 }
      )
    }

    const courses = getActiveCourses()
    const categories = getActiveCategories()
    const broadcast = getBroadcastNotice()

    let totalEpisodes = 0
    courses.forEach((c) => {
      totalEpisodes += c.episodes?.length || 0
    })

    const payloadWithoutChecksum = {
      $schema: 'https://sanad.edu/schema/curriculum-archive-v1.json',
      metadata: {
        platform: 'منصة سَنَد للتعليم والتأصيل الشرعي',
        version: '2.4.0',
        purpose: 'أرشيف وقفي شامل للعلوم والمتون الشرعية - غير تجاري لوجه الله تعالى',
        license: 'Waqf-Lillah (وقف لله تعالى، علم نافع لا يباع ولا يشترى)',
        supervisor: 'المهندس بهاء طارق',
        exportedAt: new Date().toISOString(),
        totalCourses: courses.length,
        totalEpisodes,
        totalCategories: categories.length,
      },
      categories,
      courses,
      broadcast,
    }

    const rawString = JSON.stringify(payloadWithoutChecksum)
    const checksumSha256 = crypto.createHash('sha256').update(rawString).digest('hex')

    const fullArchive = {
      ...payloadWithoutChecksum,
      metadata: {
        ...payloadWithoutChecksum.metadata,
        checksumSha256,
      },
    }

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `sanad-waqf-archive-${dateStr}.json`

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'x-sanad-checksum-sha256': checksumSha256,
    }

    if (isDirectDownload) {
      responseHeaders['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new NextResponse(JSON.stringify(fullArchive, null, 2), {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error('Error generating curriculum archive:', error)
    return NextResponse.json(
      { success: false, error: `فشل إنشاء الأرشيف الوقفي: ${error.message || String(error)}` },
      { status: 500 }
    )
  }
}
