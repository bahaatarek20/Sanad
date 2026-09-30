'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  recordStudentCourseCompleted,
  recordStudentNoteAdded,
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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: true, isGuest: true, isCompleted }
    }

    const { error } = await supabase
      .from('student_progress')
      .upsert(
        {
          user_id: user.id,
          course_slug: courseSlug,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,course_slug' }
      )

    if (error) {
      console.error('Error saving progress:', error)
      return { success: false, error: 'تعذر حفظ حالة الإنجاز في السحابة' }
    }

    if (isCompleted) {
      try {
        await supabase.rpc('update_student_streak', { p_user_id: user.id })
      } catch {
        // Fallback if rpc is not created yet
      }
    }

    revalidatePath('/', 'layout')
    return { success: true, isGuest: false, isCompleted }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !studentUser) {
      return { success: false, isGuest: true, error: 'سجل دخولك لحفظ فوائدك في سحابة كشكولك' }
    }

    const noteTitle = title?.trim() || `${tag}: فائدة في المتن`
    let savedLocalNote = null

    // 1. حفظ الفائدة دائماً في سجل الطالب المحلي لضمان عدم ضياعها
    if (studentUser?.email) {
      savedLocalNote = saveStudentLocalNote(studentUser.email, {
        courseSlug,
        title: noteTitle,
        content: content.trim(),
        tag,
      })
    }

    // 2. المزامنة مع سحابة Supabase إن كان الطالب مسجلاً فيها
    const userId = user?.id
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('student_notes')
          .insert({
            user_id: userId,
            course_slug: courseSlug,
            title: noteTitle,
            content: content.trim(),
            tags: [tag],
          })
          .select()
          .single()

        if (!error && data) {
          revalidatePath(`/courses/${courseSlug}`)
          revalidatePath('/dashboard')
          return { success: true, data }
        }
      } catch {
        // Fallback to local note
      }
    }

    revalidatePath(`/courses/${courseSlug}`)
    revalidatePath('/dashboard')
    return { success: true, data: savedLocalNote }
  } catch (err) {
    console.error('Note exception:', err)
    return { success: false, error: 'حدث خطأ أثناء حفظ الفائدة' }
  }
}

// 3. حذف فائدة من الكشكول
export async function deleteCourseNote(noteId: string, courseSlug: string) {
  try {
    const studentUser = await getCurrentStudentUser()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. حذفها من السجل المحلي
    if (studentUser?.email) {
      deleteStudentLocalNote(studentUser.email, noteId)
    }

    // 2. حذفها من Supabase إن وجدت جلسة سحابية
    if (user?.id) {
      try {
        await supabase
          .from('student_notes')
          .delete()
          .eq('id', noteId)
          .eq('user_id', user.id)
      } catch {}
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

    // مزامنة الدقائق مع قاعدة بيانات Supabase إن وُجدت جلسة سحابية
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: rpcErr } = await supabase.rpc('add_study_minutes', {
          p_user_id: user.id,
          p_minutes: addedMinutes,
        })
        if (rpcErr) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('total_study_minutes')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) {
            const current = (Number(prof.total_study_minutes) || 0) + addedMinutes
            await supabase
              .from('profiles')
              .update({ total_study_minutes: current })
              .eq('id', user.id)
          }
        }
      }
    } catch {
      // استمرار
    }

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

