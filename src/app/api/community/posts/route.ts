import { NextResponse } from 'next/server'
import {
  saveLocalCommunityPost,
  getLocalCommunityPosts,
} from '@/lib/community-store'
import {
  saveCommunityPostToCloud,
  getCommunityPostsFromCloud,
} from '@/lib/cloud-db'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { getStudentProfileData } from '@/lib/student-tracking'
import type { CommunityPost } from '@/components/community-hub'

function generateAnonymousAlias(scholarlyId?: string): string {
  if (scholarlyId && /^\d+$/.test(scholarlyId)) {
    return `طالب علم #${scholarlyId}`
  }
  const randomNumber = Math.floor(100 + Math.random() * 900)
  return `طالب علم #${randomNumber}`
}

export async function GET() {
  try {
    const localPosts = getLocalCommunityPosts()
    const postMap = new Map<string, CommunityPost>()

    for (const lp of localPosts) {
      postMap.set(lp.id, lp)
    }

    // مزامنة مع السحابة إن كانت مفعلة
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
    } catch {}

    const posts = Array.from(postMap.values())
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(
      { success: true, posts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching posts'
    return NextResponse.json({ success: false, error: msg, posts: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, postType = 'benefit', courseSlug = null, guestAlias } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'محتوى المسألة أو الفائدة مطلوب' },
        { status: 400 }
      )
    }

    // تحديد الهوية العلمية: إما الحساب الموثق أو معرف رمزي تلقائي
    let anonymousAlias = guestAlias
    const studentUser = await getCurrentStudentUser()
    if (studentUser && studentUser.email) {
      const profile = getStudentProfileData(studentUser.email)
      anonymousAlias = generateAnonymousAlias(profile?.scholarlyId)
    }
    if (!anonymousAlias) {
      anonymousAlias = generateAnonymousAlias()
    }

    const newPost = saveLocalCommunityPost({
      anonymous_alias: anonymousAlias,
      course_slug: courseSlug || null,
      post_type: postType,
      content: content.trim(),
    })

    // الحفظ في السحابة فوراً
    try {
      await saveCommunityPostToCloud(newPost)
    } catch {}

    return NextResponse.json({ success: true, post: newPost })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating post'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
