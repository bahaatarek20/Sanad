import { NextResponse, type NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getCurrentStudentUser, setStudentSessionCookie } from '@/lib/auth-helper'
import { updateStudentExtendedProfile } from '@/lib/student-tracking'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * فحص البصمة الرقمية للملف (Magic Bytes) للتأكد الصارم أنه صورة حقيقية وليس ملفاً تنفيذياً أو نصياً متنكراً
 */
function detectImageMimeFromMagicBytes(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buf || buf.length < 12) return null

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png'
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentStudentUser()
    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.' },
        { status: 401 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let imageBuffer: Buffer | null = null
    let detectedMime: 'image/jpeg' | 'image/png' | 'image/webp' | null = null
    let compactDataUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('avatar') as File | null
      const compressedDataUrl = formData.get('compressedDataUrl') as string | null

      if (file && file.size > 0) {
        if (file.size > MAX_AVATAR_BYTES) {
          return NextResponse.json(
            { success: false, error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).' },
            { status: 400 }
          )
        }
        if (file.type && !ALLOWED_MIMES.has(file.type)) {
          return NextResponse.json(
            { success: false, error: 'صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط.' },
            { status: 400 }
          )
        }
        const arrayBuf = await file.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuf)
        detectedMime = detectImageMimeFromMagicBytes(imageBuffer)
        if (!detectedMime) {
          return NextResponse.json(
            { success: false, error: 'تم رفض الملف أمنياً: الملف المرفوع ليس صورة صالحة (Invalid Image Magic Bytes).' },
            { status: 400 }
          )
        }
      }

      if (compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
        const match = compressedDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
        if (!match) {
          return NextResponse.json(
            { success: false, error: 'بيانات الصورة المضغوطة غير صالحة.' },
            { status: 400 }
          )
        }
        const buf = Buffer.from(match[2], 'base64')
        const magicMime = detectImageMimeFromMagicBytes(buf)
        if (!magicMime) {
          return NextResponse.json(
            { success: false, error: 'تم رفض بيانات الصورة أمنياً لعدم تطابق البصمة الرقمية.' },
            { status: 400 }
          )
        }
        if (!imageBuffer) {
          imageBuffer = buf
          detectedMime = magicMime
        }
        if (compressedDataUrl.length <= 250000) {
          compactDataUrl = compressedDataUrl
        }
      }
    } else {
      const body = await request.json().catch(() => ({}))
      const dataUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : ''
      if (dataUrl.startsWith('preset:')) {
        const updateRes = updateStudentExtendedProfile(user.email, { avatarUrl: dataUrl })
        if (!updateRes.success) {
          return NextResponse.json({ success: false, error: updateRes.error }, { status: 400 })
        }
        await setStudentSessionCookie(user.user_metadata?.full_name || 'طالب العلم', user.email, {
          avatarUrl: dataUrl,
          role: user.role,
          sessionVersion: updateRes.student?.sessionVersion,
        })
        return NextResponse.json({ success: true, avatarUrl: dataUrl })
      }

      const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'صيغة الصورة غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WebP.' },
          { status: 400 }
        )
      }
      imageBuffer = Buffer.from(match[2], 'base64')
      if (imageBuffer.length > MAX_AVATAR_BYTES) {
        return NextResponse.json(
          { success: false, error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).' },
          { status: 400 }
        )
      }
      detectedMime = detectImageMimeFromMagicBytes(imageBuffer)
      if (!detectedMime) {
        return NextResponse.json(
          { success: false, error: 'تم رفض الملف أمنياً: الملف المرفوع ليس صورة حقيقية.' },
          { status: 400 }
        )
      }
      if (dataUrl.length <= 250000) {
        compactDataUrl = dataUrl
      }
    }

    if (!imageBuffer || !detectedMime) {
      return NextResponse.json(
        { success: false, error: 'يرجى اختيار ملف صورة صالح للرفع.' },
        { status: 400 }
      )
    }

    // حفظ نسخة فعلية من الصورة على الخادم في public/uploads/avatars
    const ext = detectedMime === 'image/png' ? 'png' : detectedMime === 'image/webp' ? 'webp' : 'jpg'
    const safeUserPrefix = user.email.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)
    const fileName = `avatar_${safeUserPrefix}_${Date.now().toString(36)}.${ext}`
    const publicAvatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')

    try {
      await fs.promises.mkdir(publicAvatarDir, { recursive: true })
      await fs.promises.writeFile(path.join(publicAvatarDir, fileName), imageBuffer)
    } catch {}

    // استخدام Data URL المضغوط إذا كان متوفراً لضمان بقاء الصورة حتى في البيئات السحابية، وإلا المسار الثابت
    const finalAvatarUrl =
      compactDataUrl ||
      (imageBuffer.length <= 180000
        ? `data:${detectedMime};base64,${imageBuffer.toString('base64')}`
        : `/uploads/avatars/${fileName}`)

    const updateRes = updateStudentExtendedProfile(user.email, {
      avatarUrl: finalAvatarUrl,
    })

    if (!updateRes.success) {
      return NextResponse.json(
        { success: false, error: updateRes.error || 'تعذر حفظ الصورة الشخصية' },
        { status: 400 }
      )
    }

    await setStudentSessionCookie(
      updateRes.student?.name || user.user_metadata?.full_name || 'طالب العلم',
      user.email,
      {
        avatarUrl: finalAvatarUrl,
        role: updateRes.student?.role || user.role,
        sessionVersion: updateRes.student?.sessionVersion,
      }
    )

    return NextResponse.json({
      success: true,
      avatarUrl: finalAvatarUrl,
      fileUrl: `/uploads/avatars/${fileName}`,
      mimeType: detectedMime,
      sizeBytes: imageBuffer.length,
    })
  } catch (error: unknown) {
    console.error('Error in POST /api/profile/avatar:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء معالجة ورفع الصورة الشخصية.' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentStudentUser()
    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.' },
        { status: 401 }
      )
    }

    const updateRes = updateStudentExtendedProfile(user.email, {
      avatarUrl: null,
    })

    if (!updateRes.success) {
      return NextResponse.json(
        { success: false, error: updateRes.error || 'تعذر حذف الصورة الشخصية' },
        { status: 400 }
      )
    }

    await setStudentSessionCookie(
      updateRes.student?.name || user.user_metadata?.full_name || 'طالب العلم',
      user.email,
      {
        avatarUrl: null,
        role: updateRes.student?.role || user.role,
        sessionVersion: updateRes.student?.sessionVersion,
      }
    )

    return NextResponse.json({
      success: true,
      avatarUrl: null,
      message: 'تم حذف الصورة الشخصية والعودة إلى الصورة الافتراضية بنجاح.',
    })
  } catch (error: unknown) {
    console.error('Error in DELETE /api/profile/avatar:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف الصورة الشخصية.' },
      { status: 500 }
    )
  }
}
