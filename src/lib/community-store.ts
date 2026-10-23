import fs from 'fs'
import path from 'path'
import type { CommunityPost, CommunityReply } from '@/components/community-hub'
import { getStudentProfileData, SUPER_ADMIN_EMAIL } from '@/lib/student-tracking'

const DATA_DIR = path.join(process.cwd(), 'data')
const COMMUNITY_FILE = path.join(DATA_DIR, 'sanad_community_posts.json')

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'sample-1',
    anonymous_alias: 'طالب علم #412',
    course_slug: 'al-usul-min-ilmil-usul',
    post_type: 'benefit',
    content:
      'قاعدة مفيدة قيّدتها من شرح الشيخ ابن عثيمين في الأصول: «الأصل في الأمر الوجوب إلا لصارف، والأصل في النهي التحريم إلا لدليل».. الفرق الجوهري بين الصارف والدليل المخصص يحتاج عناية أثناء مدارسة مباحث دلالات الألفاظ.',
    upvotes_count: 14,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:emerald-scholar',
    replies: [
      {
        id: 'rep-1',
        post_id: 'sample-1',
        anonymous_alias: 'باحث في الفقه #89',
        content:
          'أحسنت القيد! ومن أمثلة الصارف في السنة الأمر بالسواك عند كل صلاة؛ صُرف من الوجوب إلى الاستحباب بحديث: «لولا أن أشق على أمتي».',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        author_role: 'student',
        author_avatar_url: 'preset:amber-scribe',
      },
    ],
  },
  {
    id: 'sample-2',
    anonymous_alias: 'مستفهم في الأصول #15',
    course_slug: 'al-bayquniyyah',
    post_type: 'question',
    content:
      'استشكل عليّ الفرق بين "المرسل" و"المنقطع" عند الإمام البيقوني رحمه الله في قوله: (ومرسل منه الصحابي سقط.. وكل ما لم يتصل به انقطاع). هل كل مرسل منقطع اصطلاحاً؟',
    upvotes_count: 9,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:indigo-seeker',
    replies: [
      {
        id: 'rep-2',
        post_id: 'sample-2',
        anonymous_alias: 'محرر للحديث #74',
        content:
          'نعم يا أخي الكريم؛ المنقطع عند المتقدمين أعم، والمرسل نوع خاص منه بسقوط من فوق التابعي أو سقوط الصحابي عند البيقوني. فبينهما عموم وخصوص وجهي.',
        created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        author_role: 'student',
        author_avatar_url: 'preset:cyan-hikmah',
      },
    ],
  },
  {
    id: 'sample-3',
    anonymous_alias: 'دارس للسان العرب #63',
    course_slug: 'al-ajrumiyyah',
    post_type: 'summary',
    content:
      'تلخيص سريع لعلامات الإعراب الأربعة في الآجرومية:\n1. الرفع وعلامته الأصلية الضمة (وينوب عنها: الواو، الألف، النون).\n2. النصب وعلامته الفتحة (وينوب عنها: الألف، الكسرة، الياء، حذف النون).\n3. الخفض وعلامته الكسرة (وينوب عنها: الياء، الفتحة).\n4. الجزم وعلامته السكون (وينوب عنه: الحذف).',
    upvotes_count: 22,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:rose-hafiz',
    replies: [],
  },
]

// حماية من الإغراق والرسائل المتكررة (Anti-Spam Rate Limiter)
const communityRateMap = new Map<string, { timestamps: number[]; lastContent: string; lastTime: number }>()

export function checkCommunityRateLimit(
  userEmail: string,
  content: string
): { allowed: boolean; error?: string } {
  const key = userEmail.toLowerCase().trim()
  const now = Date.now()
  const cleanContent = content.trim()

  const record = communityRateMap.get(key) || {
    timestamps: [],
    lastContent: '',
    lastTime: 0,
  }

  // منع تكرار نفس النص حرفياً خلال 45 ثانية
  if (record.lastContent === cleanContent && now - record.lastTime < 45000) {
    return {
      allowed: false,
      error: 'لقد قمت بنشر هذه المشاركة للتو، يرجى عدم تكرار الإرسال.',
    }
  }

  // السماح بحد أقصى 6 مشاركات/ردود خلال 30 ثانية
  const recentTimestamps = record.timestamps.filter((t) => now - t < 30000)
  if (recentTimestamps.length >= 6) {
    return {
      allowed: false,
      error: 'يرجى التمهل قليلاً قبل إرسال مشاركة جديدة لمنع الإغراق.',
    }
  }

  recentTimestamps.push(now)
  communityRateMap.set(key, {
    timestamps: recentTimestamps,
    lastContent: cleanContent,
    lastTime: now,
  })

  return { allowed: true }
}

/**
 * تعقيم وتطهير النص من أي وسوم خبيثة (XSS Sanitization) مع الحفاظ على النص العربي وعلامات الترقيم
 */
export function sanitizeCommunityContent(raw: string, maxLength = 2000): string {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength)
}

/**
 * استخراج اسم العرض والصورة والرتبة للمستخدم بناءً على ملفه الشخصي وإعدادات الخصوصية الحية
 */
export function resolveAuthorCommunityIdentity(email: string, fallbackName?: string): {
  displayName: string
  avatarUrl?: string
  role: 'owner' | 'admin' | 'student'
  educationLevel?: string
} {
  const cleanEmail = (email || '').toLowerCase().trim()
  const profile = getStudentProfileData(cleanEmail)
  const isOwner = cleanEmail === SUPER_ADMIN_EMAIL || profile?.role === 'owner'
  const role: 'owner' | 'admin' | 'student' = isOwner
    ? 'owner'
    : profile?.role === 'admin'
    ? 'admin'
    : 'student'

  const showRealName = isOwner ? true : (profile?.privacySettings?.showRealNameInCommunity ?? true)
  const showAvatar = profile?.privacySettings?.showAvatarInCommunity ?? true

  let displayName = ''
  if (isOwner) {
    displayName = `${profile?.name || fallbackName || 'المهندس بهاء طارق'} • مالك المنصة`
  } else if (role === 'admin') {
    displayName = `${profile?.name || fallbackName || 'مشرف'} • مشرف المنصة`
  } else if (!showRealName) {
    displayName = `طالب علم (${profile?.scholarlyId || 'سَنَد'})`
  } else {
    const rawName = profile?.name || fallbackName || cleanEmail.split('@')[0] || 'طالب علم'
    const idSuffix = profile?.scholarlyId ? ` (${profile.scholarlyId})` : ''
    displayName = `${rawName}${idSuffix}`
  }

  const avatarUrl = showAvatar ? profile?.avatarUrl : undefined
  const educationLevel =
    profile?.privacySettings?.showBioPublicly !== false ? profile?.educationLevel : undefined

  return {
    displayName,
    avatarUrl,
    role,
    educationLevel,
  }
}

/**
 * إثراء المشاركات والردود بالصور الرمزية والأسماء المحدثة حياً من سجلات الطلاب مع إخفاء البريد الخاص
 */
export function enrichCommunityPostsForPublic(posts: CommunityPost[]): CommunityPost[] {
  return posts.map((post) => {
    let enrichedAlias = post.anonymous_alias
    let enrichedAvatar = post.author_avatar_url
    let enrichedRole = post.author_role || 'student'
    let enrichedLevel = post.author_education_level

    if (post.author_email) {
      const resolved = resolveAuthorCommunityIdentity(post.author_email, post.anonymous_alias)
      enrichedAlias = resolved.displayName
      enrichedAvatar = resolved.avatarUrl
      enrichedRole = resolved.role
      enrichedLevel = resolved.educationLevel
    } else if (enrichedAlias.includes('المشرف العام') || enrichedAlias.includes('مالك المنصة')) {
      enrichedRole = 'owner'
    }

    const enrichedReplies: CommunityReply[] = (post.replies || []).map((rep) => {
      let repAlias = rep.anonymous_alias
      let repAvatar = rep.author_avatar_url
      let repRole = rep.author_role || 'student'

      if (rep.author_email) {
        const resolvedRep = resolveAuthorCommunityIdentity(rep.author_email, rep.anonymous_alias)
        repAlias = resolvedRep.displayName
        repAvatar = resolvedRep.avatarUrl
        repRole = resolvedRep.role
      } else if (repAlias.includes('المشرف العام') || repAlias.includes('مالك المنصة')) {
        repRole = 'owner'
      }

      const safeReply: CommunityReply = {
        ...rep,
        anonymous_alias: repAlias,
        author_avatar_url: repAvatar,
        author_role: repRole,
      }
      delete safeReply.author_email
      return safeReply
    })

    const safePost: CommunityPost = {
      ...post,
      anonymous_alias: enrichedAlias,
      author_avatar_url: enrichedAvatar,
      author_role: enrichedRole,
      author_education_level: enrichedLevel,
      replies: enrichedReplies,
    }
    delete safePost.author_email
    return safePost
  })
}

function ensureCommunityFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(COMMUNITY_FILE)) {
      fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(INITIAL_POSTS, null, 2), 'utf8')
    }
  } catch (err) {
    console.error('Error initializing community store:', err)
  }
}

export function getRawLocalCommunityPosts(): CommunityPost[] {
  ensureCommunityFile()
  try {
    const raw = fs.readFileSync(COMMUNITY_FILE, 'utf8')
    const posts = JSON.parse(raw)
    return Array.isArray(posts) ? posts : INITIAL_POSTS
  } catch {
    return INITIAL_POSTS
  }
}

export function getLocalCommunityPosts(): CommunityPost[] {
  const rawPosts = getRawLocalCommunityPosts()
  return enrichCommunityPostsForPublic(rawPosts)
}

export function saveLocalCommunityPost(post: CommunityPost): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const deduplicated = posts.filter((p) => p.id !== post.id)
  const updated = [post, ...deduplicated]
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving community post:', err)
  }
  return enrichCommunityPostsForPublic(updated)
}

export function addLocalCommunityReply(postId: string, reply: CommunityReply): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const existingReplies = (p.replies || []).filter((r) => r.id !== reply.id)
      return {
        ...p,
        replies: [...existingReplies, reply],
      }
    }
    return p
  })
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving community reply:', err)
  }
  return enrichCommunityPostsForPublic(updated)
}

export function upvoteLocalCommunityPost(postId: string): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.map((p) => {
    if (p.id === postId) {
      return {
        ...p,
        upvotes_count: (p.upvotes_count || 0) + 1,
      }
    }
    return p
  })
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.error('Error upvoting community post:', err)
  }
  return enrichCommunityPostsForPublic(updated)
}

export function deleteLocalCommunityPost(postId: string): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.filter((p) => p.id !== postId)
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.error('Error deleting community post:', err)
  }
  return enrichCommunityPostsForPublic(updated)
}

export function deleteLocalCommunityReply(postId: string, replyId: string): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.map((p) => {
    if (p.id === postId) {
      return {
        ...p,
        replies: (p.replies || []).filter((r) => r.id !== replyId),
      }
    }
    return p
  })
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.error('Error deleting community reply:', err)
  }
  return enrichCommunityPostsForPublic(updated)
}

