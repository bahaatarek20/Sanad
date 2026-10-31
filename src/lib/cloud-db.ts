import { db } from '@/lib/firebase/config'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import type { StudentActivityRecord } from '@/lib/student-tracking'
import type { CommunityPost, CommunityReply } from '@/components/community-hub'

const STUDENTS_COLLECTION = 'students'
const COMMUNITY_POSTS_COLLECTION = 'community_posts'

let firestoreDisabledNoticeLogged = false
let firestoreCooldownUntil = 0

function isFirestoreCoolingDown(): boolean {
  return Date.now() < firestoreCooldownUntil
}

function withCloudTimeout<T>(operation: Promise<T>, fallback: T, timeoutMs = 1500): Promise<T> {
  if (isFirestoreCoolingDown()) {
    return Promise.resolve(fallback)
  }
  return new Promise<T>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        firestoreCooldownUntil = Date.now() + 20000
        resolve(fallback)
      }
    }, timeoutMs)

    operation
      .then((res) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(res)
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          firestoreCooldownUntil = Date.now() + 20000
          logFirestoreNotice(err)
          resolve(fallback)
        }
      })
  })
}

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
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const cleanEmail = student.email.toLowerCase().trim()
      const studentDocId = cleanEmail.replace(/[.#$[\]]/g, '_')
      const docRef = doc(db, STUDENTS_COLLECTION, studentDocId)
      const writes: Promise<unknown>[] = [
        setDoc(
          docRef,
          {
            ...student,
            email: cleanEmail,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
      ]

      if (student.id) {
        const userDocRef = doc(db, 'users', student.id)
        writes.push(
          setDoc(
            userDocRef,
            {
              uid: student.id,
              email: cleanEmail,
              fullName: student.name,
              phoneNumber: student.phone || null,
              avatarUrl: student.avatarUrl || null,
              status: student.isBanned ? 'banned' : 'active',
              role: student.role || 'student',
              roleUpdatedAt: student.roleUpdatedAt || new Date().toISOString(),
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
        )
      }
      await Promise.allSettled(writes)
      return true
    })(),
    false,
    1500
  )
}

/**
 * 2. جلب كافة الطلاب من Cloud Firestore (دمج مجموعتي students و users لضمان عدم فقدان أي حساب مسجل)
 */
export async function getStudentsFromCloud(): Promise<StudentActivityRecord[]> {
  if (isFirestoreCoolingDown()) return []
  return withCloudTimeout(
    (async () => {
      const studentsMap = new Map<string, StudentActivityRecord>()

      const colRef = collection(db, STUDENTS_COLLECTION)
      const q = query(colRef, limit(300))
      const usersColRef = collection(db, 'users')
      const usersQ = query(usersColRef, limit(300))

      const [snapshotRes, usersSnapshotRes] = await Promise.allSettled([getDocs(q), getDocs(usersQ)])

      if (snapshotRes.status === 'fulfilled') {
        snapshotRes.value.forEach((d) => {
          const data = d.data() as StudentActivityRecord
          if (data && data.email) {
            studentsMap.set(data.email.toLowerCase().trim(), data)
          }
        })
      }

      if (usersSnapshotRes.status === 'fulfilled') {
        usersSnapshotRes.value.forEach((d) => {
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

          const uRoleUpdatedAt = typeof u.roleUpdatedAt === 'string' ? u.roleUpdatedAt : ''

          if (existing) {
            if (u.fullName && typeof u.fullName === 'string') existing.name = u.fullName
            if (u.phoneNumber && typeof u.phoneNumber === 'string') existing.phone = u.phoneNumber
            if (u.avatarUrl && typeof u.avatarUrl === 'string') existing.avatarUrl = u.avatarUrl
            if (u.status === 'banned') existing.isBanned = true
            const existingRoleUpdatedAt = existing.roleUpdatedAt || ''
            if (
              (u.role === 'admin' || u.role === 'student') &&
              (!existing.role || (uRoleUpdatedAt && uRoleUpdatedAt > existingRoleUpdatedAt))
            ) {
              existing.role = u.role
              if (uRoleUpdatedAt) existing.roleUpdatedAt = uRoleUpdatedAt
            }
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
              role: u.role === 'admin' || u.role === 'student' ? u.role : undefined,
              roleUpdatedAt: uRoleUpdatedAt || undefined,
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
      }

      return Array.from(studentsMap.values())
    })(),
    [],
    1800
  )
}

/**
 * 3. حفظ منشور جديد في مجلس المذاكرة (الرسايل التشاركية) في Cloud Firestore
 */
export async function saveCommunityPostToCloud(post: CommunityPost): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, post.id)
      await setDoc(docRef, {
        ...post,
        replies: Array.isArray(post.replies) ? post.replies : [],
        updatedAt: new Date().toISOString(),
      })
      return true
    })(),
    false,
    1500
  )
}

/**
 * 4. جلب المنشورات التشاركية الحديثة من Cloud Firestore
 */
export async function getCommunityPostsFromCloud(): Promise<CommunityPost[]> {
  if (isFirestoreCoolingDown()) return []
  return withCloudTimeout(
    (async () => {
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
    })(),
    [],
    1500
  )
}

/**
 * 5. إضافة رد على منشور تشاركي في Cloud Firestore
 */
export async function addCommunityReplyToCloud(
  postId: string,
  reply: CommunityReply
): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
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
    })(),
    false,
    1500
  )
}

/**
 * 6. تسجيل إعجاب بمنشور تشاركي في Cloud Firestore
 */
export async function upvoteCommunityPostInCloud(postId: string): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
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
    })(),
    false,
    1500
  )
}

/**
 * 7. حذف منشور تشاركي من Cloud Firestore (مشرف فقط)
 */
export async function deleteCommunityPostFromCloud(postId: string): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId)
      await deleteDoc(docRef)
      return true
    })(),
    false,
    1500
  )
}

/**
 * 8. حذف رد تشاركي من Cloud Firestore (مشرف فقط)
 */
export async function deleteCommunityReplyFromCloud(
  postId: string,
  replyId: string
): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
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
    })(),
    false,
    1500
  )
}

const PLATFORM_STATS_COLLECTION = 'platform_stats'

/**
 * 9. حفظ إحصائيات المنصة في Cloud Firestore (بما فيها site_stats/overview و platform_stats)
 */
export async function savePlatformStatsToCloud(stats: Record<string, unknown>): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
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
    })(),
    false,
    1500
  )
}

/**
 * 10. جلب إحصائيات المنصة من Cloud Firestore
 */
export async function getPlatformStatsFromCloud(): Promise<Record<string, unknown> | null> {
  if (isFirestoreCoolingDown()) return null
  return withCloudTimeout(
    (async () => {
      const siteStatsRef = doc(db, 'site_stats', 'overview')
      const docRef = doc(db, PLATFORM_STATS_COLLECTION, 'summary')
      const [siteSnapRes, snapRes] = await Promise.allSettled([getDoc(siteStatsRef), getDoc(docRef)])

      if (siteSnapRes.status === 'fulfilled' && siteSnapRes.value.exists()) {
        const d = siteSnapRes.value.data()
        return {
          totalVisitors: d.totalVisits || 0,
          totalRegisteredStudents: d.totalUsers || 0,
          ...d,
        }
      }

      if (snapRes.status === 'fulfilled' && snapRes.value.exists()) {
        return snapRes.value.data()
      }
      return null
    })(),
    null,
    1500
  )
}

/**
 * 11. تحديث رتبة وصلاحية العضو في Cloud Firestore (مجموعتي students و users)
 */
export async function updateCloudStudentRole(
  email: string,
  id: string | undefined,
  role: 'owner' | 'student' | 'admin'
): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const cleanEmail = email.toLowerCase().trim()
      const nowIso = new Date().toISOString()
      const studentDocId = cleanEmail.replace(/[.#$[\]]/g, '_')
      const studentDocRef = doc(db, STUDENTS_COLLECTION, studentDocId)
      const ops: Promise<unknown>[] = [
        setDoc(
          studentDocRef,
          { role, roleUpdatedAt: nowIso, lastActive: nowIso, updatedAt: nowIso },
          { merge: true }
        ),
      ]

      if (id) {
        const userDocRef = doc(db, 'users', id)
        ops.push(setDoc(userDocRef, { role, roleUpdatedAt: nowIso, lastUpdated: nowIso }, { merge: true }))
      }

      try {
        const usersColRef = collection(db, 'users')
        const q = query(usersColRef, where('email', '==', cleanEmail))
        const snap = await getDocs(q)
        snap.forEach((docSnap) => {
          ops.push(
            setDoc(
              doc(db, 'users', docSnap.id),
              { role, roleUpdatedAt: nowIso, lastUpdated: nowIso },
              { merge: true }
            )
          )
        })
      } catch {}

      await Promise.allSettled(ops)
      return true
    })(),
    false,
    1500
  )
}

export const addReplyToCloudPost = addCommunityReplyToCloud
export const upvoteCloudPost = upvoteCommunityPostInCloud

const CERTIFICATES_COLLECTION = 'certificates'
const PLATFORM_CONFIG_COLLECTION = 'platform_config'

/**
 * 12. حفظ إجازة علمية موثقة في Cloud Firestore لضمان التحقق العالمي الدائم عبر QR Code
 */
export async function saveCertificateToCloud(cert: Record<string, unknown>): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const id = String(cert.id || cert.serialNumber || '').toLowerCase().trim()
      if (!id) return false
      const docRef = doc(db, CERTIFICATES_COLLECTION, id)
      await setDoc(
        docRef,
        {
          ...cert,
          id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      return true
    })(),
    false,
    1500
  )
}

/**
 * 13. استرجاع إجازة علمية من Cloud Firestore بالمعرف أو الرقم التسلسلي
 */
export async function getCertificateFromCloud(
  idOrSerial: string
): Promise<Record<string, unknown> | null> {
  if (isFirestoreCoolingDown()) return null
  return withCloudTimeout(
    (async () => {
      const clean = idOrSerial.trim().toLowerCase()
      if (!clean) return null
      const docRef = doc(db, CERTIFICATES_COLLECTION, clean)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        return snap.data() as Record<string, unknown>
      }
      return null
    })(),
    null,
    1500
  )
}

/**
 * 14. حفظ إعدادات المنصة العامة (الإعلانات، الفنون، تخصيصات المتون) في Cloud Firestore
 */
export async function savePlatformConfigToCloud(
  key: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const docRef = doc(db, PLATFORM_CONFIG_COLLECTION, key)
      await setDoc(
        docRef,
        {
          ...payload,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      return true
    })(),
    false,
    1500
  )
}

/**
 * 15. جلب إعدادات المنصة العامة من Cloud Firestore
 */
export async function getPlatformConfigFromCloud(
  key: string
): Promise<Record<string, unknown> | null> {
  if (isFirestoreCoolingDown()) return null
  return withCloudTimeout(
    (async () => {
      const docRef = doc(db, PLATFORM_CONFIG_COLLECTION, key)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        return snap.data() as Record<string, unknown>
      }
      return null
    })(),
    null,
    1500
  )
}



