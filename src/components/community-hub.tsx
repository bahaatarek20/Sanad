'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  ThumbsUp,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  UserCheck,
  Filter,
  CornerDownLeft,
  Clock,
  Crown,
  ShieldCheck,
  AlertCircle,
  Wifi,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'

export interface CommunityReply {
  id: string
  post_id: string
  anonymous_alias: string
  author_email?: string
  author_avatar_url?: string
  author_role?: 'owner' | 'admin' | 'student'
  content: string
  created_at: string
}

export interface CommunityPost {
  id: string
  anonymous_alias: string
  author_email?: string
  author_avatar_url?: string
  author_role?: 'owner' | 'admin' | 'student'
  author_education_level?: string
  course_slug?: string
  post_type: 'benefit' | 'question' | 'summary'
  content: string
  upvotes_count: number
  created_at: string
  replies?: CommunityReply[]
}

interface CommunityHubProps {
  initialPosts: CommunityPost[]
  courses: MatnCourse[]
  isLoggedIn: boolean
  currentUserDisplay?: {
    name: string
    avatarUrl?: string
    role?: 'owner' | 'admin' | 'student'
  }
}

const PRESET_BADGE_MAP: Record<string, { emoji: string; gradient: string }> = {
  'preset:emerald-scholar': { emoji: '📖', gradient: 'from-emerald-700 to-teal-900' },
  'preset:amber-scribe': { emoji: '🪶', gradient: 'from-amber-600 to-yellow-800' },
  'preset:indigo-seeker': { emoji: '🧭', gradient: 'from-indigo-700 to-slate-900' },
  'preset:rose-hafiz': { emoji: '👑', gradient: 'from-rose-700 to-red-950' },
  'preset:cyan-hikmah': { emoji: '✨', gradient: 'from-cyan-700 to-blue-950' },
  'preset:stone-murabit': { emoji: '🛡️', gradient: 'from-stone-700 to-stone-950' },
}

function CommunityAuthorAvatar({
  alias,
  avatarUrl,
  role,
  size = 'md',
}: {
  alias: string
  avatarUrl?: string
  role?: 'owner' | 'admin' | 'student'
  size?: 'sm' | 'md'
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const dimClass = size === 'sm' ? 'h-8 w-8 rounded-lg text-xs' : 'h-10 w-10 rounded-xl text-sm'

  const isOwner = role === 'owner' || alias.includes('مالك المنصة') || alias.includes('المشرف العام')
  const isAdmin = role === 'admin' || alias.includes('مشرف المنصة')

  const isValidImage =
    !imgFailed &&
    Boolean(
      avatarUrl &&
        (avatarUrl.startsWith('data:image/') ||
          avatarUrl.startsWith('/uploads/') ||
          avatarUrl.startsWith('http'))
    )

  const preset = avatarUrl ? PRESET_BADGE_MAP[avatarUrl] : undefined

  if (isValidImage) {
    return (
      <img
        src={avatarUrl}
        alt={alias}
        onError={() => setImgFailed(true)}
        className={`${dimClass} shrink-0 object-cover border ${
          isOwner
            ? 'border-amber-400 ring-2 ring-amber-400/30'
            : isAdmin
            ? 'border-emerald-500 ring-1 ring-emerald-500/30'
            : 'border-stone-200 dark:border-stone-700'
        } shadow-2xs`}
      />
    )
  }

  if (preset) {
    return (
      <div
        className={`flex ${dimClass} shrink-0 items-center justify-center bg-gradient-to-br ${preset.gradient} text-white shadow-2xs border ${
          isOwner ? 'border-amber-400' : 'border-white/20'
        }`}
        title={alias}
      >
        <span className={size === 'sm' ? 'text-sm' : 'text-lg'}>{preset.emoji}</span>
      </div>
    )
  }

  const initialChar = (alias || 'ط').trim()[0] || 'ط'

  return (
    <div
      className={`flex ${dimClass} shrink-0 items-center justify-center font-bold font-amiri shadow-2xs ${
        isOwner
          ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-950 text-white ring-2 ring-amber-400/40'
          : isAdmin
          ? 'bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-200'
          : 'bg-gradient-to-br from-emerald-900 to-stone-900 text-amber-400'
      }`}
      title={alias}
    >
      {initialChar}
    </div>
  )
}

export default function CommunityHub({
  initialPosts,
  courses,
  isLoggedIn,
  currentUserDisplay,
}: CommunityHubProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'benefit' | 'question' | 'summary'>('all')

  // حقول المشاركة الجديدة
  const [newContent, setNewContent] = useState('')
  const [newPostType, setNewPostType] = useState<'benefit' | 'question' | 'summary'>('benefit')
  const [newCourseSlug, setNewCourseSlug] = useState<string>('')
  const [postError, setPostError] = useState<string | null>(null)

  // الردود المفتوحة
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // الإعجابات المحلية
  const [upvotedIds, setUpvotedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [syncStatus, setSyncStatus] = useState<'live' | 'reconnecting'>('live')

  const syncCommunityFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/community/posts', { cache: 'no-store' })
      if (!res.ok) {
        setSyncStatus('reconnecting')
        return
      }
      const data = await res.json()
      if (data.success && Array.isArray(data.posts)) {
        setSyncStatus('live')
        setPosts((prev) => {
          const map = new Map<string, CommunityPost>()
          for (const serverPost of data.posts as CommunityPost[]) {
            map.set(serverPost.id, serverPost)
          }
          for (const localPost of prev) {
            if (!map.has(localPost.id)) {
              map.set(localPost.id, localPost)
            } else {
              const sp = map.get(localPost.id)!
              const replyMap = new Map<string, CommunityReply>()
              for (const sr of sp.replies || []) replyMap.set(sr.id, sr)
              for (const lr of localPost.replies || []) {
                if (!replyMap.has(lr.id)) replyMap.set(lr.id, lr)
              }
              map.set(localPost.id, {
                ...sp,
                upvotes_count: Math.max(sp.upvotes_count || 0, localPost.upvotes_count || 0),
                replies: Array.from(replyMap.values()),
              })
            }
          }
          const list = Array.from(map.values())
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          return list
        })
      }
    } catch {
      setSyncStatus('reconnecting')
    }
  }, [])

  // تزامن لحظي مستمر + استعادة الاتصال التلقائية عند عودة الشبكة أو فتح التبويب
  useEffect(() => {
    syncCommunityFeed()
    const interval = setInterval(syncCommunityFeed, 3500)

    const handleOnline = () => syncCommunityFeed()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncCommunityFeed()
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [syncCommunityFeed])

  const filteredPosts = posts.filter((post) => {
    const matchCourse = selectedCourse === 'all' || post.course_slug === selectedCourse
    const matchType = selectedType === 'all' || post.post_type === selectedType
    return matchCourse && matchType
  })

  function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setPostError(null)

    const contentToSend = newContent.trim()
    const typeToSend = newPostType
    const slugToSend = newCourseSlug

    startTransition(async () => {
      try {
        const res = await fetch('/api/community/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-post',
            content: contentToSend,
            postType: typeToSend,
            courseSlug: slugToSend || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setPostError(data.error || 'تعذر نشر المشاركة حالياً.')
          return
        }
        if (data.post) {
          setNewContent('')
          setPosts((prev) => {
            const exists = prev.some((p) => p.id === data.post.id)
            return exists ? prev : [data.post, ...prev]
          })
        }
      } catch {
        setPostError('تعذر الاتصال بالخادم، يرجى التحقق من الشبكة والمحاولة مجدداً.')
      }
    })
  }

  function handleAddReply(postId: string) {
    if (!replyContent.trim()) return
    setPostError(null)

    const replyToSend = replyContent.trim()

    startTransition(async () => {
      try {
        const res = await fetch('/api/community/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-reply',
            postId,
            content: replyToSend,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setPostError(data.error || 'تعذر إرسال الرد.')
          return
        }
        if (data.reply) {
          setReplyContent('')
          setActiveReplyPostId(null)
          setPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    replies: [...(post.replies || []).filter((r) => r.id !== data.reply.id), data.reply],
                  }
                : post
            )
          )
        }
      } catch {
        setPostError('تعذر الاتصال بالخادم لإرسال الرد.')
      }
    })
  }

  function handleUpvote(postId: string) {
    if (upvotedIds.includes(postId)) return
    setUpvotedIds((prev) => [...prev, postId])
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, upvotes_count: post.upvotes_count + 1 } : post
      )
    )

    fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote', postId }),
    }).catch(() => {})
  }

  function getPostBadge(type: 'benefit' | 'question' | 'summary') {
    switch (type) {
      case 'benefit':
        return {
          label: 'فائدة علمية',
          icon: Lightbulb,
          className:
            'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
        }
      case 'question':
        return {
          label: 'سؤال واستشكال',
          icon: HelpCircle,
          className:
            'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50',
        }
      case 'summary':
        return {
          label: 'تلخيص وتشجير',
          icon: BookOpen,
          className:
            'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50',
        }
    }
  }

  function getCourseTitle(slug?: string) {
    if (!slug) return 'مجلس عام'
    const found = courses.find((c) => c.slug === slug)
    return found ? found.title : 'مجلس عام'
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* العمود الجانبي: الفلترة وضوابط المجلس */}
      <div className="lg:col-span-4 space-y-6">
        {/* ضوابط المجلس ومؤشر التزامن الحي */}
        <div className="rounded-3xl border border-emerald-900/15 bg-gradient-to-br from-emerald-950 to-stone-900 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-bold font-amiri text-xl">آداب مجلس المذاكرة</h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                syncStatus === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              {syncStatus === 'live' ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span>متصل لحظياً</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 text-amber-400 animate-spin" />
                  <span>إعادة المزامنة...</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed mb-4">
            قال الإمام الزهري رحمه الله: «إنما يذهب العلم النسيانُ وتركُ المذاكرة». هذا الفضاء مخصص لتقييد الفوائد ومدارسة المسائل المتعلقة بالمتون المقررة.
          </p>
          <ul className="space-y-2.5 text-xs text-emerald-100/90 border-t border-white/10 pt-4">
            <li className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <span>تظهر مشاركاتك باسمك وصورتك الرمزية (أو حسب إعدادات الخصوصية في حسابك).</span>
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400 shrink-0" />
              <span>ربط الفائدة أو السؤال بالمتن العلمي المحدد ليسهل الرجوع إليها.</span>
            </li>
          </ul>
        </div>

        {/* تصفية حسب نوع المشاركة */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-200">
            <Filter className="h-4 w-4 text-emerald-700" />
            <h4 className="font-bold text-sm">تصنيف المدارسات</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all', label: 'جميع المشاركات' },
              { id: 'benefit', label: 'فوائد وشوارد' },
              { id: 'question', label: 'أسئلة واستشكالات' },
              { id: 'summary', label: 'تلاخيص وتشجير' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as 'all' | 'benefit' | 'question' | 'summary')}
                className={`rounded-xl px-3 py-2.5 text-xs font-bold transition text-right ${
                  selectedType === tab.id
                    ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-700'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800">
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">
              تصفية حسب المتن العلمي:
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-medium text-stone-800 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="all">كل المتون العلمية ({courses.length})</option>
              {courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title} — {course.category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* العمود الرئيسي: كتابة مشاركة وسجل المدارسات */}
      <div className="lg:col-span-8 space-y-6">
        {/* صندوق إضافة مشاركة جديدة */}
        <form
          onSubmit={handleCreatePost}
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              {currentUserDisplay && (
                <CommunityAuthorAvatar
                  alias={currentUserDisplay.name}
                  avatarUrl={currentUserDisplay.avatarUrl}
                  role={currentUserDisplay.role}
                  size="sm"
                />
              )}
              <div>
                <h3 className="font-bold font-amiri text-lg text-stone-900 dark:text-white">
                  شارك فائدة أو اطرح سؤالاً للمذاكرة
                </h3>
                {currentUserDisplay && (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    النشر باسم: <span className="font-bold text-emerald-800 dark:text-emerald-400">{currentUserDisplay.name}</span>
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 transition dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
              title="تعديل الصورة الشخصية أو إعدادات الخصوصية"
            >
              <Settings className="h-3 w-3" />
              <span>إعدادات الهوية والخصوصية</span>
            </Link>
          </div>

          {postError && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{postError}</span>
            </div>
          )}

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="قيّد فائدة استنبطتها من الشرح، أو ضابطاً فقهياً، أو مسألة تحتاج مدارسة مع إخوانك..."
            className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/60 dark:text-white"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newPostType}
                onChange={(e) => setNewPostType(e.target.value as 'benefit' | 'question' | 'summary')}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                <option value="benefit">💡 فائدة علمية</option>
                <option value="question">❓ سؤال واستشكال</option>
                <option value="summary">📑 تلخيص وضبط</option>
              </select>

              <select
                value={newCourseSlug}
                onChange={(e) => setNewCourseSlug(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 max-w-[220px] truncate dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                <option value="">مجلس عام (بدون متن محدد)</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!newContent.trim() || isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isPending ? 'جارٍ النشر...' : 'نشر في المجلس'}</span>
            </button>
          </div>
        </form>

        {/* قائمة المشاركات */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white/50 p-12 text-center dark:border-stone-800 dark:bg-stone-900/40">
              <MessageSquare className="mx-auto h-10 w-10 text-stone-400 mb-3" />
              <p className="font-bold text-stone-700 dark:text-stone-300">لا توجد مشاركات في هذا التصنيف بعد</p>
              <p className="text-xs text-stone-500 mt-1">كن أول من يفتتح المذاكرة بتقييد فائدة أو سؤال علمي.</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const badge = getPostBadge(post.post_type)
              const BadgeIcon = badge.icon
              const isUpvoted = upvotedIds.includes(post.id)
              const isOwnerPost =
                post.author_role === 'owner' ||
                post.anonymous_alias?.includes('مالك المنصة') ||
                post.anonymous_alias?.includes('المشرف العام')
              const isAdminPost =
                post.author_role === 'admin' || post.anonymous_alias?.includes('مشرف المنصة')

              return (
                <div
                  key={post.id}
                  className={`rounded-3xl border p-6 shadow-xs transition hover:border-stone-300 dark:hover:border-stone-700 ${
                    isOwnerPost
                      ? 'border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/20 dark:border-amber-700/50 dark:from-amber-950/20 dark:via-stone-900 dark:to-emerald-950/20'
                      : 'border-stone-200/90 bg-white dark:border-stone-800 dark:bg-stone-900'
                  }`}
                >
                  {/* رأس المشاركة مع الصورة الشخصية والاسم والرتبة */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <CommunityAuthorAvatar
                        alias={post.anonymous_alias}
                        avatarUrl={post.author_avatar_url}
                        role={post.author_role}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isOwnerPost
                                ? 'text-amber-900 dark:text-amber-300'
                                : isAdminPost
                                ? 'text-emerald-900 dark:text-emerald-300'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {post.anonymous_alias}
                          </span>
                          {isOwnerPost && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700">
                              <Crown className="h-2.5 w-2.5 text-amber-600" />
                              <span>مالك المنصة</span>
                            </span>
                          )}
                          {!isOwnerPost && isAdminPost && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700">
                              <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                              <span>مشرف</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(post.created_at).toLocaleDateString('ar-SA', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                          {post.author_education_level && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {post.author_education_level}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {post.course_slug && (
                        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {getCourseTitle(post.course_slug)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* نص المشاركة */}
                  <p className="whitespace-pre-line text-sm leading-relaxed text-stone-800 dark:text-stone-200 font-normal">
                    {post.content}
                  </p>

                  {/* شريط التفاعل */}
                  <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800/80">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleUpvote(post.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          isUpvoted
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>نفع الله بك ({post.upvotes_count})</span>
                      </button>

                      <button
                        onClick={() =>
                          setActiveReplyPostId(activeReplyPostId === post.id ? null : post.id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 transition dark:text-stone-400 dark:hover:bg-stone-800"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>مدارسة وتعقيب ({post.replies?.length || 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* قسم الردود مع عرض الصورة الرمزية والاسم لكل مشارك في الرد */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="mt-4 space-y-2.5 border-r-2 border-emerald-700/30 pr-4 mr-2">
                      {post.replies.map((reply) => {
                        const isReplyOwner =
                          reply.author_role === 'owner' ||
                          reply.anonymous_alias?.includes('مالك المنصة') ||
                          reply.anonymous_alias?.includes('المشرف العام')
                        const isReplyAdmin =
                          reply.author_role === 'admin' ||
                          reply.anonymous_alias?.includes('مشرف المنصة')

                        return (
                          <div
                            key={reply.id}
                            className={`rounded-2xl p-3.5 text-xs ${
                              isReplyOwner
                                ? 'bg-amber-50/70 border border-amber-300/70 dark:bg-amber-950/30 dark:border-amber-800/50'
                                : 'bg-stone-50 dark:bg-stone-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <CommunityAuthorAvatar
                                  alias={reply.anonymous_alias}
                                  avatarUrl={reply.author_avatar_url}
                                  role={reply.author_role}
                                  size="sm"
                                />
                                <div>
                                  <span
                                    className={`font-bold flex items-center gap-1 ${
                                      isReplyOwner
                                        ? 'text-amber-900 dark:text-amber-300'
                                        : isReplyAdmin
                                        ? 'text-emerald-800 dark:text-emerald-300'
                                        : 'text-emerald-900 dark:text-emerald-400'
                                    }`}
                                  >
                                    {isReplyOwner && <Crown className="h-3 w-3 text-amber-600" />}
                                    {!isReplyOwner && isReplyAdmin && (
                                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                    )}
                                    {reply.anonymous_alias}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-stone-400">
                                {new Date(reply.created_at).toLocaleDateString('ar-SA', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-stone-700 dark:text-stone-300 leading-relaxed pr-1">
                              {reply.content}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* إضافة رد جديد */}
                  {activeReplyPostId === post.id && (
                    <div className="mt-4 flex items-center gap-2 pt-2">
                      <CornerDownLeft className="h-4 w-4 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddReply(post.id)
                          }
                        }}
                        placeholder="أضف تعقيباً علمياً أو جواباً على هذه المشاركة..."
                        className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(post.id)}
                        className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                      >
                        إرسال
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
