import { NextRequest, NextResponse } from 'next/server'
import { verifyPhoneOtp } from '@/lib/phone-auth-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, code, countryCode } = body

    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          message: 'يرجى إدخال رقم الهاتف ورمز التحقق.',
        },
        { status: 400 }
      )
    }

    const result = await verifyPhoneOtp(phone, code, countryCode || '+20')

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
      phone: result.phone,
      studentName: result.studentName,
    })
  } catch (error: any) {
    console.error('❌ [API /api/auth/verify-otp Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'حدث خطأ أثناء التحقق من الرمز.',
        error: error?.message,
      },
      { status: 500 }
    )
  }
}
