import { NextRequest, NextResponse } from 'next/server'
import { sendOtpToPhone } from '@/lib/phone-auth-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, studentName, countryCode } = body

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: 'رقم الهاتف مطلوب.',
        },
        { status: 400 }
      )
    }

    const result = await sendOtpToPhone(phone, studentName, countryCode || '+20')

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      formattedPhone: result.formattedPhone,
    })
  } catch (error: any) {
    console.error('❌ [API /api/auth/send-otp Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'فشل إرسال رمز التحقق. يرجى المحاولة لاحقاً.',
        error: error?.message,
      },
      { status: 500 }
    )
  }
}
