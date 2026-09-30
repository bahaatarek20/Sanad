'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  WifiOff,
  Wifi,
  BookOpen,
  FileText,
  Bookmark,
  CheckCircle2,
  Trash2,
  Plus,
  Save,
  Sparkles,
  ExternalLink,
  Award,
  Download,
  Scroll,
} from 'lucide-react'

interface OfflineCourseItem {
  slug: string
  title: string
  category: string
  instructor?: string
  author?: string
  totalEpisodes: number
  savedAt: string
}

interface SavedNoteItem {
  id: string
  text: string
  timestamp: string
  courseTitle?: string
}

export default function OfflineCompanionView() {
  const [isOnline, setIsOnline] = useState(true)
  const [offlineCourses, setOfflineCourses] = useState<OfflineCourseItem[]>([])
  const [offlineNotes, setOfflineNotes] = useState<SavedNoteItem[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [activeTab, setActiveTab] = useState<'matns' | 'notebook' | 'ijazas'>('matns')
  const [savedIjazas, setSavedIjazas] = useState<any[]>([])

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // قراءة المتون المحفوظة أوفلاين
    try {
      const storedCourses = localStorage.getItem('sanad_offline_courses')
      if (storedCourses) {
        setOfflineCourses(JSON.parse(storedCourses))
      }

      // قراءة فوائد الكشكول من كافة المتون المحفوظة
      const allNotes: SavedNoteItem[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sanad_notes_')) {
          const notesStr = localStorage.getItem(key)
          if (notesStr) {
            try {
              const parsed = JSON.parse(notesStr)
              if (Array.isArray(parsed)) {
                parsed.forEach((n) => {
                  allNotes.push({
                    id: n.id || Math.random().toString(),
                    text: n.text || n.content || '',
                    timestamp: n.timestamp || new Date().toISOString(),
                    courseTitle: key.replace('sanad_notes_', '').replace(/-/g, ' '),
                  })
                })
              }
            } catch {}
          }
        }
      }

      // إضافة الملاحظات المسجدية الحرة
      const mosqueNotesStr = localStorage.getItem('sanad_offline_mosque_notes')
      if (mosqueNotesStr) {
        try {
          const parsed = JSON.parse(mosqueNotesStr)
          if (Array.isArray(parsed)) {
            allNotes.push(...parsed)
          }
        } catch {}
      }

      setOfflineNotes(allNotes)

      // قراءة الإجازات المحفوظة
      const certsStr = localStorage.getItem('sanad_my_certificates')
      if (certsStr) {
        setSavedIjazas(JSON.parse(certsStr))
      }
    } catch (e) {
      console.error('Error loading offline data:', e)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleAddMosqueNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim()) return

    const newNote: SavedNoteItem = {
      id: 'msq-' + Date.now(),
      text: newNoteText.trim(),
      timestamp: new Date().toLocaleString('ar-SA'),
      courseTitle: 'قيد مسجدي حر (مجلس علم)',
    }

    try {
      const current = localStorage.getItem('sanad_offline_mosque_notes')
      const list = current ? JSON.parse(current) : []
      const updated = [newNote, ...list]
      localStorage.setItem('sanad_offline_mosque_notes', JSON.stringify(updated))
      setOfflineNotes([newNote, ...offlineNotes])
      setNewNoteText('')
    } catch {}
  }

  const handleDeleteOfflineCourse = (slug: string) => {
    try {
      const updated = offlineCourses.filter((c) => c.slug !== slug)
      localStorage.setItem('sanad_offline_courses', JSON.stringify(updated))
      setOfflineCourses(updated)
    } catch {}
  }

  return (
    <div className="space-y-8">
      
      {/* بطاقة الترحيب والتعريف بالوضع */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="space-y-3 text-center sm:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>متصل بالإنترنت (يمكنك تحميل المتون للمسجد)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>وضع المسجد والسفر نشط (يعمل بالكامل أوفلاين)</span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold font-amiri text-stone-900 dark:text-amber-100">
              رفيق طالب العلم بلا إنترنت 
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed">
              هذا الفضاء مصمم خصيصاً لتيسير المدارسة في رحاب المساجد ومجالس العلماء وأثناء السفر. يمكنك حفظ المتون والشروح ومطالعتها وكتابة الفوائد في كشكولك وتصفح إجازاتك دون الحاجة لأي اتصال بالشبكة.
            </p>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-900 text-amber-300 flex items-center justify-center shadow-md shrink-0">
            <Scroll className="w-10 h-10" />
          </div>
        </div>

        {/* ألسنة التبويب */}
        <div className="flex items-center gap-2 pt-8 border-t border-stone-100 dark:border-stone-800 mt-6">
          <button
            onClick={() => setActiveTab('matns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'matns'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>المتون المحفوظة للمسجد ({offlineCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notebook')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'notebook'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>كشكول الفوائد المحفوظ ({offlineNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ijazas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ijazas'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الإجازات الموثقة المحفوظة ({savedIjazas.length})</span>
          </button>
        </div>
      </div>

      {/* محتوى تبويب المتون المحفوظة */}
      {activeTab === 'matns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-amiri text-stone-900 dark:text-amber-100">
              المتون المجهزة للمدارسة أوفلاين
            </h2>
            <Link
              href="/courses"
              className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>تصفح فهرس المتون وتحميل المزيد</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {offlineCourses.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-3xl p-10 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="font-bold text-stone-700 dark:text-stone-300">لم تقم بحفظ أي متن للمسجد بعد</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                عند فتح أي متن في قاعة المدارسة، اضغط على زر <strong>«حفظ المتن للمدارسة بلا إنترنت 📥»</strong> وسيتم حفظ نصوص المتن ومجالسه هنا فوراً لتعمل بلا إنترنت.
              </p>
              <Link
                href="/courses"
                className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition"
              >
                انتقل لفهرس المتون
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offlineCourses.map((c) => (
                <div
                  key={c.slug}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3 hover:border-emerald-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {c.category}
                    </span>
                    <button
                      onClick={() => handleDeleteOfflineCourse(c.slug)}
                      className="text-stone-400 hover:text-red-600 transition p-1"
                      title="حذف من الذاكرة المحفوظة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold font-amiri text-stone-900 dark:text-amber-100">
                    «{c.title}»
                  </h3>

                  {c.instructor && (
                    <p className="text-xs text-stone-500">
                      الشارح: <span className="font-semibold text-stone-700 dark:text-stone-300">{c.instructor}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span>{c.totalEpisodes} مجالس علمية</span>
                    <Link
                      href={`/courses/${c.slug}`}
                      className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                    >
                      <span>فتح المتن للمدارسة</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى تبويب كشكول الفوائد */}
      {activeTab === 'notebook' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 dark:text-amber-100 font-amiri text-lg flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>تقييد فائدة سريعة في المسجد (تُحفظ فوراً في جهازك بلا نت)</span>
            </h3>

            <form onSubmit={handleAddMosqueNote} className="space-y-3">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="اكتب فائدة سمعتها في درس المسجد أو تدبراً علمياً وقيده هنا..."
                rows={3}
                className="w-full bg-[#fcfaf7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الفائدة في الكشكول الأوفلاين</span>
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold font-amiri text-lg text-stone-900 dark:text-amber-100">
              الفوائد المسجلة في كشكولك ({offlineNotes.length})
            </h3>

            {offlineNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                لا توجد فوائد مقيدة حتى الآن. يمكنك تدوين فوائدك أعلاه في أي وقت.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {offlineNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                        {note.courseTitle || 'فائدة عامة'}
                      </span>
                      <span>{note.timestamp}</span>
                    </div>
                    <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* محتوى تبويب الإجازات */}
      {activeTab === 'ijazas' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-amiri text-stone-900 dark:text-amber-100">
            إجازاتك المحفوظة للتحقق السريع
          </h2>

          {savedIjazas.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2">
              <Award className="w-8 h-8 text-stone-400 mx-auto" />
              <p>لم يتم حفظ أي إجازات في ذاكرة المتصفح بعد.</p>
              <p className="text-[11px] text-stone-400">
                عند اجتياز مجالس أي متن والحصول على إجازتك الموثقة، يتم حفظها تلقائياً لتتمكن من إظهارها في أي وقت دون اتصال.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedIjazas.map((cert) => (
                <div
                  key={cert.id}
                  className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-800 dark:text-emerald-400 font-bold">{cert.serialNumber}</span>
                    <span className="text-stone-400">{cert.formattedDate}</span>
                  </div>
                  <h4 className="font-bold font-amiri text-lg text-stone-900 dark:text-white">
                    إجازة: {cert.courseTitle}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    المُجاز له: <strong className="text-stone-800 dark:text-stone-200">{cert.studentName}</strong>
                  </p>
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
                    <span className="text-[11px] text-stone-400">جهة الاعتماد: منصة سَنَد</span>
                    <Link
                      href={`/verify-ijaza/${cert.id}`}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>صفحة التوثيق</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
