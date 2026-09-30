'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// حذف منشور مخالف من مجلس المذاكرة
export async function deleteCommunityPostAction(postId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/community')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Delete post exception:', err)
    return { success: false, error: 'تعذر حذف المنشور' }
  }
}

// حذف تعليق مخالف من مجلس المذاكرة
export async function deleteCommunityReplyAction(replyId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('community_replies')
      .delete()
      .eq('id', replyId)

    if (error) {
      console.error('Error deleting reply:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/community')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Delete reply exception:', err)
    return { success: false, error: 'تعذر حذف التعليق' }
  }
}
