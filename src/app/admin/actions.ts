'use server'

import { revalidatePath } from 'next/cache'
import { deleteLocalCommunityPost, deleteLocalCommunityReply } from '@/lib/community-store'
import { deleteCommunityPostFromCloud, deleteCommunityReplyFromCloud } from '@/lib/cloud-db'

// حذف منشور مخالف من مجلس المذاكرة
export async function deleteCommunityPostAction(postId: string) {
  try {
    deleteLocalCommunityPost(postId)
    await deleteCommunityPostFromCloud(postId)

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
    // يحذف محلياً وسحابياً
    deleteLocalCommunityReply('', replyId)
    await deleteCommunityReplyFromCloud('', replyId)

    revalidatePath('/community')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Delete reply exception:', err)
    return { success: false, error: 'تعذر حذف التعليق' }
  }
}
