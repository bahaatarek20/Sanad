import { NextResponse } from 'next/server'
import {
  getRawLocalCommunityPosts,
  saveLocalCommunityPost,
  addLocalCommunityReply,
  upvoteLocalCommunityPost,
  resolveAuthorCommunityIdentity,
  sanitizeCommunityContent,
  checkCommunityRateLimit,
  enrichCommunityPostsForPublic,
} from '@/lib/community-store'
import {
  getCommunityPostsFromCloud,
  saveCommunityPostToCloud,
  addReplyToCloudPost,
  upvoteCloudPost,
} from '@/lib/cloud-db'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import type { CommunityPost } from '@/components/community-hub'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const localPosts = getRawLocalCommunityPosts()
    const postMap = new Map<string, CommunityPost>()

    for (const lp of localPosts) {
      postMap.set(lp.id, lp)
    }

    // جلب أحدث المنشورات السحابية ودمجها لحظياً مع منع التكرار
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

    const rawMerged = Array.from(postMap.values())
    rawMerged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const posts = enrichCommunityPostsForPublic(rawMerged)

    return NextResponse.json(
      { success: true, posts, serverTime: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch {
    return NextResponse.json({ success: false, posts: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // 1. تحقق خادمي صارم من هوية المرسل — لا يُسمح بأي تفاعل لغير المسجلين أو انتحال الهوية
    const user = await getCurrentStudentUser()
    if (!user || !user.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'غير مصرح بالوصول. يرجى تسجيل الدخول للمشاركة في مجلس المذاكرة.',
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = body.action || 'create-post'

    if (action === 'create-post') {
      const rawContent = typeof body.content === 'string' ? body.content : ''
      const content = sanitizeCommunityContent(rawContent, 2000)
      const postType = (['benefit', 'question', 'summary'].includes(body.postType)
        ? body.postType
        : 'benefit') as 'benefit' | 'question' | 'summary'
      const courseSlug = body.courseSlug && body.courseSlug !== 'all' ? String(body.courseSlug) : undefined

      if (!content || content.length < 3) {
        return NextResponse.json(
          { success: false, error: 'يرجى كتابة محتوى علمي واضح لا يقل عن 3 أحرف.' },
          { status: 400 }
        )
      }

      const rateCheck = checkCommunityRateLimit(user.email, content)
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: rateCheck.error || 'يرجى التمهل قبل إرسال مشاركة جديدة.' },
          { status: 429 }
        )
      }

      const identity = resolveAuthorCommunityIdentity(
        user.email,
        user.user_metadata?.full_name
      )

      const newPost: CommunityPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        anonymous_alias: identity.displayName,
        author_email: user.email,
        author_avatar_url: identity.avatarUrl,
        author_role: identity.role,
        author_education_level: identity.educationLevel,
        course_slug: courseSlug,
        post_type: postType,
        content,
        upvotes_count: 0,
        created_at: new Date().toISOString(),
        replies: [],
      }

      saveLocalCommunityPost(newPost)
      await saveCommunityPostToCloud(newPost).catch(() => {})

      const publicPost = { ...newPost }
      delete publicPost.author_email

      return NextResponse.json({ success: true, post: publicPost })
    }

    if (action === 'create-reply') {
      const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
      const rawContent = typeof body.content === 'string' ? body.content : ''
      const content = sanitizeCommunityContent(rawContent, 1000)

      if (!postId || !content || content.length < 2) {
        return NextResponse.json(
          { success: false, error: 'يرجى كتابة رد واضح ومفيد.' },
          { status: 400 }
        )
      }

      const rateCheck = checkCommunityRateLimit(user.email, content)
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: rateCheck.error || 'يرجى التمهل قبل إرسال رد جديد.' },
          { status: 429 }
        )
      }

      const identity = resolveAuthorCommunityIdentity(
        user.email,
        user.user_metadata?.full_name
      )

      const newReply = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        post_id: postId,
        anonymous_alias: identity.displayName,
        author_email: user.email,
        author_avatar_url: identity.avatarUrl,
        author_role: identity.role,
        content,
        created_at: new Date().toISOString(),
      }

      addLocalCommunityReply(postId, newReply)
      await addReplyToCloudPost(postId, newReply).catch(() => {})

      const publicReply = { ...newReply }
      delete (publicReply as Record<string, unknown>).author_email

      return NextResponse.json({ success: true, reply: publicReply })
    }

    if (action === 'upvote') {
      const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
      if (postId) {
        upvoteLocalCommunityPost(postId)
        await upvoteCloudPost(postId).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 })
  } catch (err) {
    console.error('Error in POST /api/community/posts:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
