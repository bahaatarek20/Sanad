'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  saveLocalCommunityPost,
  addLocalCommunityReply,
  upvoteLocalCommunityPost,
  getLocalCommunityPosts,
} from '@/lib/community-store'
import {
  saveCommunityPostToCloud,
  getCommunityPostsFromCloud,
  addCommunityReplyToCloud,
  upvoteCommunityPostInCloud,
} from '@/lib/cloud-db'
import type { CommunityPost } from '@/components/community-hub'

function generateAnonymousAlias(scholarlyId?: string): string {
  if (scholarlyId && /^\d+$/.test(scholarlyId)) {
    return `طالب علم #${scholarlyId}`
  }
  const randomNumber = Math.floor(100 + Math.random() * 900)
  return `طالب علم #${randomNumber}`
}

// إنشاء منشور جديد في مجلس المذاكرة (الرسايل التشاركية)
export async function createCommunityPost(formData: FormData) {
  try {
    const studentUser = await getCurrentStudentUser()
    const content = formData.get('content') as string
    const courseSlug = formData.get('courseSlug') as string
    const postType = (formData.get('postType') as string) || 'benefit'

    if (!content?.trim()) {
      return { success: false, error: 'محتوى المسألة أو الفائدة مطلوب' }
    }

    let anonymousAlias = generateAnonymousAlias()
    if (studentUser && studentUser.email) {
      const { getStudentProfileData } = await import('@/lib/student-tracking')
      const studentProfile = getStudentProfileData(studentUser.email)
      anonymousAlias = generateAnonymousAlias(studentProfile?.scholarlyId)
    }

    // 1. الحفظ في السجل المحلي والمشترك
    const localPost = saveLocalCommunityPost({
      anonymous_alias: anonymousAlias,
      course_slug: courseSlug || null,
      post_type: postType as 'question' | 'summary' | 'benefit',
      content: content.trim(),
    })

    // 2. الحفظ السحابي في Cloud Firestore ليظهر فوراً لجميع أعضاء المنصة
    try {
      await saveCommunityPostToCloud(localPost)
    } catch (cErr) {
      console.warn('Could not save post to cloud DB:', cErr)
    }

    // 3. الحفظ في سحابة Supabase كنسخة احتياطية إضافية إن توفرت
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('community_posts')
          .insert({
            user_id: user.id,
            anonymous_alias: anonymousAlias,
            course_slug: courseSlug || null,
            post_type: postType,
            content: content.trim(),
            upvotes_count: 0,
          })
      }
    } catch {}

    revalidatePath('/community')
    return {
      success: true,
      post: localPost,
    }
  } catch (err) {
    console.error('Community post exception:', err)
    return { success: false, error: 'تعذر نشر المسألة' }
  }
}

// تسجيل إعجاب أو اعتماد فائدة
export async function upvotePost(postId: string) {
  try {
    // 1. تحديث الإعجاب محلياً
    upvoteLocalCommunityPost(postId)

    // 2. تحديث الإعجاب في Cloud Firestore
    try {
      await upvoteCommunityPostInCloud(postId)
    } catch {}

    // 3. تحديث الإعجاب في Supabase
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('increment_post_upvotes', { post_id_arg: postId })
      }
    } catch {}

    revalidatePath('/community')
    return { success: true }
  } catch {
    return { success: true }
  }
}

// إضافة رد أو تعليق علمي مجهول
export async function addCommunityReply(postId: string, content: string) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!content.trim()) return { success: false, error: 'محتوى الرد مطلوب' }

    let anonymousAlias = generateAnonymousAlias()
    if (studentUser && studentUser.email) {
      const { getStudentProfileData } = await import('@/lib/student-tracking')
      const studentProfile = getStudentProfileData(studentUser.email)
      anonymousAlias = generateAnonymousAlias(studentProfile?.scholarlyId)
    }

    // 1. حفظ الرد محلياً
    const localReply = addLocalCommunityReply(postId, {
      anonymous_alias: anonymousAlias,
      content: content.trim(),
    })

    const replyData = localReply || {
      id: String(Date.now()),
      post_id: postId,
      anonymous_alias: anonymousAlias,
      content: content.trim(),
      created_at: new Date().toISOString(),
    }

    // 2. حفظ الرد في Cloud Firestore ليظهر فوراً لجميع أعضاء المنصة
    try {
      await addCommunityReplyToCloud(postId, replyData)
    } catch (cErr) {
      console.warn('Could not save reply to cloud DB:', cErr)
    }

    // 3. حفظ الرد في Supabase إن أمكن
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('community_replies').insert({
          post_id: postId,
          user_id: user.id,
          anonymous_alias: anonymousAlias,
          content: content.trim(),
        })
      }
    } catch {}

    revalidatePath('/community')
    return {
      success: true,
      reply: replyData,
    }
  } catch {
    return { success: false, error: 'تعذر إضافة الرد' }
  }
}

// 4. جلب وتحديث المنشورات التشاركية الحية من السحابة والسجل المحلي
export async function getLatestCommunityPostsAction(): Promise<CommunityPost[]> {
  const localPosts = getLocalCommunityPosts()
  const postMap = new Map<string, CommunityPost>()

  for (const lp of localPosts) {
    postMap.set(lp.id, lp)
  }

  try {
    const cloudPosts = await getCommunityPostsFromCloud()
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
  } catch (cErr) {
    console.warn('Could not fetch cloud community posts:', cErr)
  }

  const posts = Array.from(postMap.values())
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return posts
}

