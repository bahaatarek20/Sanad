import { db } from '@/lib/firebase/config'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import type { StudentActivityRecord } from '@/lib/student-tracking'
import type { CommunityPost, CommunityReply } from '@/components/community-hub'

const STUDENTS_COLLECTION = 'students'
const COMMUNITY_POSTS_COLLECTION = 'community_posts'

let firestoreDisabledNoticeLogged = false

function logFirestoreNotice(err: unknown) {
  if (!firestoreDisabledNoticeLogged) {
    firestoreDisabledNoticeLogged = true
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      '⚠️ [Sanad Cloud DB]: تعذر الاتصال بـ Cloud Firestore، سيتم الاعتماد على الذاكرة السحابية المؤقتة والسجل المحلي.\n' +
        'لتفعيل المزامنة الدائمة لجميع الطلاب مجاناً، يرجى تفعيل Firestore من Firebase Console: ' +
        'https://console.firebase.google.com/project/sanad-3c558/firestore\n' +
        `تفاصيل الخطأ: ${msg}`
    )
  }
}

/**
 * 1. حفظ أو تحديث طالب في Cloud Firestore مع المزامنة المزدوجة (students + users)
 */
export async function saveStudentToCloud(student: StudentActivityRecord): Promise<boolean> {
  try {
    const studentDocId = student.email.replace(/[.#$[\]]/g, '_')
    const docRef = doc(db, STUDENTS_COLLECTION, studentDocId)
    await setDoc(
      docRef,
      {
        ...student,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    // مزامنة مستند users/{uid} أيضاً إذا كان معرف الحساب موجوداً
    if (student.id) {
      try {
        const userDocRef = doc(db, 'users', student.id)
        await setDoc(
          userDocRef,
          {
            uid: student.id,
            email: student.email,
            fullName: student.name,
            phoneNumber: student.phone || null,
            avatarUrl: student.avatarUrl || null,
            status: student.isBanned ? 'banned' : 'active',
            role: student.role || 'student',
            scholarlyId: student.scholarlyId,
            ip: student.ip,
            country: student.country,
            city: student.city,
            device: student.device,
            browser: student.browser,
            lastLoginAt: student.lastActive || new Date().toISOString(),
          },
          { merge: true }
        )
      } catch {}
    }
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 2. جلب كافة الطلاب من Cloud Firestore (دمج مجموعتي students و users لضمان عدم فقدان أي حساب مسجل)
 */
export async function getStudentsFromCloud(): Promise<StudentActivityRecord[]> {
  const studentsMap = new Map<string, StudentActivityRecord>()

  // أ. جلب الطلاب من مجموعة students
  try {
    const colRef = collection(db, STUDENTS_COLLECTION)
    const q = query(colRef, limit(300))
    const snapshot = await getDocs(q)

    snapshot.forEach((d) => {
      const data = d.data() as StudentActivityRecord
      if (data && data.email) {
        studentsMap.set(data.email.toLowerCase().trim(), data)
      }
    })
  } catch (err) {
    logFirestoreNotice(err)
  }

  // ب. جلب مستندات المستخدمين من مجموعة users ومطابقتها لضمان بقاء كل من سجل في Firebase Auth
  try {
    const usersColRef = collection(db, 'users')
    const usersQ = query(usersColRef, limit(300))
    const usersSnapshot = await getDocs(usersQ)

    usersSnapshot.forEach((d) => {
      const u = d.data() as Record<string, unknown>
      const email = typeof u.email === 'string' ? u.email.toLowerCase().trim() : ''
      if (!email) return

      const existing = studentsMap.get(email)
      const createdAtStr =
        u.createdAt && typeof (u.createdAt as { toDate?: () => Date }).toDate === 'function'
          ? (u.createdAt as { toDate: () => Date }).toDate().toISOString()
          : typeof u.createdAt === 'string'
          ? u.createdAt
          : new Date().toISOString()

      const lastLoginAtStr =
        u.lastLoginAt && typeof (u.lastLoginAt as { toDate?: () => Date }).toDate === 'function'
          ? (u.lastLoginAt as { toDate: () => Date }).toDate().toISOString()
          : typeof u.lastLoginAt === 'string'
          ? u.lastLoginAt
          : createdAtStr

      if (existing) {
        // تحديث الحقول إذا كان مستند users يحتوي على بيانات أحدث
        if (u.fullName && typeof u.fullName === 'string') existing.name = u.fullName
        if (u.phoneNumber && typeof u.phoneNumber === 'string') existing.phone = u.phoneNumber
        if (u.avatarUrl && typeof u.avatarUrl === 'string') existing.avatarUrl = u.avatarUrl
        if (u.status === 'banned') existing.isBanned = true
        if (u.role === 'admin' || u.role === 'student') existing.role = u.role
        if (u.scholarlyId && typeof u.scholarlyId === 'string') existing.scholarlyId = u.scholarlyId
        if (lastLoginAtStr > (existing.lastActive || '')) existing.lastActive = lastLoginAtStr
      } else {
        const isGmail = email.endsWith('@gmail.com')
        const newRecord: StudentActivityRecord = {
          id: d.id || (typeof u.uid === 'string' ? u.uid : `student_${Date.now()}`),
          scholarlyId: typeof u.scholarlyId === 'string' ? u.scholarlyId : undefined,
          email,
          name: (typeof u.fullName === 'string' && u.fullName.trim()) || email.split('@')[0],
          phone: typeof u.phoneNumber === 'string' ? u.phoneNumber : undefined,
          avatarUrl: typeof u.avatarUrl === 'string' ? u.avatarUrl : undefined,
          authProvider: isGmail ? 'google' : u.phoneNumber ? 'phone' : 'email',
          role: (u.role === 'admin' || u.role === 'student') ? u.role : undefined,
          registeredAt: createdAtStr,
          lastActive: lastLoginAtStr,
          totalStudyMinutes: typeof u.totalStudyMinutes === 'number' ? u.totalStudyMinutes : 0,
          streak: 0,
          completedCourses: Array.isArray(u.completedCourses) ? (u.completedCourses as string[]) : [],
          completedEpisodesMap: {},
          dailyStudyLog: {},
          listenedSessions: [],
          notesCount: 0,
          isBanned: u.status === 'banned',
        }
        studentsMap.set(email, newRecord)
      }
    })
  } catch (err) {
    logFirestoreNotice(err)
  }

  return Array.from(studentsMap.values())
}

/**
 * 3. حفظ منشور جديد في مجلس المذاكرة (الرسايل التشاركية) في Cloud Firestore
 */
export async function saveCommunityPostToCloud(post: CommunityPost): Promise<boolean> {
  try {
    const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, post.id)
    await setDoc(docRef, {
      ...post,
      replies: Array.isArray(post.replies) ? post.replies : [],
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 4. جلب المنشورات التشاركية الحديثة من Cloud Firestore
 */
export async function getCommunityPostsFromCloud(): Promise<CommunityPost[]> {
  try {
    const colRef = collection(db, COMMUNITY_POSTS_COLLECTION)
    const q = query(colRef, orderBy('created_at', 'desc'), limit(100))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return []
    }

    const posts: CommunityPost[] = []
    snapshot.forEach((d) => {
      const data = d.data() as CommunityPost
      if (data && data.id && data.content) {
        posts.push({
          ...data,
          replies: Array.isArray(data.replies) ? data.replies : [],
        })
      }
    })

    return posts
  } catch (err) {
    logFirestoreNotice(err)
    return []
  }
}

/**
 * 5. إضافة رد على منشور تشاركي في Cloud Firestore
 */
export async function addCommunityReplyToCloud(
  postId: string,
  reply: CommunityReply
): Promise<boolean> {
  try {
    const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return false
    }

    const postData = snap.data() as CommunityPost
    const existingReplies = Array.isArray(postData.replies) ? postData.replies : []
    const updatedReplies = [...existingReplies, reply]

    await setDoc(
      docRef,
      {
        replies: updatedReplies,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 6. تسجيل إعجاب بمنشور تشاركي في Cloud Firestore
 */
export async function upvoteCommunityPostInCloud(postId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return false
    }

    const postData = snap.data() as CommunityPost
    const currentUpvotes = Number(postData.upvotes_count) || 0

    await setDoc(
      docRef,
      {
        upvotes_count: currentUpvotes + 1,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 7. حذف منشور تشاركي من Cloud Firestore (مشرف فقط)
 */
export async function deleteCommunityPostFromCloud(postId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId)
    await deleteDoc(docRef)
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 8. حذف رد تشاركي من Cloud Firestore (مشرف فقط)
 */
export async function deleteCommunityReplyFromCloud(
  postId: string,
  replyId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return false
    }

    const postData = snap.data() as CommunityPost
    const existingReplies = Array.isArray(postData.replies) ? postData.replies : []
    const updatedReplies = existingReplies.filter((r) => r.id !== replyId)

    await setDoc(
      docRef,
      {
        replies: updatedReplies,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

const PLATFORM_STATS_COLLECTION = 'platform_stats'

/**
 * 9. حفظ إحصائيات المنصة في Cloud Firestore (بما فيها site_stats/overview و platform_stats)
 */
export async function savePlatformStatsToCloud(stats: Record<string, unknown>): Promise<boolean> {
  try {
    const summaryRef = doc(db, PLATFORM_STATS_COLLECTION, 'summary')
    const siteStatsRef = doc(db, 'site_stats', 'overview')

    const payload = {
      ...stats,
      updatedAt: new Date().toISOString(),
    }

    await Promise.allSettled([
      setDoc(summaryRef, payload, { merge: true }),
      setDoc(
        siteStatsRef,
        {
          totalVisits: stats.totalVisitors || stats.totalVisits || 0,
          totalUsers: stats.totalRegisteredStudents || stats.totalUsers || 0,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      ),
    ])
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 10. جلب إحصائيات المنصة من Cloud Firestore
 */
export async function getPlatformStatsFromCloud(): Promise<Record<string, unknown> | null> {
  try {
    const siteStatsRef = doc(db, 'site_stats', 'overview')
    const siteSnap = await getDoc(siteStatsRef)
    if (siteSnap.exists()) {
      const d = siteSnap.data()
      return {
        totalVisitors: d.totalVisits || 0,
        totalRegisteredStudents: d.totalUsers || 0,
        ...d,
      }
    }

    const docRef = doc(db, PLATFORM_STATS_COLLECTION, 'summary')
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return snap.data()
    }
    return null
  } catch (err) {
    logFirestoreNotice(err)
    return null
  }
}

/**
 * 11. تحديث رتبة وصلاحية العضو في Cloud Firestore (مجموعتي students و users)
 */
export async function updateCloudStudentRole(
  email: string,
  id: string | undefined,
  role: 'student' | 'admin'
): Promise<boolean> {
  try {
    const studentDocId = email.replace(/[.#$[\]]/g, '_')
    const studentDocRef = doc(db, STUDENTS_COLLECTION, studentDocId)
    await setDoc(studentDocRef, { role, updatedAt: new Date().toISOString() }, { merge: true })

    if (id) {
      try {
        const userDocRef = doc(db, 'users', id)
        await setDoc(userDocRef, { role, lastUpdated: new Date().toISOString() }, { merge: true })
      } catch {}
    }
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

