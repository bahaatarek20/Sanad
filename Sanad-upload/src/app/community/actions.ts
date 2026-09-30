'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  saveLocalCommunityPost,
  addLocalCommunityReply,
  upvoteLocalCommunityPost,
} from '@/lib/community-store'

function generateAnonymousAlias(): string {
  const titles = [
    'طالب علم',
    'باحث في الفقه',
    'مستفهم في الأصول',
    'محرر للحديث',
    'دارس للسان العرب',
    'مستشكل في النحو',
    'طالب تأصيل',
  ]
  const randomTitle = titles[Math.floor(Math.random() * titles.length)]
  const randomNumber = Math.floor(100 + Math.random() * 900)
  return `${randomTitle} #${randomNumber}`
}

// إنشاء منشور جديد في مجلس المذاكرة
export async function createCommunityPost(formData: FormData) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!studentUser) {
      return { success: false, error: 'غير مصرح بالنشر؛ يرجى تسجيل الدخول بحساب نشط وغير معلّق إدارياً.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const content = formData.get('content') as string
    const courseSlug = formData.get('courseSlug') as string
    const postType = (formData.get('postType') as string) || 'benefit'

    if (!content?.trim()) {
      return { success: false, error: 'محتوى المسألة أو الفائدة مطلوب' }
    }

    const anonymousAlias = generateAnonymousAlias()

    // 1. الحفظ الدائم في السجل المحلي لضمان عدم ضياع المنشور
    const localPost = saveLocalCommunityPost({
      anonymous_alias: anonymousAlias,
      course_slug: courseSlug || null,
      post_type: postType as 'question' | 'summary' | 'benefit',
      content: content.trim(),
    })

    // 2. الحفظ في سحابة Supabase إن كان المستخدم مسجلاً بها
    if (user) {
      try {
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
      } catch (err) {
        console.error('Error creating post in db:', err)
      }
    }

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

    // 2. تحديث الإعجاب في Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      try {
        await supabase.rpc('increment_post_upvotes', { post_id_arg: postId })
      } catch {}
    }

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
    if (!studentUser) {
      return { success: false, error: 'غير مصرح بالتعليق؛ يرجى تسجيل الدخول بحساب نشط وغير معلّق إدارياً.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!content.trim()) return { success: false, error: 'محتوى الرد مطلوب' }

    const anonymousAlias = generateAnonymousAlias()

    // 1. حفظ الرد محلياً
    const localReply = addLocalCommunityReply(postId, {
      anonymous_alias: anonymousAlias,
      content: content.trim(),
    })

    // 2. حفظ الرد في Supabase إن أمكن
    if (user) {
      try {
        await supabase.from('community_replies').insert({
          post_id: postId,
          user_id: user.id,
          anonymous_alias: anonymousAlias,
          content: content.trim(),
        })
      } catch {}
    }

    revalidatePath('/community')
    return {
      success: true,
      reply: localReply || {
        id: String(Date.now()),
        post_id: postId,
        anonymous_alias: anonymousAlias,
        content: content.trim(),
        created_at: new Date().toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'تعذر إضافة الرد' }
  }
}
