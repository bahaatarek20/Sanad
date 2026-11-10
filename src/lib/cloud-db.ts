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
  runTransaction,
} from 'firebase/firestore'
import type { StudentActivityRecord, PlatformEvent } from '@/lib/student-tracking'
import type { CommunityPost, CommunityReply } from '@/components/community-hub'

const STUDENTS_COLLECTION = 'students'
const COMMUNITY_POSTS_COLLECTION = 'community_posts'
const PLATFORM_EVENTS_COLLECTION = 'platform_events'

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

function sanitizeForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      cleaned[key] = null
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      cleaned[key] = sanitizeForFirestore(val as Record<string, unknown>)
    } else {
      cleaned[key] = val
    }
  }
  return cleaned
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
      const safeStudentPayload = sanitizeForFirestore({
        ...(student as unknown as Record<string, unknown>),
        email: cleanEmail,
        avatarUrl: student.avatarUrl || null,
        bio: student.bio ?? '',
        username: student.username || null,
        educationLevel: student.educationLevel || null,
        phone: student.phone || null,
        academic_id: student.scholarlyId || null,
        scholarlyId: student.scholarlyId || null,
        streak_count: student.streak_count ?? student.streak ?? 1,
        last_streak_cycle: student.last_streak_cycle ?? null,
        last_active_at: student.last_active_at || student.lastActive || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const writes: Promise<unknown>[] = [
        setDoc(docRef, safeStudentPayload, { merge: true }),
      ]

      if (student.id) {
        const userDocRef = doc(db, 'users', student.id)
        writes.push(
          setDoc(
            userDocRef,
            sanitizeForFirestore({
              uid: student.id,
              email: cleanEmail,
              fullName: student.name,
              username: student.username || null,
              bio: student.bio ?? '',
              educationLevel: student.educationLevel || null,
              phoneNumber: student.phone || null,
              avatarUrl: student.avatarUrl || null,
              status: student.isBanned ? 'banned' : 'active',
              role: student.role || 'student',
              roleUpdatedAt: student.roleUpdatedAt || new Date().toISOString(),
              scholarlyId: student.scholarlyId || null,
              academic_id: student.scholarlyId || null,
              streak_count: student.streak_count ?? student.streak ?? 1,
              last_streak_cycle: student.last_streak_cycle ?? null,
              last_active_at: student.last_active_at || student.lastActive || new Date().toISOString(),
              ip: student.ip || null,
              country: student.country || null,
              city: student.city || null,
              device: student.device || null,
              browser: student.browser || null,
              currentPage: student.currentPage || null,
              lastAction: student.lastAction || null,
              lastLoginAt: student.lastActive || new Date().toISOString(),
            }),
            { merge: true }
          )
        )
      }
      await Promise.allSettled(writes)
      return true
    })(),
    false,
    2000
  )
}

/**
 * 1.5 جلب بيانات طالب واحد من Cloud Firestore مباشرة عبر بريده الإلكتروني
 */
export async function getSingleStudentFromCloud(email: string): Promise<StudentActivityRecord | null> {
  if (isFirestoreCoolingDown()) return null
  const cleanEmail = (email || '').toLowerCase().trim()
  if (!cleanEmail) return null
  return withCloudTimeout(
    (async () => {
      const studentDocId = cleanEmail.replace(/[.#$[\]]/g, '_')
      const snap = await getDoc(doc(db, STUDENTS_COLLECTION, studentDocId))
      if (snap.exists()) {
        const data = snap.data() as StudentActivityRecord
        if (data && data.email) {
          return data
        }
      }
      return null
    })(),
    null,
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

      const [snapshotRes, usersSnapshotRes, deletedConfigRes] = await Promise.allSettled([
        getDocs(q),
        getDocs(usersQ),
        getDoc(doc(db, 'platform_config', 'deleted_students')),
      ])

      const deletedEmailsSet = new Set<string>()
      if (deletedConfigRes.status === 'fulfilled' && deletedConfigRes.value.exists()) {
        const delData = deletedConfigRes.value.data()
        if (Array.isArray(delData?.emails)) {
          delData.emails.forEach((em: unknown) => {
            if (typeof em === 'string' && em.trim()) {
              deletedEmailsSet.add(em.toLowerCase().trim())
            }
          })
        }
      }

      if (snapshotRes.status === 'fulfilled') {
        snapshotRes.value.forEach((d) => {
          const raw = d.data() as Record<string, unknown>
          if (raw && raw.email && typeof raw.email === 'string') {
            const cleanEm = raw.email.toLowerCase().trim()
            if (!deletedEmailsSet.has(cleanEm)) {
              const data = raw as unknown as StudentActivityRecord
              // ضمان قراءة academic_id وحقول الحماسة
              if (!data.scholarlyId && typeof raw.academic_id === 'string') {
                data.scholarlyId = raw.academic_id
              }
              if (typeof raw.streak_count === 'number') {
                data.streak_count = raw.streak_count
                data.streak = raw.streak_count
              }
              if (typeof raw.last_streak_cycle === 'number') {
                data.last_streak_cycle = raw.last_streak_cycle
              }
              if (typeof raw.last_active_at === 'string') {
                data.last_active_at = raw.last_active_at
              }
              studentsMap.set(cleanEm, data)
            }
          }
        })
      }

      if (usersSnapshotRes.status === 'fulfilled') {
        usersSnapshotRes.value.forEach((d) => {
          const u = d.data() as Record<string, unknown>
          const email = typeof u.email === 'string' ? u.email.toLowerCase().trim() : ''
          if (!email || deletedEmailsSet.has(email)) return

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
      const nowIso = new Date().toISOString()

      const payload = {
        ...stats,
        updatedAt: nowIso,
      }

      await Promise.allSettled([
        setDoc(summaryRef, payload, { merge: true }),
        setDoc(
          siteStatsRef,
          {
            totalVisits: typeof stats.totalVisitors === 'number' ? stats.totalVisitors : (stats.totalVisits || 0),
            unregisteredVisitors: typeof stats.unregisteredVisitors === 'number' ? stats.unregisteredVisitors : 0,
            registeredVisitsCount: typeof stats.registeredVisitsCount === 'number' ? stats.registeredVisitsCount : 0,
            totalUsers: typeof stats.totalRegisteredStudents === 'number' ? stats.totalRegisteredStudents : (stats.totalUsers || 0),
            statsResetAt: stats.statsResetAt || null,
            lastUpdated: nowIso,
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

      const summaryData =
        snapRes.status === 'fulfilled' && snapRes.value.exists() ? snapRes.value.data() : null
      const siteData =
        siteSnapRes.status === 'fulfilled' && siteSnapRes.value.exists() ? siteSnapRes.value.data() : null

      if (summaryData) {
        return {
          totalVisitors:
            typeof summaryData.totalVisitors === 'number'
              ? summaryData.totalVisitors
              : siteData?.totalVisits || 0,
          unregisteredVisitors:
            typeof summaryData.unregisteredVisitors === 'number'
              ? summaryData.unregisteredVisitors
              : siteData?.unregisteredVisitors || 0,
          registeredVisitsCount:
            typeof summaryData.registeredVisitsCount === 'number'
              ? summaryData.registeredVisitsCount
              : siteData?.registeredVisitsCount || 0,
          totalRegisteredStudents:
            typeof summaryData.totalRegisteredStudents === 'number'
              ? summaryData.totalRegisteredStudents
              : siteData?.totalUsers || 0,
          ...siteData,
          ...summaryData,
        }
      }

      if (siteData) {
        return {
          totalVisitors: siteData.totalVisits || 0,
          unregisteredVisitors: siteData.unregisteredVisitors || 0,
          registeredVisitsCount: siteData.registeredVisitsCount || 0,
          totalRegisteredStudents: siteData.totalUsers || 0,
          ...siteData,
        }
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

/**
 * 16. حذف عضو/طالب نهائياً من Cloud Firestore (مجموعتي students و users + تسجيله في سجل الحذف السيادي)
 */
export async function deleteStudentFromCloud(
  email: string,
  id?: string,
  allDeletedEmails?: string[]
): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      const cleanEmail = email.toLowerCase().trim()
      if (!cleanEmail || cleanEmail === 'bhaaljml480@gmail.com') return false

      const studentDocId = cleanEmail.replace(/[.#$[\]]/g, '_')
      const ops: Promise<unknown>[] = [
        deleteDoc(doc(db, STUDENTS_COLLECTION, studentDocId)),
        deleteDoc(doc(db, STUDENTS_COLLECTION, cleanEmail)),
      ]

      if (id) {
        ops.push(deleteDoc(doc(db, 'users', id)))
        ops.push(deleteDoc(doc(db, STUDENTS_COLLECTION, id)))
      }

      // حذف أي مستند مرتبط بهذا البريد في مجموعتي users و students
      try {
        const usersQ = query(collection(db, 'users'), where('email', '==', cleanEmail))
        const studentsQ = query(collection(db, STUDENTS_COLLECTION), where('email', '==', cleanEmail))
        const [uSnap, sSnap] = await Promise.allSettled([getDocs(usersQ), getDocs(studentsQ)])
        if (uSnap.status === 'fulfilled') {
          uSnap.value.forEach((d) => {
            ops.push(deleteDoc(doc(db, 'users', d.id)))
          })
        }
        if (sSnap.status === 'fulfilled') {
          sSnap.value.forEach((d) => {
            ops.push(deleteDoc(doc(db, STUDENTS_COLLECTION, d.id)))
          })
        }
      } catch {}

      // توثيق الحذف السيادي في platform_config/deleted_students لمنع إعادة مزامنته
      try {
        const delDocRef = doc(db, PLATFORM_CONFIG_COLLECTION, 'deleted_students')
        let existingList: string[] = Array.isArray(allDeletedEmails) ? [...allDeletedEmails] : []
        if (existingList.length === 0) {
          const snap = await getDoc(delDocRef)
          if (snap.exists() && Array.isArray(snap.data()?.emails)) {
            existingList = snap.data().emails as string[]
          }
        }
        const merged = Array.from(new Set([...existingList.map((e) => e.toLowerCase().trim()), cleanEmail]))
        ops.push(
          setDoc(
            delDocRef,
            {
              emails: merged,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          )
        )
      } catch {}

      await Promise.allSettled(ops)
      return true
    })(),
    false,
    2000
  )
}

/**
 * 17. حفظ حدث نشاط مباشر في Cloud Firestore (للبث الفوري لحركة الحسابات عبر جميع حاويات السيرفرلس)
 */
export async function savePlatformEventToCloud(event: PlatformEvent): Promise<boolean> {
  if (isFirestoreCoolingDown()) return false
  return withCloudTimeout(
    (async () => {
      if (!event || !event.id) return false
      const docRef = doc(db, PLATFORM_EVENTS_COLLECTION, event.id)
      await setDoc(docRef, {
        ...event,
        updatedAt: new Date().toISOString(),
      })
      return true
    })(),
    false,
    1200
  )
}

/**
 * 18. جلب أحدث أحداث وتحركات الحسابات من Cloud Firestore
 */
export async function getPlatformEventsFromCloud(maxLimit = 40): Promise<PlatformEvent[]> {
  if (isFirestoreCoolingDown()) return []
  return withCloudTimeout(
    (async () => {
      const colRef = collection(db, PLATFORM_EVENTS_COLLECTION)
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return []
      const events: PlatformEvent[] = []
      snapshot.forEach((d) => {
        const data = d.data() as PlatformEvent
        if (data && data.id && data.description) {
          events.push(data)
        }
      })
      return events
    })(),
    [],
    1500
  )
}

/**
 * 19. العداد الذري (Atomic Counter) لتوليد المعرف الأكاديمي المتسلسل (SND-XXXX)
 * يضمن منع أي تضارب تزامن (Race Condition) عند تسجيل طالب جديد في نفس اللحظة
 */
export async function getNextAtomicScholarlyId(): Promise<string> {
  const counterRef = doc(db, 'site_stats', 'scholarly_counter')
  try {
    const nextNum = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef)
      // قاعدة البداية هي 119 طالباً المسجلين بالفعل في المنصة
      let currentVal = 119
      if (snap.exists()) {
        const data = snap.data()
        if (typeof data.last_id === 'number' && data.last_id >= 119) {
          currentVal = data.last_id
        }
      }
      const newVal = currentVal + 1
      transaction.set(counterRef, { last_id: newVal, updatedAt: new Date().toISOString() }, { merge: true })
      return newVal
    })
    return `SND-${nextNum}`
  } catch (err) {
    console.warn('Atomic counter transaction notice, checking cloud students fallback:', err)
    try {
      const students = await getStudentsFromCloud()
      let max = 119
      for (const s of students) {
        const extraAcademicId = (s as unknown as { academic_id?: string }).academic_id || ''
        const raw = (s.scholarlyId || extraAcademicId).trim()
        if (raw.startsWith('SND-')) {
          const num = parseInt(raw.replace('SND-', ''), 10)
          if (!isNaN(num) && num > max) max = num
        }
      }
      return `SND-${max + 1}`
    } catch {}
    return ''

  }
}






