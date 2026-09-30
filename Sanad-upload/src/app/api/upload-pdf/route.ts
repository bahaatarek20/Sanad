import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { verifyAdminSession } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    // تحقق أمني حاسم: لا يُسمح برفع ملفات PDF إلا للمشرف العام فقط
    const isAuthorized = await verifyAdminSession()
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالرفع: يتطلب صلاحيات المشرف العام' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    const headerFileName = req.headers.get('x-file-name')

    let originalName = 'document.pdf'
    let fileStream: ReadableStream<Uint8Array> | null = null
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
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ success: false, error: 'لم يتم تحديد أي ملف للرفع' }, { status: 400 })
      }
      originalName = file.name
      reportedSize = file.size
      fileStream = file.stream()
    } else if (req.body) {
      originalName = 'document.pdf'
      fileStream = req.body
    }

    if (!fileStream) {
      return NextResponse.json({ success: false, error: 'لم يتم استلام أي بيانات صالحة لملف الـ PDF' }, { status: 400 })
    }

    const isPdf = originalName.toLowerCase().endsWith('.pdf') || contentType.includes('pdf')
    if (!isPdf) {
      return NextResponse.json({ success: false, error: 'الملف المرفوع يجب أن يكون بصيغة PDF فقط' }, { status: 400 })
    }

    // تجهيز مجلدات التخزين
    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs')
    const dataUploadDir = path.join(process.cwd(), 'data', 'pdfs')

    await fs.promises.mkdir(publicUploadDir, { recursive: true }).catch(() => {})
    await fs.promises.mkdir(dataUploadDir, { recursive: true }).catch(() => {})

    // تنظيف اسم الملف وحفظه بأمان
    const rawBase = path.basename(originalName, '.pdf').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_').substring(0, 50)
    const timePrefix = Date.now().toString(36)
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const safeFileName = `sanad_pdf_${timePrefix}_${randomSuffix}_${rawBase}.pdf`

    const dataFilePath = path.join(dataUploadDir, safeFileName)
    const publicFilePath = path.join(publicUploadDir, safeFileName)

    // دفق البيانات مباشرة للقرص لتحقيق أقصى سرعة دون استهلاك الذاكرة
    // @ts-expect-error Readable.fromWeb exists in Node.js 18+
    const nodeReadable = Readable.fromWeb(fileStream)
    const writeStream = fs.createWriteStream(dataFilePath)
    await pipeline(nodeReadable, writeStream)

    let finalSize = reportedSize
    try {
      const stat = await fs.promises.stat(dataFilePath)
      finalSize = stat.size
    } catch {}

    // نسخ متزامن غير معطل في الخلفية للمجلد العام
    fs.promises.copyFile(dataFilePath, publicFilePath).catch(() => {})

    const fileUrl = `/api/pdf/${encodeURIComponent(safeFileName)}`
    const staticUrl = `/uploads/pdfs/${encodeURIComponent(safeFileName)}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      staticUrl,
      fileName: safeFileName,
      originalName,
      size: finalSize,
    })
  } catch (error) {
    console.error('Error uploading PDF:', error)
    return NextResponse.json({ success: false, error: 'حدث خطأ في الخادم أثناء حفظ ملف الـ PDF' }, { status: 500 })
  }
}
