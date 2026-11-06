'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  saveLocalCommunityPost,
  addLocalCommunityReply,
  upvoteLocalCommunityPost,
  resolveAuthorCommunityIdentity,
  sanitizeCommunityContent,
  checkCommunityRateLimit,
  saveCommunityReport,
} from '@/lib/community-store'
import {
  saveCommunityPostToCloud,
  addReplyToCloudPost,
  upvoteCloudPost,
} from '@/lib/cloud-db'
import { logPlatformEvent, recordStudentPresenceHeartbeat } from '@/lib/student-tracking'

export async function createCommunityPost(formData: FormData) {
  const user = await getCurrentStudentUser()
  if (!user || !user.email) {
    throw new Error('غير مصرح بالوصول. يجب تسجيل الدخول للمشاركة في مجلس المذاكرة.')
  }

  const rawContent = (formData.get('content') as string) || ''
  const content = sanitizeCommunityContent(rawContent, 2000)
  const postType = ((formData.get('postType') as string) || 'benefit') as
    | 'benefit'
    | 'question'
    | 'summary'
  const courseSlug = (formData.get('courseSlug') as string) || undefined

  if (!content || content.length < 3) {
    throw new Error('لا يمكن نشر مشاركة فارغة أو قصيرة جداً.')
  }

  const rateCheck = checkCommunityRateLimit(user.email, content)
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.error || 'يرجى التمهل قبل إرسال مشاركة جديدة.')
  }

  const identity = resolveAuthorCommunityIdentity(
    user.email,
    user.user_metadata?.full_name
  )

  const newPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    anonymous_alias: identity.displayName,
    author_email: user.email,
    author_avatar_url: identity.avatarUrl,
    author_role: identity.role,
    author_education_level: identity.educationLevel,
    course_slug: courseSlug && courseSlug !== 'all' ? courseSlug : undefined,
    post_type: ['benefit', 'question', 'summary'].includes(postType) ? postType : 'benefit',
    content,
    upvotes_count: 0,
    created_at: new Date().toISOString(),
    replies: [],
  }

  saveLocalCommunityPost(newPost)
  await saveCommunityPostToCloud(newPost).catch(() => {})

  logPlatformEvent({
    type: 'community',
    studentEmail: user.email,
    studentName: identity.displayName,
    description: `نشر مشاركة في مجلس المذاكرة: "${content.slice(0, 45)}"`,
  })
  await recordStudentPresenceHeartbeat({
    email: user.email,
    name: identity.displayName,
    pagePath: '/community',
    pageTitle: 'مجلس المذاكرة التشاركي',
    actionDescription: `نشر مشاركة في مجلس المذاكرة`,
  }).catch(() => {})

  revalidatePath('/community')
  revalidatePath('/sanad-control-gate')

  const publicPost = { ...newPost }
  delete (publicPost as Record<string, unknown>).author_email
  return publicPost
}

export async function createCommunityReply(formData: FormData) {
  const user = await getCurrentStudentUser()
  if (!user || !user.email) {
    throw new Error('غير مصرح بالوصول. يجب تسجيل الدخول للرد في مجلس المذاكرة.')
  }

  const postId = formData.get('postId') as string
  const rawContent = (formData.get('content') as string) || ''
  const content = sanitizeCommunityContent(rawContent, 1000)

  if (!postId || !content || content.length < 2) {
    throw new Error('بيانات الرد غير مكتملة.')
  }

  const rateCheck = checkCommunityRateLimit(user.email, content)
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.error || 'يرجى التمهل قبل إرسال رد جديد.')
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

  logPlatformEvent({
    type: 'community',
    studentEmail: user.email,
    studentName: identity.displayName,
    description: `أضاف رداً وتعليقاً في مجلس المذاكرة: "${content.slice(0, 40)}"`,
  })
  await recordStudentPresenceHeartbeat({
    email: user.email,
    name: identity.displayName,
    pagePath: '/community',
    pageTitle: 'مجلس المذاكرة التشاركي',
    actionDescription: `أضاف رداً في مجلس المذاكرة`,
  }).catch(() => {})

  revalidatePath('/community')
  revalidatePath('/sanad-control-gate')

  const publicReply = { ...newReply }
  delete (publicReply as Record<string, unknown>).author_email
  return publicReply
}

export async function upvoteCommunityPost(postId: string) {
  const user = await getCurrentStudentUser()
  if (!user || !user.email) {
    throw new Error('غير مصرح بالوصول.')
  }
  const { counted } = upvoteLocalCommunityPost(postId, user.email)
  if (counted) {
    await upvoteCloudPost(postId).catch(() => {})
  }
  revalidatePath('/community')
}

export async function reportCommunityContentAction(params: {
  postId: string
  replyId?: string
  postAuthor?: string
  postContent: string
  reason: string
}) {
  try {
    const user = await getCurrentStudentUser()
    const reporterEmail = user?.email || 'طالب مجهول'

    const report = saveCommunityReport({
      postId: params.postId,
      replyId: params.replyId,
      postAuthor: params.postAuthor,
      postContent: params.postContent,
      reportedBy: reporterEmail,
      reason: params.reason || 'مخالف لضوابط المدارسة الشرعية',
    })

    logPlatformEvent({
      type: 'community',
      studentEmail: reporterEmail,
      studentName: 'إبلاغ عن محتوى',
      description: `تم تقديم بلاغ عن مشاركة في مجلس المذاكرة [السبب: ${params.reason}]`,
    })

    return { success: true, reportId: report.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'تعذر إرسال البلاغ'
    return { success: false, error: message }
  }
}
