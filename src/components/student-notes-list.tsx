'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Bookmark, Printer, Filter, Search, Copy, Check } from 'lucide-react'

export interface DashboardNoteItem {
  id: string
  title?: string
  content: string
  tag: string
  created_at: string
  courseSlug: string
  courseTitle: string
  courseCategory?: string
}

interface StudentNotesListProps {
  initialNotes: DashboardNoteItem[]
}

export default function StudentNotesList({ initialNotes }: StudentNotesListProps) {
  const [allNotes, setAllNotes] = useState<DashboardNoteItem[]>(initialNotes)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // مزامنة ودمج الفوائد المقيدة محلياً في المتصفح مع فوائد السيرفر لضمان عدم ضياع أي فائدة
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const merged = [...initialNotes]
        const existingIds = new Set(initialNotes.map((n) => n.id))

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sanad_notes_')) {
            const courseSlug = key.replace('sanad_notes_', '')
            const raw = localStorage.getItem(key)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                parsed.forEach((item) => {
                  if (item && item.id && !existingIds.has(item.id)) {
                    existingIds.add(item.id)
                    merged.push({
                      id: item.id,
                      title: item.title || `فائدة في متن: ${courseSlug}`,
                      content: item.content || '',
                      tag: item.tag || 'فائدة',
                      created_at: item.created_at || new Date().toISOString(),
                      courseSlug: courseSlug,
                      courseTitle: item.title?.includes(':') ? item.title.split(':')[1].trim() : courseSlug,
                    })
                  }
                })
              }
            }
          }
        }
        setAllNotes(merged)
      }
    } catch {}
  }, [initialNotes])

  const tags = [
    { key: 'all', label: 'كافة الفوائد' },
    { key: 'قاعدة', label: 'القواعد الأصولية' },
    { key: 'مسألة', label: 'المسائل والضوابط' },
    { key: 'فائدة', label: 'الفوائد واللطائف' },
    { key: 'استشكال', label: 'استشكالات للمراجعة' },
  ]

  const tagColors: Record<string, string> = {
    قاعدة: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
    مسألة: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
    فائدة: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700',
    استشكال: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700',
  }

  const filteredNotes = allNotes.filter((n) => {
    const matchesTag = selectedTag === 'all' || n.tag === selectedTag
    const matchesSearch =
      searchQuery.trim() === '' ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesTag && matchesSearch
  })

  const handlePrint = () => {
    window.print()
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* شريط أدوات الفلترة والبحث والطباعة */}
      <div className="flex flex-col gap-4 border-b border-stone-200/80 pb-4 print:hidden sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-stone-400" />
          {tags.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTag(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedTag === t.key
                  ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
                  : 'bg-white/80 text-stone-600 hover:bg-stone-100 border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في كشكولك..."
              className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-1.5 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder-stone-400"
            />
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          </div>

          {initialNotes.length > 0 && (
            <button
              onClick={handlePrint}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              <Printer className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              <span>طباعة الكشكول</span>
            </button>
          )}
        </div>
      </div>

      {/* قائمة الفوائد المقيدة */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xs transition hover:border-emerald-700/30 hover:shadow-md dark:border-stone-800 dark:bg-stone-900/95"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold ${
                      tagColors[note.tag] || 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {note.tag || 'فائدة'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400">
                      {new Date(note.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() => handleCopy(note.content, note.id)}
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition cursor-pointer"
                      title="نسخ الفائدة"
                    >
                      {copiedId === note.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold leading-relaxed text-stone-900 dark:text-stone-100 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>

              <div className="mt-5 border-t border-stone-100 pt-3 text-[11px] font-medium text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <Link
                  href={`/courses/${note.courseSlug}`}
                  className="flex items-center gap-1.5 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
                >
                  <BookOpen className="h-3.5 w-3.5 text-stone-400" />
                  <span className="line-clamp-1 font-bold">
                    {note.courseTitle}
                    {note.courseCategory && ` • ${note.courseCategory}`}
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-12 text-center dark:border-stone-800 dark:bg-stone-900/60">
          <Bookmark className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-600" />
          <h4 className="mt-3 text-sm font-bold text-stone-700 dark:text-stone-200">لا توجد فوائد مقيدة مطابقة</h4>
          <p className="mt-1 text-xs text-stone-400">
            أثناء حضورك لأي مجلس، استخدم الكشكول الجانبي لتقييد القواعد والضوابط وستجدها هنا فوراً.
          </p>
        </div>
      )}
    </div>
  )
}