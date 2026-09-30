import { NextResponse } from 'next/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  getStudentMessages,
  getUnreadCount,
  markMessageAsRead,
  markAllMessagesAsRead,
  deleteMessage,
  depositWelcomeMessage,
} from '@/lib/messages-service'

export async function GET(request: Request) {
  try {
    const user = await getCurrentStudentUser()

    // حماية أمنية صارمة: لا يُسمح بقراءة الرسائل ورموز التحقق إلا للمستخدم الموثق جلسته فعلياً
    if (!user || !user.email) {
      return NextResponse.json({
        messages: [],
        unreadCount: 0,
        authenticated: false,
      })
    }

    const email = user.email.trim().toLowerCase()
    let messages = getStudentMessages(email)

    // إذا كان الطالب جديداً ولا توجد رسائل بعد، أودع له رسالة ترحيبية فورية
    if (messages.length === 0) {
      const studentName =
        user?.user_metadata?.full_name ||
        (email.includes('@') ? email.split('@')[0] : email) ||
        'طالب العلم'
      depositWelcomeMessage(email, studentName)
      messages = getStudentMessages(email)
    }

    const unreadCount = getUnreadCount(email)

    const normalizedMessages = messages.map((m) => {
      const senderVal = m.senderName || m.senderTitle || 'إدارة منصة سَنَد'
      return {
        ...m,
        sender: senderVal,
        senderName: senderVal,
        read: m.isRead ?? false,
        isRead: m.isRead ?? false,
        createdAt: m.timestamp || new Date().toISOString(),
        timestamp: m.timestamp || new Date().toISOString(),
        type: m.category || 'academic',
        category: m.category || 'academic',
        otpCode: m.verificationCode || undefined,
        verificationCode: m.verificationCode || undefined,
      }
    })

    return NextResponse.json({
      messages: normalizedMessages,
      unreadCount,
      authenticated: !!user,
      email,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentStudentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 })
    }

    const email = user.email.trim().toLowerCase()
    const body = await request.json()
    const { action, messageId } = body

    if (action === 'mark-read' && messageId) {
      const success = markMessageAsRead(messageId, email)
      return NextResponse.json({ success, unreadCount: getUnreadCount(email) })
    }

    if (action === 'mark-all-read') {
      const success = markAllMessagesAsRead(email)
      return NextResponse.json({ success, unreadCount: 0 })
    }

    if (action === 'delete' && messageId) {
      const success = deleteMessage(messageId, email)
      return NextResponse.json({ success, unreadCount: getUnreadCount(email) })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
