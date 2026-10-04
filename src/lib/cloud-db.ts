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
 * 1. حفظ أو تحديث طالب في Cloud Firestore
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
    return true
  } catch (err) {
    logFirestoreNotice(err)
    return false
  }
}

/**
 * 2. جلب كافة الطلاب من Cloud Firestore
 */
export async function getStudentsFromCloud(): Promise<StudentActivityRecord[]> {
  try {
    const colRef = collection(db, STUDENTS_COLLECTION)
    const q = query(colRef, limit(200))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return []
    }

    const students: StudentActivityRecord[] = []
    snapshot.forEach((d) => {
      const data = d.data() as StudentActivityRecord
      if (data && data.email) {
        students.push(data)
      }
    })

    return students
  } catch (err) {
    logFirestoreNotice(err)
    return []
  }
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
