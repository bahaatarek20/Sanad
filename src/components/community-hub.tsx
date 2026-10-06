'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  MessageSquare,
  ThumbsUp,
  HelpCircle,
  BookOpen,
  Sparkles,
  Send,
  Plus,
  ShieldCheck,
  Filter,
  CheckCircle2,
  FileText,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'
import {
  createCommunityPost,
  upvotePost,
  addCommunityReply,
  getLatestCommunityPostsAction,
} from '@/app/community/actions'

export interface CommunityReply {
  id: string
  post_id: string
  anonymous_alias: string
  content: string
  created_at: string
}

export interface CommunityPost {
  id: string
  anonymous_alias: string
  course_slug?: string | null
  post_type: 'question' | 'summary' | 'benefit'
  content: string
  upvotes_count: number
  created_at: string
  replies?: CommunityReply[]
}

interface CommunityHubProps {
  initialPosts: CommunityPost[]
  courses: MatnCourse[]
  isLoggedIn?: boolean
}

export default function CommunityHub({
  initialPosts,
  courses,
  isLoggedIn = false,
}: CommunityHubProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [activeFilter, setActiveFilter] = useState<'all' | 'question' | 'summary' | 'benefit'>('all')
  const [isPosting, setIsPosting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState<string | null>(null)
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState<'question' | 'summary' | 'benefit'>('benefit')
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>('')
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set())

  // استرجاع الإعجابات السابقة من التخزين المحلي لمنع التكرار (1 blessing per user)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_user_upvotes')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setUserUpvotes(new Set(parsed))
        }
      }
    } catch {}
  }, [])

  // المزامنة الدورية الخلفية كل 45 ثانية لجلب أي مشاركات جديدة للطلاب تلقائياً
  useEffect(() => {
    const timer = setInterval(() => {
      getLatestCommunityPostsAction()
        .then((updated) => {
          if (updated && updated.length > 0) {
            setPosts(updated)
          }
        })
        .catch(() => {})
    }, 45000)
    return () => clearInterval(timer)
  }, [])

  // تحديث يدوي للمجلس
  const handleRefreshPosts = async () => {
    setIsRefreshing(true)
    try {
      const updated = await getLatestCommunityPostsAction()
      if (updated && updated.length > 0) {
        setPosts(updated)
      }
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // تصفية المنشورات
  const filteredPosts = posts.filter(
    (p) => activeFilter === 'all' || p.post_type === activeFilter
  )

  // إرسال منشور جديد
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setPostError(null)
    setPostSuccess(null)

    if (!isLoggedIn) {
      setPostError('يرجى تسجيل الدخول بحساب طالب لتتمكن من مشاركة المسائل والفوائد في المجلس.')
      return
    }

    if (!postContent.trim() || isPosting) return

    setIsPosting(true)
    const formData = new FormData()
    formData.append('content', postContent.trim())
    formData.append('postType', postType)
    if (selectedCourseSlug) {
      formData.append('courseSlug', selectedCourseSlug)
    }

    const res = await createCommunityPost(formData)
    if (res.success && res.post) {
      const newPost: CommunityPost = {
        ...res.post,
        post_type: res.post.post_type as 'question' | 'summary' | 'benefit',
        replies: [],
      }
      setPosts([newPost, ...posts])
      setPostContent('')
      setSelectedCourseSlug('')
      setPostSuccess('تم نشر مسألتك بنجاح في المجلس وستظهر لكافة إخوانك الطلاب!')
      setTimeout(() => setPostSuccess(null), 6000)
    } else {
      setPostError(res.error || 'تعذر نشر المسألة، يرجى المحاولة مرة أخرى.')
    }
    setIsPosting(false)
  }

  // تسجيل دعوة بالبركة / إعجاب (مقتصر على مرة واحدة فقط لكل طالب)
  const handleUpvote = async (postId: string) => {
    if (userUpvotes.has(postId)) return

    const nextUpvotes = new Set([...userUpvotes, postId])
    setUserUpvotes(nextUpvotes)
    try {
      localStorage.setItem('sanad_user_upvotes', JSON.stringify(Array.from(nextUpvotes)))
    } catch {}

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvotes_count: p.upvotes_count + 1 } : p
      )
    )

    // إشعار نظام التشغيل المباشر عبر Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('منصة سَنَد — مجلس المذاكرة', {
            body: 'دعوتَ لأخيك طالب العلم بالتوفيق والبركة في مدارسته! 🌟',
            icon: '/icon.png',
          })
        } catch {}
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission()
      }
    }

    await upvotePost(postId)
  }

  // إضافة رد مجهول فوري وتفاؤلي (Optimistic UI Update)
  const handleAddReply = async (postId: string) => {
    setReplyErrors((prev) => ({ ...prev, [postId]: '' }))

    if (!isLoggedIn) {
      setReplyErrors((prev) => ({ ...prev, [postId]: 'يرجى تسجيل الدخول بحساب طالب لتتمكن من إضافة رد.' }))
      return
    }

    const text = (replyInputs[postId] || '').trim()
    if (!text) return

    setReplyInputs((prev) => ({ ...prev, [postId]: '' }))

    const tempReplyId = `temp-${Date.now()}`
    const optimisticReply: CommunityReply = {
      id: tempReplyId,
      post_id: postId,
      anonymous_alias: 'طالب علم (أنت)',
      content: text,
      created_at: new Date().toISOString(),
    }

    // إضافة فورية في واجهة المستخدم
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            replies: [...(p.replies || []), optimisticReply],
          }
        }
        return p
      })
    )

    const res = await addCommunityReply(postId, text)
    if (res.success && res.reply) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              replies: (p.replies || []).map((r) =>
                r.id === tempReplyId ? (res.reply as CommunityReply) : r
              ),
            }
          }
          return p
        })
      )
    } else {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              replies: (p.replies || []).filter((r) => r.id !== tempReplyId),
            }
          }
          return p
        })
      )
      setReplyErrors((prev) => ({ ...prev, [postId]: res.error || 'تعذر إضافة الرد.' }))
    }
  }

  const postTypeBadges = {
    question: {
      label: 'استشكال ومسألة',
      color: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800',
      icon: HelpCircle,
    },
    summary: {
      label: 'تلخيص وضبط',
      color: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
      icon: FileText,
    },
    benefit: {
      label: 'فائدة مقيدة',
      color: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800',
      icon: Sparkles,
    },
  }

  return (
    <div className="space-y-8">
      {/* 1. ترويسة ميثاق المجلس والخصوصية الصارمة */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>مجلس علمي مجهول الهوية بالكامل (Anonymous Peer Hub)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white leading-snug">
              مجلس المذاكرة العام وتنافس الطلاب
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-xl leading-relaxed">
              هنا يُطرح الإشكال، وتُقيد الفوائد، وتُتداول الملخصات بلا أسماء حقيقية أو صور شخصية، حفاظاً على الإخلاص ونقاء بيئة الطلب.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200/60 dark:border-stone-700">
            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>«إذا تنازع طالبان في مسألة كان العلم ثالثهما»</span>
          </div>
        </div>
      </div>

      {/* تنبيه تسجيل الدخول للمشاركة */}
      {!isLoggedIn && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium">
              للمشاركة في مجلس المذاكرة وطرح المسائل أو كتابة الردود، يلزم تسجيل الدخول بحساب طالب مسجل.
            </span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800 transition shrink-0 shadow-2xs"
          >
            <span>تسجيل الدخول / إنشاء حساب</span>
          </Link>
        </div>
      )}

      {/* 2. نموذج طرح مسألة أو فائدة في المجلس */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900/95">
        <form onSubmit={handleCreatePost} className="space-y-4">
          {/* رسائل التنبيه والنجاح */}
          {postError && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{postError}</span>
            </div>
          )}

          {postSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{postSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-stone-900 dark:text-white">
              شارك المجلس مسألة أو فائدة:
            </span>

            {/* تصنيف المشاركة */}
            <div className="flex items-center gap-1.5">
              {(['benefit', 'question', 'summary'] as const).map((t) => {
                const Icon = postTypeBadges[t].icon
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      postType === t
                        ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
                        : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{postTypeBadges[t].label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ربط المشاركة بمتن معين اختياري */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedCourseSlug}
              onChange={(e) => setSelectedCourseSlug(e.target.value)}
              className="rounded-2xl border border-stone-200 bg-[#fbf9f4] px-3.5 py-2 text-xs text-stone-800 focus:border-emerald-800 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">متن عام (أو اختر المتن المرتبط بالموضوع)...</option>
              {courses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title} ({c.category})
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="اكتب مسألتك، استشكالك، أو تلخيصك العلمي للمجلس..."
            rows={3}
            className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] p-3.5 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-800 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-50 dark:placeholder-stone-400 dark:focus:bg-stone-800 dark:focus:text-white"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-stone-400">
              سيُنشر المنشور بمعرّف رمزي عشوائي تلقائي
            </span>
            <button
              type="submit"
              disabled={isPosting || !postContent.trim()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-950 disabled:opacity-50 transition cursor-pointer dark:bg-emerald-800"
            >
              <Send className="h-3.5 w-3.5" />
              <span>نشر في المجلس</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. شريط فلاتر المنشورات */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-4 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-stone-400" />
          {[
            { key: 'all', label: 'كافة المشاركات' },
            { key: 'question', label: 'استشكالات ومسائل' },
            { key: 'summary', label: 'تلخيصات وخرائط' },
            { key: 'benefit', label: 'فوائد وضوابط' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === f.key
                  ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshPosts}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 hover:text-emerald-900 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-emerald-400 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="تحديث المنشورات وجلب الجديد فوراً"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث المجلس'}</span>
          </button>
          <span className="text-xs text-stone-500 font-bold dark:text-stone-400">
            {filteredPosts.length} مشاركة
          </span>
        </div>
      </div>

      {/* 4. قائمة المنشورات في المجلس */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-12 text-center dark:border-stone-800 dark:bg-stone-900/60">
            <Users className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-600" />
            <h4 className="mt-3 text-sm font-bold text-stone-700 dark:text-stone-300">
              المجلس بانتظار مسألتك الأولى!
            </h4>
            <p className="mt-1 text-xs text-stone-400">
              شارك إشكالاً واجهك أو فائدة قيّدتها لتتناقش فيها مع إخوانك في ركب الطلب.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const course = courses.find((c) => c.slug === post.course_slug)
            const badge = postTypeBadges[post.post_type] || postTypeBadges.benefit
            const isExpanded = expandedPostId === post.id
            const hasUpvoted = userUpvotes.has(post.id)

            return (
              <div
                key={post.id}
                className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xs hover:border-amber-900/20 transition dark:border-stone-800 dark:bg-stone-900/95"
              >
                {/* ترويسة المنشور بالهوية المجهولة */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 font-bold text-xs ring-1 ring-amber-300/40 dark:bg-amber-950 dark:text-amber-200">
                      📖
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 dark:text-white block">
                        {post.anonymous_alias}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(post.created_at).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {course && (
                      <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {course.title}
                      </span>
                    )}
                    <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* نص المشاركة */}
                <p className="mt-4 text-xs sm:text-sm font-medium leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* شريط الإجراءات: إعجاب/اعتماد + ردود */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleUpvote(post.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition cursor-pointer ${
                      hasUpvoted
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-700 hover:text-emerald-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvoted ? 'fill-emerald-800' : ''}`} />
                    <span>فائدة معتمدة ({post.upvotes_count})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    className="inline-flex items-center gap-1 text-stone-500 hover:text-emerald-900 transition font-bold dark:text-stone-400 dark:hover:text-emerald-400 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>المدارسة والردود ({post.replies?.length || 0})</span>
                  </button>
                </div>

                {/* قسم الردود المنسدل */}
                {isExpanded && (
                  <div className="mt-4 rounded-2xl bg-stone-50/80 p-4 border border-stone-200/80 space-y-3 dark:bg-stone-800/60 dark:border-stone-700 animate-in fade-in duration-150">
                    <h5 className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                      إضافات وردود إخوانك في المجلس:
                    </h5>

                    {/* قائمة الردود */}
                    <div className="space-y-2">
                      {(!post.replies || post.replies.length === 0) ? (
                        <p className="text-[11px] text-stone-400">لا توجد ردود بعد، كن أول من يحرر المسألة!</p>
                      ) : (
                        post.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-xl border border-stone-200 bg-white p-3 text-xs dark:border-stone-700 dark:bg-stone-800"
                          >
                            <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                              <span className="font-bold text-emerald-900 dark:text-emerald-400">
                                {reply.anonymous_alias}
                              </span>
                              <span>
                                {new Date(reply.created_at).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                              {reply.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* رسالة الخطأ للرد إن وجدت */}
                    {replyErrors[post.id] && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-[11px] font-medium text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{replyErrors[post.id]}</span>
                      </div>
                    )}

                    {/* حقل إضافة رد */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={replyInputs[post.id] || ''}
                        onChange={(e) =>
                          setReplyInputs({ ...replyInputs, [post.id]: e.target.value })
                        }
                        placeholder="اكتب ردك أو فائدتك التوضيحية..."
                        className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-emerald-800 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(post.id)}
                        className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
                      >
                        إرسال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
