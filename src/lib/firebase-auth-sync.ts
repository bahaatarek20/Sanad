const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBr8Ch1B8YCx6AC7uTcrZIhD5D3s-iSxy4'

/**
 * مزامنة تلقائية لإنشاء أو تأكيد وجود الطالب في نظام Firebase Authentication
 * يعمل في السيرفر (Server-Side) عبر واجهة Google Identity Toolkit REST API الرسمية
 */
export async function syncStudentToFirebaseAuth(
  email: string,
  password?: string,
  displayName?: string
): Promise<{ success: boolean; localId?: string; isNew?: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'عنوان البريد غير صالح' }
  }

  const defaultPassword = password || 'SanadStudent@2026'

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: defaultPassword,
          returnSecureToken: true,
        }),
      }
    )

    const data = await res.json()

    if (res.ok && data.localId) {
      // تم إنشاء الحساب بنجاح كحساب جديد في Firebase Authentication
      if (displayName) {
        // تحديث الاسم المعروض في ملف Auth
        try {
          await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: data.idToken,
                displayName: displayName.trim(),
                returnSecureToken: false,
              }),
            }
          )
        } catch {}
      }

      return { success: true, localId: data.localId, isNew: true }
    }

    if (data?.error?.message === 'EMAIL_EXISTS') {
      // المستخدم مسجل مسبقاً بالفعل في Firebase Authentication
      return { success: true, isNew: false }
    }

    return { success: false, error: data?.error?.message || 'تعذر تسجيل المستخدم في Firebase' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
