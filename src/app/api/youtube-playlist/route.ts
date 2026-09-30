import { NextRequest, NextResponse } from 'next/server'

interface PlaylistCacheEntry {
  videos: Array<{ id: string; title: string }>
  timestamp: number
}

// تخزين مؤقت في الذاكرة لتسريع الاستجابة وعدم استنزاف الطلبات
const playlistCache = new Map<string, PlaylistCacheEntry>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 ساعات

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const listId = (searchParams.get('list') || searchParams.get('id') || '').trim()

    if (!listId) {
      return NextResponse.json(
        { success: false, message: 'معرف قائمة التشغيل (list) مطلوب.' },
        { status: 400 }
      )
    }

    // فحص الكاش الداخلي
    const cached = playlistCache.get(listId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.videos.length > 0) {
      return NextResponse.json({
        success: true,
        listId,
        videos: cached.videos,
        total: cached.videos.length,
        fromCache: true,
      })
    }

    const videos: Array<{ id: string; title: string }> = []
    const seenIds = new Set<string>()

    // 1. المحاولة الأولى: جلب من تغذية RSS الرسمية لقوائم تشغيل YouTube
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`
      const res = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*',
        },
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const xmlText = await res.text()
        const entryMatches = xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)

        for (const entryMatch of entryMatches) {
          const entry = entryMatch[1]
          const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/)

          if (idMatch && idMatch[1]) {
            const vId = idMatch[1].trim()
            if (!seenIds.has(vId)) {
              seenIds.add(vId)
              videos.push({
                id: vId,
                title: titleMatch ? titleMatch[1].trim() : `المجلس ${videos.length + 1}`,
              })
            }
          }
        }
      }
    } catch (rssErr) {
      console.warn('[YouTube RSS Feed Warning]:', rssErr)
    }

    // 2. المحاولة الثانية: إن كانت القائمة أطول من نتائج RSS أو فشلت، استخراج الفيديوهات من صفحة YouTube HTML
    if (videos.length === 0) {
      try {
        const pageUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`
        const pageRes = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ar,en;q=0.9',
          },
        })

        if (pageRes.ok) {
          const html = await pageRes.text()
          // استخراج معرفات الفيديوهات المضمنة في بيانات ytInitialData
          const matches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)
          for (const match of matches) {
            const vId = match[1]
            if (!seenIds.has(vId)) {
              seenIds.add(vId)
              videos.push({
                id: vId,
                title: `المجلس ${videos.length + 1}`,
              })
            }
          }
        }
      } catch (pageErr) {
        console.warn('[YouTube Page Scraper Warning]:', pageErr)
      }
    }

    if (videos.length > 0) {
      playlistCache.set(listId, {
        videos,
        timestamp: Date.now(),
      })

      return NextResponse.json({
        success: true,
        listId,
        videos,
        total: videos.length,
      })
    }

    return NextResponse.json({
      success: false,
      message: 'لم يتم العثور على فيديوهات في قائمة التشغيل المحددة أو أنها خاصة.',
      listId,
      videos: [],
    })
  } catch (error: any) {
    console.error('❌ [YouTube Playlist API Error]:', error)
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء معالجة قائمة التشغيل.', error: error?.message },
      { status: 500 }
    )
  }
}
