'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  recordStudentCourseCompleted,
  saveStudentLocalNote,
  deleteStudentLocalNote,
  recordStudentListeningSession,
  recordStudentListeningHeartbeat,
  recordStudentEpisodeToggle,
} from '@/lib/student-tracking'
import { getActiveCourseBySlug } from '@/lib/courses-store'

// 1. تبديل حالة إتمام المتن
export async function toggleCourseCompletion(courseSlug: string, isCompleted: boolean) {
  try {
    const studentUser = await getCurrentStudentUser()
    const course = getActiveCourseBySlug(courseSlug)
    const courseTitle = course ? course.title : courseSlug

    if (studentUser?.email) {
      recordStudentCourseCompleted(studentUser.email, courseSlug, courseTitle, isCompleted)
    }

    revalidatePath('/', 'layout')
    return { success: true, isGuest: !studentUser, isCompleted }
  } catch (err) {
    console.error('Progress exception:', err)
    return { success: false, error: 'حدث خطأ في النظام' }
  }
}

// 2. تدوين فائدة في كشكول الطالب لهذا المتن
export async function addCourseNote(
  courseSlug: string,
  content: string,
  tag: string,
  title?: string
) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!studentUser?.email) {
      return { success: false, isGuest: true, error: 'سجل دخولك لحفظ فوائدك في كشكولك' }
    }

    const noteTitle = title?.trim() || `${tag}: فائدة في المتن`

    // حفظ الفائدة في سجل الطالب المعتمد
    const savedNote = saveStudentLocalNote(studentUser.email, {
      courseSlug,
      title: noteTitle,
      content: content.trim(),
      tag,
    })

    revalidatePath(`/courses/${courseSlug}`)
    revalidatePath('/dashboard')
    return { success: true, data: savedNote }
  } catch (err) {
    console.error('Note exception:', err)
    return { success: false, error: 'حدث خطأ أثناء حفظ الفائدة' }
  }
}

// 3. حذف فائدة من الكشكول
export async function deleteCourseNote(noteId: string, courseSlug: string) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (studentUser?.email) {
      deleteStudentLocalNote(studentUser.email, noteId)
    }

    revalidatePath(`/courses/${courseSlug}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'حدث خطأ أثناء الحذف' }
  }
}

// 4. تسجيل استماع لمجلس وزيادة مدة المدارسة
export async function recordEpisodeListeningAction(
  courseSlug: string,
  episodeNum: number,
  durationMinutes = 15
) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!studentUser?.email) return { success: false, isGuest: true }

    const course = getActiveCourseBySlug(courseSlug)
    const courseTitle = course ? course.title : courseSlug

    recordStudentListeningSession(
      studentUser.email,
      courseSlug,
      courseTitle,
      episodeNum,
      durationMinutes
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

// 5. نبض المدارسة التلقائي اللحظي (يُستدعى كل 60 ثانية لحفظ دقائق الطالب الفعلية في سجله)
export async function recordStudyHeartbeatAction(
  courseSlug: string,
  episodeNum: number,
  addedMinutes = 1
) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!studentUser?.email) return { success: false, isGuest: true }

    const course = getActiveCourseBySlug(courseSlug)
    const courseTitle = course ? course.title : courseSlug

    const result = recordStudentListeningHeartbeat(
      studentUser.email,
      courseSlug,
      courseTitle,
      episodeNum,
      addedMinutes
    )

    return { success: true, ...result }
  } catch {
    return { success: false }
  }
}

// 6. تسجيل إنجاز حلقة أو مجلس معين في المتن وحفظه في السيرفر
export async function toggleEpisodeCompletionAction(
  courseSlug: string,
  episodeNum: number,
  isCompleted: boolean
) {
  try {
    const studentUser = await getCurrentStudentUser()
    if (!studentUser?.email) return { success: false, isGuest: true, completedEpisodes: [] }

    const course = getActiveCourseBySlug(courseSlug)
    const courseTitle = course ? course.title : courseSlug

    const updatedEpisodes = recordStudentEpisodeToggle(
      studentUser.email,
      courseSlug,
      episodeNum,
      isCompleted
    )

    // إذا أكمل الحلقة، نسجل أيضاً جلسة استماع ونزيد مدة مدارسته
    if (isCompleted) {
      recordStudentListeningSession(
        studentUser.email,
        courseSlug,
        courseTitle,
        episodeNum,
        15
      )
    }

    return { success: true, completedEpisodes: updatedEpisodes }
  } catch {
    return { success: false, completedEpisodes: [] }
  }
}
