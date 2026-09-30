'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  return 0
}

// 1. إضافة فائدة جديدة في كشكول الطالب
export async function addStudentNote(lessonId: string, text: string, time: string, tag: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'يجب تسجيل الدخول لتقييد الفوائد في كشكولك' }
  }

  const { data, error } = await supabase
    .from('student_notes')
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      note_text: text,
      timestamp_seconds: Math.floor(parseTimeToSeconds(time)),
      tag: tag,
    })
    .select()
    .single()

  if (error) {
    return { error: 'تعذر حفظ الفائدة، حاول مرة أخرى' }
  }

  revalidatePath(`/courses/[slug]/lessons/${lessonId}`)
  return { success: true, data }
}

// 2. تبديل حالة إتمام المجلس وحساب شريان الحماسة
export async function toggleLessonProgress(lessonId: string, completed: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'يجب تسجيل الدخول لحفظ تقدمك' }
  }

  const { error } = await supabase
    .from('student_progress')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) {
    return { error: 'تعذر تحديث الإنجاز' }
  }

  // إذا تم إنجاز الدرس، نحدّث شريان الحماسة التراكمي
  if (completed) {
    await supabase.rpc('update_student_streak', { student_id: user.id })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}