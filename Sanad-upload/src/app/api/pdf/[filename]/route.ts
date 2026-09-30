import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function resolvePdfFile(filename: string) {
  let decodedFilename = filename
  try {
    decodedFilename = decodeURIComponent(filename)
  } catch {
    decodedFilename = filename
  }

  // حماية أمنية صارمة ضد ثغرات Path Traversal وقراءة الملفات الحساسة
  const safeFilename = path.basename(decodedFilename)
  if (
    !safeFilename ||
    safeFilename !== decodedFilename ||
    decodedFilename.includes('..') ||
    decodedFilename.includes('/') ||
    decodedFilename.includes('\\')
  ) {
    return null
  }

  const dataPdfsDir = path.join(process.cwd(), 'data', 'pdfs')
  const publicPdfsDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs')

  const dataUploadPath = path.join(dataPdfsDir, safeFilename)
  const publicUploadPath = path.join(publicPdfsDir, safeFilename)

  let targetPath = ''
  if (fs.existsSync(dataUploadPath)) {
    targetPath = dataUploadPath
  } else if (fs.existsSync(publicUploadPath)) {
    targetPath = publicUploadPath
  }

  if (!targetPath) return null

  // تأكيد إضافي بأن المسار الفعلي داخل المجلدات المسموحة فقط
  const resolvedTarget = path.resolve(targetPath)
  if (!resolvedTarget.startsWith(dataPdfsDir) && !resolvedTarget.startsWith(publicPdfsDir)) {
    return null
  }

  const stat = await fs.promises.stat(targetPath)
  return {
    targetPath,
    fileSize: stat.size,
    decodedFilename: safeFilename,
  }
}

export async function HEAD(
  req: Request,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await props.params
    const fileInfo = await resolvePdfFile(filename)
    if (!fileInfo) {
      return new Response(null, { status: 404 })
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileInfo.fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await props.params
    const fileInfo = await resolvePdfFile(filename)
    if (!fileInfo) {
      return NextResponse.json({ error: 'ملف الـ PDF غير موجود في خوادم المنصة' }, { status: 404 })
    }

    const { targetPath, fileSize, decodedFilename } = fileInfo
    const url = new URL(req.url)
    const isDownload = url.searchParams.get('download') === '1'

    const dispositionType = isDownload ? 'attachment' : 'inline'
    const cleanDisplayName = decodedFilename.replace(/^sanad_pdf_[a-z0-9]+_[a-z0-9]+_/, '')

    // دفق عالي السرعة بمخزن مؤقت 1 ميجابايت (1MB Buffer) للاستجابة الفورية
    const fileStream = fs.createReadStream(targetPath, { highWaterMark: 1024 * 1024 })
    // @ts-expect-error Readable.toWeb exists in modern Node.js
    const webStream = Readable.toWeb(fileStream)

    return new Response(webStream as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(cleanDisplayName)}"`,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving PDF:', error)
    return NextResponse.json({ error: 'تعذر قراءة أو تحميل ملف الـ PDF' }, { status: 500 })
  }
}
