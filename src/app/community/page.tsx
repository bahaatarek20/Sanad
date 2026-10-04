import { createClient } from '@/lib/supabase/server'
import { getActiveCourses } from '@/lib/courses-store'
import { getScholarlyLeaderboardData } from '@/lib/student-tracking'
import ScholarlyLeaderboard from '@/components/scholarly-leaderboard'
import CommunityHub, { CommunityPost } from '@/components/community-hub'
import { getCurrentStudentUser } from '@/lib/auth-helper'

import { getLocalCommunityPosts } from '@/lib/community-store'
import { getCommunityPostsFromCloud } from '@/lib/cloud-db'

export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مجلس المذاكرة العام',
  description: 'فضاء علمي للتذاكر في متون العلوم الشرعية، وتبادل الفوائد والشوارد والمسائل التأصيلية.',
  alternates: {
    canonical: 'https://sanad-edu1.vercel.app/community',
  },
  openGraph: {
    title: 'مجلس المذاكرة العام || منصة سَنَد',
    description: 'فضاء علمي للتذاكر في متون العلوم الشرعية، وتبادل الفوائد والشوارد والمسائل التأصيلية.',
    url: 'https://sanad-edu1.vercel.app/community',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'مجلس المذاكرة — منصة سَنَد',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مجلس المذاكرة العام || منصة سَنَد',
    description: 'فضاء علمي للتذاكر في متون العلوم الشرعية، وتبادل الفوائد والشوارد والمسائل التأصيلية.',
    images: ['/og-default.png'],
  },
}

// مشاركات أولية نموذجية للمجلس
const DEFAULT_SAMPLE_POSTS: CommunityPost[] = [
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

export default async function CommunityPage() {
  const supabase = await createClient()
  // دعم المسجلين عبر Supabase أو الجلسة المحلية على حد سواء (فحص فوري سريع)
  const currentUser = await getCurrentStudentUser()
  const isLoggedIn = Boolean(currentUser)

  // 1. نبدأ بالسجل المحلي كقاعدة مبدئية
  const localPosts = getLocalCommunityPosts()
  const postMap = new Map<string, CommunityPost>()
  for (const lp of localPosts) {
    postMap.set(lp.id, lp)
  }

  // 2. جلب المنشورات السحابية الحية من Cloud Firestore لضمان ظهورها لكافة الأعضاء في العالم
  try {
    const cloudPosts = await getCommunityPostsFromCloud()
    if (cloudPosts && cloudPosts.length > 0) {
      for (const cp of cloudPosts) {
        const existing = postMap.get(cp.id)
        if (existing) {
          const mergedReplies = [...(existing.replies || [])]
          const existingReplyIds = new Set(mergedReplies.map((r) => r.id))
          for (const cr of cp.replies || []) {
            if (!existingReplyIds.has(cr.id)) {
              mergedReplies.push(cr)
              existingReplyIds.add(cr.id)
            }
          }
          postMap.set(cp.id, {
            ...existing,
            ...cp,
            upvotes_count: Math.max(existing.upvotes_count || 0, cp.upvotes_count || 0),
            replies: mergedReplies,
          })
        } else {
          postMap.set(cp.id, cp)
        }
      }
    }
  } catch (cErr) {
    console.warn('Could not fetch community posts from cloud DB:', cErr)
  }

  // 3. جلب المنشورات السحابية من Supabase كاحتياط إضافي
  try {
    const { data: dbPosts } = await supabase
      .from('community_posts')
      .select('*, replies:community_replies(*)')
      .order('created_at', { ascending: false })

    if (dbPosts && dbPosts.length > 0) {
      for (const p of dbPosts) {
        if (!postMap.has(p.id)) {
          postMap.set(p.id, {
            id: p.id,
            anonymous_alias: p.anonymous_alias,
            course_slug: p.course_slug,
            post_type: p.post_type,
            content: p.content,
            upvotes_count: p.upvotes_count || 0,
            created_at: p.created_at,
            replies: p.replies || [],
          })
        }
      }
    }
  } catch {
    // في حال عدم توفر Supabase يتم الاعتماد على Firestore والسجل المحلي
  }

  let posts = Array.from(postMap.values())
  if (posts.length === 0) {
    posts = DEFAULT_SAMPLE_POSTS
  } else {
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const leaderboardData = getScholarlyLeaderboardData(currentUser?.email || undefined)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* مسار التنقل المهيكل لمحركات البحث */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://sanad-edu1.vercel.app' },
              { '@type': 'ListItem', position: 2, name: 'مجلس المذاكرة', item: 'https://sanad-edu1.vercel.app/community' },
            ],
          }),
        }}
      />

      {/* ميدان التنافس المحمود وسباق أهل الهمم */}
      <ScholarlyLeaderboard data={leaderboardData} />

      {/* مجلس المذاكرة والمسائل المفتوح */}
      <CommunityHub
        initialPosts={posts}
        courses={getActiveCourses()}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
