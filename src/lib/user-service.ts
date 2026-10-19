import { db, auth } from '@/lib/firebase/config'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { sendPasswordResetEmail, signOut } from 'firebase/auth'

export interface SanadUser {
  uid: string
  fullName: string
  email: string
  phoneNumber?: string | null
  role: 'student' | 'admin'
  status: 'active' | 'banned'
  avatarUrl?: string | null
  createdAt?: string | Timestamp | null
  lastLoginAt?: string | Timestamp | null
  totalStudyMinutes?: number
  completedCourses?: string[]
}

export const SUPER_ADMIN_EMAIL = 'bhaaljml480@gmail.com'

export const ADMIN_EMAILS = [
  'bhaaljml480@gmail.com',
]

/**
 * 1. تسجيل أو مزامنة مستند المستخدم في Cloud Firestore عند إنشاء حساب جديد أو تسجيل دخول
 */
export async function syncUserToFirestore(
  uid: string,
  data: {
    fullName: string
    email: string
    phoneNumber?: string | null
    avatarUrl?: string | null
    isNewUser?: boolean
  }
): Promise<SanadUser> {
  const cleanEmail = (data.email || '').toLowerCase().trim()
  const isDefaultAdmin = cleanEmail === SUPER_ADMIN_EMAIL
  const userRef = doc(db, 'users', uid)

  // الحالة الأولى: مستخدم جديد ينشأ لأول مرة
  // لا نحتاج إطلاقاً إلى استعلام getDoc لأن الحساب جديد، وبذلك نتفادى خطأ "client is offline"
  if (data.isNewUser) {
    const newUser: Record<string, unknown> = {
      uid,
      fullName: data.fullName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phoneNumber: data.phoneNumber || null,
      role: isDefaultAdmin ? 'admin' : 'student',
      status: 'active',
      avatarUrl: data.avatarUrl || null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      totalStudyMinutes: 0,
      completedCourses: [],
    }

    try {
      await setDoc(userRef, newUser, { merge: true })
    } catch (e) {
      console.warn('syncUserToFirestore (new user setDoc):', e)
    }

    // زيادة عداد إجمالي المستخدمين في site_stats/overview
    try {
      const statsRef = doc(db, 'site_stats', 'overview')
      await setDoc(
        statsRef,
        {
          totalUsers: increment(1),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (e) {
      console.warn('Could not increment totalUsers in site_stats:', e)
    }

    // مزامنة فورية دائمة في مجموعة students لضمان ظهور الطالب في لوحة الإدارة دون انقطاع
    try {
      const studentDocId = cleanEmail.replace(/[.#$[\]]/g, '_')
      const studentDocRef = doc(db, 'students', studentDocId)
      await setDoc(
        studentDocRef,
        {
          id: uid,
          email: cleanEmail,
          name: data.fullName || cleanEmail.split('@')[0],
          phone: data.phoneNumber || null,
          avatarUrl: data.avatarUrl || null,
          authProvider: cleanEmail.endsWith('@gmail.com') ? 'google' : data.phoneNumber ? 'phone' : 'email',
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          totalStudyMinutes: 0,
          streak: 0,
          completedCourses: [],
          notesCount: 0,
          isBanned: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (e) {
      console.warn('Could not sync to students collection in Firestore:', e)
    }

    return {
      uid,
      fullName: data.fullName,
      email: cleanEmail,
      phoneNumber: data.phoneNumber || null,
      role: isDefaultAdmin ? 'admin' : 'student',
      status: 'active',
      avatarUrl: data.avatarUrl || null,
    }
  }

  // الحالة الثانية: مستخدم مسجل مسبقاً، محاولة القراءة بأمان تام ضد انقطاع الشبكة
  let existingSnap = null
  try {
    existingSnap = await getDoc(userRef)
  } catch (err) {
    console.warn('syncUserToFirestore: getDoc failed (offline or network error):', err)
  }

  if (!existingSnap || !existingSnap.exists()) {
    // في حال عدم وجود المستند أو تعذر جلبه بسبب offline: ننشئه/ندمجه بأمان
    const fallbackUser: Record<string, unknown> = {
      uid,
      fullName: data.fullName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phoneNumber: data.phoneNumber || null,
      role: isDefaultAdmin ? 'admin' : 'student',
      status: 'active',
      avatarUrl: data.avatarUrl || null,
      lastLoginAt: serverTimestamp(),
    }

    try {
      await setDoc(userRef, fallbackUser, { merge: true })
    } catch (e) {
      console.warn('syncUserToFirestore fallback setDoc failed:', e)
    }

    return {
      uid,
      fullName: data.fullName,
      email: cleanEmail,
      phoneNumber: data.phoneNumber || null,
      role: isDefaultAdmin ? 'admin' : 'student',
      status: 'active',
      avatarUrl: data.avatarUrl || null,
    }
  } else {
    // مستخدم موجود بالفعل: تحديث وقت آخر ظهور ومعلومات الاتصال
    const existingData = existingSnap.data() as SanadUser
    const updates: Record<string, unknown> = {
      lastLoginAt: serverTimestamp(),
    }

    if (data.fullName && data.fullName !== existingData.fullName) {
      updates.fullName = data.fullName
    }
    if (data.avatarUrl) {
      updates.avatarUrl = data.avatarUrl
    }
    if (data.phoneNumber && !existingData.phoneNumber) {
      updates.phoneNumber = data.phoneNumber
    }
    if (isDefaultAdmin && existingData.role !== 'admin') {
      updates.role = 'admin'
    }

    try {
      await updateDoc(userRef, updates)
    } catch (e) {
      console.warn('syncUserToFirestore updateDoc failed:', e)
    }

    return {
      ...existingData,
      role: isDefaultAdmin ? 'admin' : existingData.role,
      fullName: (updates.fullName as string) || existingData.fullName,
    }
  }
}

/**
 * 2. التحقق من حالة حساب المستخدم وصلاحيته (Active vs Banned)
 */
export async function verifyUserAccount(uid: string): Promise<{
  allowed: boolean
  role: 'student' | 'admin'
  status: 'active' | 'banned'
  message?: string
  user: SanadUser | null
}> {
  try {
    const userRef = doc(db, 'users', uid)
    const snap = await getDoc(userRef)

    if (!snap.exists()) {
      return { allowed: true, role: 'student', status: 'active', user: null }
    }

    const data = snap.data() as SanadUser

    if (data.status === 'banned') {
      await signOut(auth).catch(() => {})
      return {
        allowed: false,
        role: data.role || 'student',
        status: 'banned',
        message: 'تم تجميد حسابك، يُرجى التواصل مع إدارة منصة سَنَد للمراجعة.',
        user: data,
      }
    }

    // تحديث تاريخ آخر ظهور
    updateDoc(userRef, { lastLoginAt: serverTimestamp() }).catch(() => {})

    return {
      allowed: true,
      role: data.role || 'student',
      status: 'active',
      user: data,
    }
  } catch (err) {
    console.warn('Error verifying user account in Firestore:', err)
    return { allowed: true, role: 'student', status: 'active', user: null }
  }
}

/**
 * 3. ترقية أو تعديل صلاحية المستخدم (طالب / مشرف)
 */
export async function updateUserRole(uid: string, newRole: 'student' | 'admin'): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const data = snap.data() as SanadUser
      if (data.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL && newRole !== 'admin') {
        console.warn('Cannot demote super admin bhaaljml480@gmail.com')
        return false
      }
    }
    await updateDoc(userRef, { role: newRole })
    return true
  } catch (err) {
    console.error('Error updating user role:', err)
    return false
  }
}

/**
 * 4. حظر أو تنشيط حساب مستخدم فورياً
 */
export async function toggleUserBanStatus(uid: string, newStatus: 'active' | 'banned'): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { status: newStatus })
    return true
  } catch (err) {
    console.error('Error toggling user ban status:', err)
    return false
  }
}

/**
 * 5. إرسال رابط إعادة تعيين كلمة المرور عبر البريد الإلكتروني الرسمي
 */
export async function sendUserPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email)
    return {
      success: true,
      message: `تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد: ${email}`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `تعذر إرسال الرابط: ${msg}`,
    }
  }
}

/**
 * 6. زيادة عداد إجمالي الزيارات في site_stats/overview
 */
export async function recordSiteVisit(): Promise<void> {
  try {
    const statsRef = doc(db, 'site_stats', 'overview')
    await setDoc(
      statsRef,
      {
        totalVisits: increment(1),
        lastVisitAt: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (err) {
    console.warn('Error recording site visit in Firestore:', err)
  }
}

/**
 * 7. الاشتراك الحي في قائمة المستخدمين المحدثة لحظياً
 */
export function subscribeToUsers(callback: (users: SanadUser[]) => void): () => void {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const users: SanadUser[] = []
      snapshot.forEach((d) => {
        const u = d.data() as SanadUser
        users.push({
          ...u,
          uid: d.id,
        })
      })
      callback(users)
    },
    (err) => {
      console.warn('Users live feed snapshot error:', err)
    }
  )
}

/**
 * 8. الاشتراك الحي في إحصائيات الموقع الكلية (site_stats/overview)
 */
export function subscribeToOverviewStats(
  callback: (stats: { totalUsers: number; totalVisits: number; lastUpdated?: string }) => void
): () => void {
  const statsRef = doc(db, 'site_stats', 'overview')

  return onSnapshot(
    statsRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        callback({
          totalUsers: data.totalUsers || 0,
          totalVisits: data.totalVisits || 0,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : undefined,
        })
      }
    },
    (err) => {
      console.warn('Overview stats snapshot error:', err)
    }
  )
}
