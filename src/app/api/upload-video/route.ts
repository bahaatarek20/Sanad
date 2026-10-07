import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { verifyAdminSession } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

async function verifySafeMediaFile(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.promises.open(filePath, 'r')
    const headerBuf = Buffer.alloc(32)
    await fd.read(headerBuf, 0, 32, 0)
    await fd.close()

    const ascii = headerBuf.toString('ascii')
    const hex = headerBuf.toString('hex')

    // حظر البرمجيات التنفيذية والسكربتات الخبيثة (MZ, ELF, Shebang, PHP, Script tags)
    if (
      ascii.startsWith('MZ') ||
      hex.startsWith('7f454c46') ||
      ascii.startsWith('#!') ||
      ascii.startsWith('<?php') ||
      ascii.includes('<script')
    ) {
      return false
    }
    return true
  } catch {
    return true
  }
}

export async function POST(req: Request) {
  try {
    // تحقق أمني حاسم: لا يُسمح برفع الفيديوهات ومجالس المتون إلا للمشرف العام فقط
    const isAuthorized = await verifyAdminSession()
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالرفع: يتطلب صلاحيات المشرف العام' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    const headerFileName = req.headers.get('x-file-name')

    // معرّفات الرفع المجزأ فائق السرعة (Chunked Streaming Upload)
    const chunkIndexStr = req.headers.get('x-chunk-index')
    const totalChunksStr = req.headers.get('x-total-chunks')
    const uploadId = req.headers.get('x-upload-id')

    const isChunked = chunkIndexStr !== null && totalChunksStr !== null && Boolean(uploadId)

    // تجهيز مجلد التخزين الأساسي للفيديوهات
    const dataVideosDir = path.join(process.cwd(), 'data', 'videos')
    if (!fs.existsSync(dataVideosDir)) {
      fs.mkdirSync(dataVideosDir, { recursive: true })
    }

    const publicVideosDir = path.join(process.cwd(), 'public', 'uploads', 'videos')
    try {
      if (!fs.existsSync(publicVideosDir)) {
        fs.mkdirSync(publicVideosDir, { recursive: true })
      }
    } catch {}

    // ═══════════════════════════════════════════════════════
    // 1. نظام الرفع المجزأ عالي الكفاءة (High-Performance Chunked Stream)
    // ═══════════════════════════════════════════════════════
    if (isChunked && uploadId) {
      const chunkIndex = parseInt(chunkIndexStr || '0', 10)
      const totalChunks = parseInt(totalChunksStr || '1', 10)
      let originalName = 'video.mp4'
      if (headerFileName) {
        try {
          originalName = decodeURIComponent(headerFileName)
        } catch {
          originalName = headerFileName
        }
      }

      const tempDir = path.join(dataVideosDir, '.tmp_chunks')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const cleanUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '')
      const partFilePath = path.join(tempDir, `${cleanUploadId}.part`)

      if (chunkIndex === 0 && fs.existsSync(partFilePath)) {
        try {
          fs.unlinkSync(partFilePath)
        } catch {}
      }

      // كتابة بيانات الجزء مباشرة عبر stream pipeline لتقليل استهلاك الذاكرة وتسريع الكتابة للقرص
      if (req.body) {
        // @ts-expect-error Readable.fromWeb exists in Node.js 18+
        const nodeReadable = Readable.fromWeb(req.body)
        const appendStream = fs.createWriteStream(partFilePath, { flags: 'a', highWaterMark: 1024 * 1024 })
        await pipeline(nodeReadable, appendStream)
      } else {
        const chunkBuffer = Buffer.from(await req.arrayBuffer())
        await fs.promises.appendFile(partFilePath, chunkBuffer)
      }

      // إذا لم تكتمل كافة الأجزاء بعد، نؤكد استلام الجزء فوراً
      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({
          success: true,
          chunkReceived: chunkIndex + 1,
          totalChunks,
          progressPercent: Math.round(((chunkIndex + 1) / totalChunks) * 100),
        })
      }

      // ── اكتملت كافة الأجزاء! تجميع وتسمية الملف النهائي ──
      const rawExt = path.extname(originalName).toLowerCase()
      const ext = rawExt || '.mp4'
      const rawBase = path.basename(originalName, rawExt)
      const cleanBase = rawBase.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_').substring(0, 45)
      const timePrefix = Date.now().toString(36)
      const randomSuffix = Math.random().toString(36).substring(2, 6)
      const safeFileName = `sanad_vid_${timePrefix}_${randomSuffix}_${cleanBase}${ext}`

      const dataFilePath = path.join(dataVideosDir, safeFileName)
      const publicFilePath = path.join(publicVideosDir, safeFileName)

      // نقل فوري للملف المؤقت إلى المكان النهائي
      await fs.promises.rename(partFilePath, dataFilePath)

      // فحص البصمة السحرية للتأكد من خلوه من أي برمجيات تنفيذية
      const isSafe = await verifySafeMediaFile(dataFilePath)
      if (!isSafe) {
        await fs.promises.unlink(dataFilePath).catch(() => {})
        return NextResponse.json(
          { success: false, error: 'أمان الرفع: تم حظر الملف لاحتوائه على ترويسة تنفيذية أو برمجية غير مسموح بها' },
          { status: 400 }
        )
      }

      let finalSize = 0
      try {
        const stat = await fs.promises.stat(dataFilePath)
        finalSize = stat.size
      } catch {}

      const fileUrl = `/api/video/${encodeURIComponent(safeFileName)}`

      return NextResponse.json({
        success: true,
        url: fileUrl,
        staticUrl: fileUrl,
        fileName: safeFileName,
        originalName,
        size: finalSize,
        extension: ext,
      })
    }

    // ═══════════════════════════════════════════════════════
    // 2. نظام الرفع المباشر الأحادي السريع (Single-Stream Direct Upload)
    // ═══════════════════════════════════════════════════════
    let fileStream: ReadableStream<Uint8Array> | null = null
    let originalName = ''
    let reportedSize = 0

    if (headerFileName && req.body) {
      try {
        originalName = decodeURIComponent(headerFileName)
      } catch {
        originalName = headerFileName
      }
      fileStream = req.body
      const sizeHeader = req.headers.get('content-length')
      reportedSize = sizeHeader ? parseInt(sizeHeader, 10) : 0
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (!file) {
          return NextResponse.json({ success: false, error: 'لم يتم تحديد أي ملف للرفع' }, { status: 400 })
        }
        originalName = file.name
        reportedSize = file.size
        fileStream = file.stream()
      } catch (formErr: unknown) {
        if (req.body) {
          originalName = headerFileName ? decodeURIComponent(headerFileName) : 'uploaded_video.mp4'
          fileStream = req.body
        } else {
          const msg = formErr instanceof Error ? formErr.message : String(formErr)
          return NextResponse.json(
            {
              success: false,
              error: `تعذر تحليل بيانات النموذج: ${msg}`,
            },
            { status: 400 }
          )
        }
      }
    } else if (req.body) {
      originalName = headerFileName ? decodeURIComponent(headerFileName) : 'video.mp4'
      fileStream = req.body
    }

    if (!fileStream) {
      return NextResponse.json({ success: false, error: 'لم يتم استلام أي بيانات صالحة لملف الفيديو' }, { status: 400 })
    }

    const rawExt = path.extname(originalName).toLowerCase()
    const ext = rawExt || '.mp4'
    const rawBase = path.basename(originalName, rawExt)
    const cleanBase = rawBase.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_').substring(0, 45)
    const timePrefix = Date.now().toString(36)
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const safeFileName = `sanad_vid_${timePrefix}_${randomSuffix}_${cleanBase}${ext}`

    const dataFilePath = path.join(dataVideosDir, safeFileName)
    const publicFilePath = path.join(publicVideosDir, safeFileName)

    // دفق البيانات مباشرة للقرص الصلب بمخزن مؤقت فائق 4 ميجابايت لسرعة نقل داخلية فائقة
    // @ts-expect-error Readable.fromWeb exists in Node.js 18+
    const nodeReadable = Readable.fromWeb(fileStream)
    const writeStream = fs.createWriteStream(dataFilePath, { highWaterMark: 4 * 1024 * 1024 })
    await pipeline(nodeReadable, writeStream)

    let finalSize = reportedSize
    try {
      const stat = await fs.promises.stat(dataFilePath)
      finalSize = stat.size
    } catch {}

    // فحص البصمة السحرية للتأكد من خلوه من أي برمجيات تنفيذية
    const isSafe = await verifySafeMediaFile(dataFilePath)
    if (!isSafe) {
      await fs.promises.unlink(dataFilePath).catch(() => {})
      return NextResponse.json(
        { success: false, error: 'أمان الرفع: تم حظر الملف لاحتوائه على ترويسة تنفيذية أو برمجية غير مسموح بها' },
        { status: 400 }
      )
    }

      const fileUrl = `/api/video/${encodeURIComponent(safeFileName)}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      staticUrl: fileUrl,
      fileName: safeFileName,
      originalName,
      size: finalSize,
      extension: ext,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Error uploading video:', errorMsg, error)
    return NextResponse.json(
      { success: false, error: `حدث خطأ في الخادم أثناء حفظ ملف الفيديو: ${errorMsg}` },
      { status: 500 }
    )
  }
}
