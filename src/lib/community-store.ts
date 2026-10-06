import fs from 'fs'
import path from 'path'
import os from 'os'
import { CommunityPost, CommunityReply } from '@/components/community-hub'

const DATA_DIR = path.join(process.cwd(), 'data')
const POSTS_FILE = path.join(DATA_DIR, 'sanad_community_posts.json')
const UPLOAD_POSTS_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_community_posts.json')

const TMP_DIR = path.join(os.tmpdir(), 'sanad_data')
const TMP_POSTS_FILE = path.join(TMP_DIR, 'sanad_community_posts.json')

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post_1791322058729_su39',
    anonymous_alias: 'طالب علم #494',
    course_slug: null,
    post_type: 'benefit',
    content: 'نفع الله بكم',
    upvotes_count: 5,
    created_at: '2026-10-06T21:27:38.729Z',
    replies: [],
  },
  {
    id: 'post_1791137785398_2w4c',
    anonymous_alias: 'طالب تأصيل #663',
    course_slug: null,
    post_type: 'benefit',
    content: 'تبارك الله',
    upvotes_count: 4,
    created_at: '2026-10-04T18:16:25.398Z',
    replies: [],
  },
  {
    id: 'sample-1',
    anonymous_alias: 'طالب علم #412',
    course_slug: 'al-usul-min-ilmil-usul',
    post_type: 'benefit',
    content: 'قاعدة مفيدة قيّدتها من شرح الشيخ ابن عثيمين في الأصول: «الأصل في الأمر الوجوب إلا لصارف، والأصل في النهي التحريم إلا لدليل».. الفرق الجوهري بين الصارف والدليل المخصص يحتاج عناية أثناء مدارسة مباحث دلالات الألفاظ.',
    upvotes_count: 14,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    replies: [
      {
        id: 'rep-1',
        post_id: 'sample-1',
        anonymous_alias: 'باحث في الفقه #89',
        content: 'أحسنت القيد! ومن أمثلة الصارف في السنة الأمر بالسواك عند كل صلاة؛ صُرف من الوجوب إلى الاستحباب بحديث: «لولا أن أشق على أمتي».',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'sample-2',
    anonymous_alias: 'مستفهم في الأصول #15',
    course_slug: 'al-bayquniyyah',
    post_type: 'question',
    content: 'استشكل عليّ الفرق بين "المرسل" و"المنقطع" عند الإمام البيقوني رحمه الله في قوله: (ومرسل منه الصحابي سقط.. وكل ما لم يتصل به انقطاع). هل كل مرسل منقطع اصطلاحاً؟',
    upvotes_count: 9,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    replies: [
      {
        id: 'rep-2',
        post_id: 'sample-2',
        anonymous_alias: 'محرر للحديث #74',
        content: 'نعم يا أخي الكريم؛ المنقطع عند المتقدمين أعم، والمرسل نوع خاص منه بسقوط من فوق التابعي أو سقوط الصحابي عند البيقوني. فبينهما عموم وخصوص وجهي.',
        created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      },
    ],
  },
  {
    id: 'sample-3',
    anonymous_alias: 'دارس للسان العرب #63',
    course_slug: 'al-ajrumiyyah',
    post_type: 'summary',
    content: 'تلخيص سريع لعلامات الإعراب الأربعة في الآجرومية:\n1. الرفع وعلامته الأصلية الضمة (وينوب عنها: الواو، الألف، النون).\n2. النصب وعلامته الفتحة (وينوب عنها: الألف، الكسرة، الياء، حذف النون).\n3. الخفض وعلامته الكسرة (وينوب عنها: الياء، الفتحة).\n4. الجزم وعلامته السكون (وينوب عنه: الحذف).',
    upvotes_count: 22,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    replies: [],
  },
]

// ذاكرة مشتركة حية على مستوى السيرفر تضمن استمرارية المنشورات عبر الطلبات
declare global {
  // eslint-disable-next-line no-var
  var __sanad_posts_cache__: CommunityPost[] | undefined
}

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch {}
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true })
    }
  } catch {}
}

function readPostsFromPath(filePath: string): CommunityPost[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return []
}

function persistPostsSafely(posts: CommunityPost[]) {
  // 1. تحديث الذاكرة السريعة
  globalThis.__sanad_posts_cache__ = posts

  // 2. الحفظ في مجلد /tmp المتاح للكتابة دائماً في Vercel Serverless
  ensureDirectories()
  try {
    fs.writeFileSync(TMP_POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8')
  } catch {}

  // 3. الحفظ في مسار المشروع إن كانت البيئة تسمح بالكتابة (Local Dev)
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8')
  } catch {}
}

export function getLocalCommunityPosts(): CommunityPost[] {
  // 1. فحص الذاكرة الحية أولاً
  if (globalThis.__sanad_posts_cache__ && globalThis.__sanad_posts_cache__.length > 0) {
    return globalThis.__sanad_posts_cache__
  }

  // 2. دمج كافة المصادر المتاحة
  const postMap = new Map<string, CommunityPost>()

  // إضافة البذور الأولية
  INITIAL_COMMUNITY_POSTS.forEach((p) => postMap.set(p.id, p))

  // قراءة السجل الأساسي data/
  const dataPosts = readPostsFromPath(POSTS_FILE)
  dataPosts.forEach((p) => postMap.set(p.id, p))

  // قراءة سجل Sanad-upload/
  const uploadPosts = readPostsFromPath(UPLOAD_POSTS_FILE)
  uploadPosts.forEach((p) => postMap.set(p.id, p))

  // قراءة سجل /tmp
  const tmpPosts = readPostsFromPath(TMP_POSTS_FILE)
  tmpPosts.forEach((p) => postMap.set(p.id, p))

  const allPosts = Array.from(postMap.values())
  allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  globalThis.__sanad_posts_cache__ = allPosts
  return allPosts
}

export function saveLocalCommunityPost(post: {
  id?: string
  anonymous_alias: string
  content: string
  post_type: 'question' | 'summary' | 'benefit'
  course_slug?: string | null
}): CommunityPost {
  const posts = [...getLocalCommunityPosts()]

  const newPost: CommunityPost = {
    id: post.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    anonymous_alias: post.anonymous_alias,
    course_slug: post.course_slug || null,
    post_type: post.post_type,
    content: post.content.trim(),
    upvotes_count: 0,
    created_at: new Date().toISOString(),
    replies: [],
  }

  // منع التكرار إن كان المعرف موجوداً
  const existingIndex = posts.findIndex((p) => p.id === newPost.id)
  if (existingIndex >= 0) {
    posts[existingIndex] = { ...posts[existingIndex], ...newPost }
  } else {
    posts.unshift(newPost)
  }

  persistPostsSafely(posts)
  return newPost
}

export function addLocalCommunityReply(
  postId: string,
  reply: { anonymous_alias: string; content: string }
): CommunityReply | null {
  const posts = [...getLocalCommunityPosts()]
  const post = posts.find((p) => p.id === postId)
  if (!post) return null

  if (!Array.isArray(post.replies)) {
    post.replies = []
  }

  const newReply: CommunityReply = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    post_id: postId,
    anonymous_alias: reply.anonymous_alias,
    content: reply.content.trim(),
    created_at: new Date().toISOString(),
  }

  post.replies.push(newReply)
  persistPostsSafely(posts)
  return newReply
}

export function upvoteLocalCommunityPost(postId: string): boolean {
  const posts = [...getLocalCommunityPosts()]
  const post = posts.find((p) => p.id === postId)
  if (!post) return false

  post.upvotes_count = (post.upvotes_count || 0) + 1
  persistPostsSafely(posts)
  return true
}

export function deleteLocalCommunityPost(postId: string): boolean {
  let posts = [...getLocalCommunityPosts()]
  const initialLen = posts.length
  posts = posts.filter((p) => p.id !== postId)

  if (posts.length !== initialLen) {
    persistPostsSafely(posts)
    return true
  }
  return false
}

export function deleteLocalCommunityReply(postId: string, replyId: string): boolean {
  const posts = [...getLocalCommunityPosts()]
  const post = posts.find((p) => p.id === postId)
  if (!post || !Array.isArray(post.replies)) return false

  const initialLen = post.replies.length
  post.replies = post.replies.filter((r) => r.id !== replyId)

  if (post.replies.length !== initialLen) {
    persistPostsSafely(posts)
    return true
  }
  return false
}
