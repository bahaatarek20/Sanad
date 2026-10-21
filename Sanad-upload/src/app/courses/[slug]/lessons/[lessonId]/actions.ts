'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { saveStudentLocalNote } from '@/lib/student-tracking'

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  return 0
}

// 1. إضافة فائدة جديدة في كشكول الطالب
export async function addStudentNote(lessonId: string, text: string, time: string, tag: string) {
  const student = await getCurrentStudentUser()
  if (!student?.email) {
    return { error: 'يجب تسجيل الدخول لتقييد الفوائد في كشكولك' }
  }

  const savedNote = saveStudentLocalNote(student.email, {
    courseSlug: lessonId,
    title: `${tag} (${time})`,
    content: text.trim(),
    tag,
  })

  revalidatePath(`/courses/[slug]/lessons/${lessonId}`)
  return { success: true, data: savedNote }
}

// 2. تبديل حالة إتمام المجلس وحساب شريان الحماسة
export async function toggleLessonProgress(lessonId: string, completed: boolean) {
  const student = await getCurrentStudentUser()
  if (!student) {
    return { error: 'يجب تسجيل الدخول لحفظ تقدمك' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}