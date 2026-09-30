import fs from 'fs'
import path from 'path'
import { CommunityPost, CommunityReply } from '@/components/community-hub'

const DATA_DIR = path.join(process.cwd(), 'data')
const POSTS_FILE = path.join(DATA_DIR, 'sanad_community_posts.json')

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
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

function ensureCommunityFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(POSTS_FILE)) {
      fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_COMMUNITY_POSTS, null, 2), 'utf8')
    }
  } catch (err) {
    console.error('Error ensuring community file:', err)
  }
}

export function getLocalCommunityPosts(): CommunityPost[] {
  ensureCommunityFile()
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf8')
    const posts: CommunityPost[] = JSON.parse(raw)
    return Array.isArray(posts) ? posts : INITIAL_COMMUNITY_POSTS
  } catch {
    return INITIAL_COMMUNITY_POSTS
  }
}

export function saveLocalCommunityPost(post: {
  anonymous_alias: string
  content: string
  post_type: 'question' | 'summary' | 'benefit'
  course_slug?: string | null
}): CommunityPost {
  ensureCommunityFile()
  const posts = getLocalCommunityPosts()

  const newPost: CommunityPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    anonymous_alias: post.anonymous_alias,
    course_slug: post.course_slug || null,
    post_type: post.post_type,
    content: post.content.trim(),
    upvotes_count: 0,
    created_at: new Date().toISOString(),
    replies: [],
  }

  posts.unshift(newPost)

  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving local community post:', err)
  }

  return newPost
}

export function addLocalCommunityReply(
  postId: string,
  reply: { anonymous_alias: string; content: string }
): CommunityReply | null {
  ensureCommunityFile()
  const posts = getLocalCommunityPosts()
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

  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving local community reply:', err)
  }

  return newReply
}

export function upvoteLocalCommunityPost(postId: string): boolean {
  ensureCommunityFile()
  const posts = getLocalCommunityPosts()
  const post = posts.find((p) => p.id === postId)
  if (!post) return false

  post.upvotes_count = (post.upvotes_count || 0) + 1

  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}
