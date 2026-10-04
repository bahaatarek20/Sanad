import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/mp4', // تفعيل التوافق الكامل مع متصفحات كروم وإيدج لنقل H.264
    '.mkv': 'video/mp4', // تفعيل التوافق مع فك الترميز المتصفحي لمحتوى Matroska/H.264
    '.avi': 'video/mp4',
    '.wmv': 'video/mp4',
    '.flv': 'video/mp4',
    '.ts': 'video/mp2t',
    '.ogv': 'video/ogg',
    '.ogg': 'video/ogg',
    '.3gp': 'video/3gpp',
    '.mpg': 'video/mp4',
    '.mpeg': 'video/mp4',
    '.m2ts': 'video/mp2t',
    '.mts': 'video/mp2t',
    '.vob': 'video/mp4',
    '.divx': 'video/mp4',
    '.f4v': 'video/mp4',
    '.asf': 'video/mp4',
  }
  return mimeMap[ext] || 'video/mp4'
}

async function resolveVideoFile(rawFilename: string) {
  if (!rawFilename) return null

  // 1. تنظيف أي شرطات مائلة زائدة في البداية أو النهاية (معالجة مشكلة .mp4/)
  let cleaned = rawFilename.replace(/^[\/\\]+|[\/\\]+$/g, '').trim()

  // 2. فك التشفير متعدد المراحل لضمان عدم تعطل الأسماء العربية المشفرة جزئياً أو كلياً
  let decodedFilename = cleaned
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decodedFilename)
      if (next === decodedFilename) break
      decodedFilename = next
    } catch {
      break
    }
  }
  decodedFilename = decodedFilename.replace(/^[\/\\]+|[\/\\]+$/g, '').trim()
  const safeFilename = path.basename(decodedFilename)

  if (!safeFilename || safeFilename.includes('..')) {
    return null
  }

  const dataVideosDir = path.join(process.cwd(), 'data', 'videos')
  const publicVideosDir = path.join(process.cwd(), 'public', 'uploads', 'videos')

  // 3. البحث المباشر في المجلدات المعتمدة
  const candidateNames = [
    safeFilename,
    decodedFilename,
    cleaned,
    path.basename(cleaned),
  ]

  let targetPath = ''
  for (const name of candidateNames) {
    if (!name) continue
    const p1 = path.join(dataVideosDir, name)
    const p2 = path.join(publicVideosDir, name)
    if (fs.existsSync(p1)) {
      targetPath = p1
      break
    }
    if (fs.existsSync(p2)) {
      targetPath = p2
      break
    }
  }

  // 4. بحث ذكي فائق الدقة باستخدام المعرف الفريد sanad_vid_xxxx_yyyy
  if (!targetPath) {
    const vidIdMatch = (decodedFilename || cleaned).match(/sanad_vid_[a-z0-9]+_[a-z0-9]+/i)
    if (vidIdMatch) {
      const prefix = vidIdMatch[0].toLowerCase()
      for (const dir of [dataVideosDir, publicVideosDir]) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir)
            const found = files.find((f) => f.toLowerCase().startsWith(prefix))
            if (found) {
              targetPath = path.join(dir, found)
              break
            }
          } catch {}
        }
      }
    }
  }

  // 5. بحث جزئي تقريبي بالاسم النظيف
  if (!targetPath && fs.existsSync(dataVideosDir)) {
    try {
      const allFiles = fs.readdirSync(dataVideosDir)
      const cleanRaw = safeFilename.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '').substring(0, 25)
      if (cleanRaw) {
        const found = allFiles.find((f) => {
          const cleanF = f.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '')
          return cleanF.includes(cleanRaw) || cleanRaw.includes(cleanF.substring(0, 25))
        })
        if (found) {
          targetPath = path.join(dataVideosDir, found)
        }
      }
    } catch {}
  }

  if (!targetPath || !fs.existsSync(targetPath)) return null

  const stat = await fs.promises.stat(targetPath)
  return {
    targetPath,
    fileSize: stat.size,
    contentType: getMimeType(targetPath || decodedFilename),
    decodedFilename: path.basename(targetPath),
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function HEAD(
  req: Request,
  props: { params: Promise<{ fileName?: string; filename?: string }> }
) {
  try {
    const resolvedParams = (await props.params) as Record<string, string>
    const rawFilename = resolvedParams.fileName || resolvedParams.filename || ''
    const fileInfo = await resolveVideoFile(rawFilename)

    if (!fileInfo) {
      return new Response(null, { status: 404 })
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileInfo.fileSize.toString(),
        'Content-Type': fileInfo.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ fileName?: string; filename?: string }> }
) {
  try {
    const resolvedParams = (await props.params) as Record<string, string>
    const rawFilename = resolvedParams.fileName || resolvedParams.filename || ''
    const fileInfo = await resolveVideoFile(rawFilename)

    if (!fileInfo) {
      return NextResponse.json({ error: 'ملف الفيديو غير موجود في الخادم' }, { status: 404 })
    }

    const { targetPath, fileSize, contentType, decodedFilename } = fileInfo
    const url = new URL(req.url)
    const isDownload = url.searchParams.get('download') === '1'
    const cleanDisplayName = decodedFilename.replace(/^sanad_vid_[a-z0-9]+_[a-z0-9]+_/, '')
    const disposition = isDownload ? `attachment; filename="${encodeURIComponent(cleanDisplayName)}"` : 'inline'

    const range = req.headers.get('range')

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/)
      if (!match) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        })
      }

      let start = match[1] ? parseInt(match[1], 10) : 0
      let end = match[2] ? parseInt(match[2], 10) : fileSize - 1

      if (!match[1] && match[2]) {
        const suffixLength = parseInt(match[2], 10)
        start = Math.max(0, fileSize - suffixLength)
        end = fileSize - 1
      }

      if (end >= fileSize) {
        end = fileSize - 1
      }

      if (start > end || start >= fileSize) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        })
      }

      const chunkSize = end - start + 1
      // دفق سريع جداً بمخزن مؤقت 1 ميجابايت (1MB Buffer)
      const fileStream = fs.createReadStream(targetPath, { start, end, highWaterMark: 1024 * 1024 })
      const webStream = Readable.toWeb(fileStream)

      return new Response(webStream as BodyInit, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } else {
      const fileStream = fs.createReadStream(targetPath, { highWaterMark: 1024 * 1024 })
      const webStream = Readable.toWeb(fileStream)

      return new Response(webStream as BodyInit, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  } catch (error) {
    console.error('Error streaming video:', error)
    return NextResponse.json({ error: 'تعذر تشغيل أو بث ملف الفيديو' }, { status: 500 })
  }
}
