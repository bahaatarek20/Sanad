'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Inbox,
  ShieldCheck,
  Award,
  Bell,
  Trash2,
  Star,
  Search,
  RefreshCw,
  CheckCircle2,
  CheckCheck,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Filter,
  ExternalLink,
  Send,
  User,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

interface StudentMessage {
  id: string
  recipient: string
  sender: string
  senderName?: string
  subject: string
  body: string
  type: 'otp' | 'security' | 'academic' | 'reminder' | 'system'
  read: boolean
  createdAt: string
  timestamp?: string
  otpCode?: string
}

function InboxContent() {
  const searchParams = useSearchParams()
  const initialSelectedId = searchParams.get('id')

  const [messages, setMessages] = useState<StudentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState<'all' | 'unread' | 'security' | 'academic' | 'starred'>('all')
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(initialSelectedId)
  const [searchQuery, setSearchQuery] = useState('')
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState(false)
  const [studentEmail, setStudentEmail] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)

  // جلب الرسائل
  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        setMessages(msgs)
        setStudentEmail(data.email || '')
        setIsAuthenticated(data.authenticated ?? true)
        
        // إذا كان هناك معرف في الرابط، اختره تلقائياً
        if (initialSelectedId && !selectedMessageId) {
          setSelectedMessageId(initialSelectedId)
        } else if (!selectedMessageId && msgs.length > 0) {
          // اختر أول رسالة تلقائياً للشاشات الكبيرة
          setSelectedMessageId(msgs[0].id)
        }
      }
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  // الاستماع لأي تحديثات على الرسائل في المنصة لمزامنة الحالة فوراً
  useEffect(() => {
    const handleSync = () => {
      fetch('/api/messages')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages) {
            setMessages(data.messages)
          }
        })
        .catch(() => {})
    }
    window.addEventListener('sanad_messages_updated', handleSync)
    return () => window.removeEventListener('sanad_messages_updated', handleSync)
  }, [])

  // تحديد رسالة كمقروءة وإشعار كامل أرجاء المنصة (بما فيها العداد في الشريط العلوي) فوراً
  const markAsRead = async (messageId: string) => {
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === messageId)
      if (!exists || exists.read) return prev
      return prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
    })

    // تحديث فوري فائق السرعة عبر الحدث للواجهة والشريط العلوي
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
    }

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', messageId }),
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
      }
    } catch {}
  }

  // بمجرد عرض أو مشاهدة أي رسالة غير مقروءة على الشاشة، تتحول تلقائياً إلى مقروءة ويختفي العداد
  useEffect(() => {
    if (!selectedMessageId || messages.length === 0) return
    const msg = messages.find((m) => m.id === selectedMessageId)
    if (msg && !msg.read) {
      markAsRead(msg.id)
    }
  }, [selectedMessageId, messages])

  // تحديد كافة الرسائل كمقروءة دفعة واحدة
  const handleMarkAllRead = async () => {
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
    }
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' }),
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
      }
    } catch {}
  }

  // تحديد رسالة معينة وتحديث حالتها كمقروءة
  const handleSelectMessage = (msg: StudentMessage) => {
    setSelectedMessageId(msg.id)
    if (!msg.read) {
      markAsRead(msg.id)
    }
  }

  // حذف رسالة
  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    if (selectedMessageId === messageId) {
      const remaining = messages.filter((m) => m.id !== messageId)
      setSelectedMessageId(remaining.length > 0 ? remaining[0].id : null)
    }
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', messageId }),
      })
    } catch {}
  }

  // تمييز بنجمة
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // تصفية الرسائل
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // تصفية المجلد
      if (activeFolder === 'unread' && msg.read) return false
      if (activeFolder === 'security' && msg.type !== 'security' && msg.type !== 'otp') return false
      if (activeFolder === 'academic' && msg.type !== 'academic' && msg.type !== 'reminder') return false
      if (activeFolder === 'starred' && !starredIds.has(msg.id)) return false

      // بحث الكلمات
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchSubject = msg.subject.toLowerCase().includes(q)
        const matchSender = msg.sender.toLowerCase().includes(q)
        const matchBody = msg.body.toLowerCase().includes(q)
        const matchOtp = msg.otpCode?.includes(q)
        return matchSubject || matchSender || matchBody || matchOtp
      }

      return true
    })
  }, [messages, activeFolder, searchQuery, starredIds])

  const selectedMessage = messages.find((m) => m.id === selectedMessageId) || null
  const unreadTotal = messages.filter((m) => !m.read).length

  // نسخ رمز التحقق
  const copyOtp = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#121110] text-stone-900 dark:text-stone-100 transition-colors">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        
        {/* شريط العنوان التراثي لبريد سَنَد العلمي */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-md ring-1 ring-amber-400/20">
              <Inbox className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                  صندوق بريد سَنَد (Sanad Mail)
                </h1>
                {unreadTotal > 0 && (
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black text-stone-950">
                    {unreadTotal} جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                مركز المراسلات العلمية، رموز التحقق والأمان، وتنبيهات المجالس التأصيلية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {unreadTotal > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="وسم جميع الرسائل كمقروءة"
                className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50/90 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition cursor-pointer dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200"
              >
                <CheckCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>وسم الكل كمقروء</span>
              </button>
            )}
            <button
              onClick={fetchMessages}
              disabled={loading}
              title="تحديث الرسائل"
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-850 dark:text-stone-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>تحديث</span>
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50/70 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>الكشكول العلمي</span>
            </Link>
          </div>
        </div>

        {/* الواجهة الرئيسية: عمود المجلدات + قائمة الرسائل + نافذة قراءة الرسالة (Gmail Layout) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
          
          {/* 1. الشريط الجانبي للمجلدات (Sidebar) */}
          <div className="lg:col-span-3 space-y-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-1">
              
              <button
                type="button"
                onClick={() => setActiveFolder('all')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeFolder === 'all'
                    ? 'bg-emerald-900 text-amber-300 font-black shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="h-4 w-4" />
                  <span>البريد الوارد (Inbox)</span>
                </div>
                <span className="text-[11px] font-mono opacity-80">{messages.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder('unread')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeFolder === 'unread'
                    ? 'bg-emerald-900 text-amber-300 font-black shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-amber-500" />
                  <span>الرسائل غير المقروءة</span>
                </div>
                {unreadTotal > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.2 text-[10px] font-black text-stone-950">
                    {unreadTotal}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder('security')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeFolder === 'security'
                    ? 'bg-emerald-900 text-amber-300 font-black shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>رموز التحقق والأمان (OTP)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder('academic')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeFolder === 'academic'
                    ? 'bg-emerald-900 text-amber-300 font-black shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Award className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>التنبيهات الأكاديمية</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder('starred')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeFolder === 'starred'
                    ? 'bg-emerald-900 text-amber-300 font-black shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>المميزة بنجمة</span>
                </div>
                <span className="text-[11px] font-mono opacity-80">{starredIds.size}</span>
              </button>
            </div>

            {/* بطاقة معلومات الحساب التوثيقية */}
            <div className="rounded-2xl border border-stone-200/90 bg-linear-to-b from-stone-50 to-[#f6f2e8] p-4 text-xs dark:border-stone-800 dark:from-stone-900 dark:to-stone-950">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-black mb-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>بريد منصة سَنَد المعتمد</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                كل رمز تحقق أو إشعار تأصيلي يصلك هنا مباشرة وفي الوقت الفعلي لحماية حسابك وتيسير طلب العلم.
              </p>
              {studentEmail && (
                <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-800 font-mono text-[10px] text-stone-500 truncate">
                  {studentEmail}
                </div>
              )}
            </div>
          </div>

          {/* 2. عمود قائمة الرسائل (Message List) */}
          <div className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900/90 flex flex-col">
            
            {/* شريط البحث السريع في الرسائل */}
            <div className="border-b border-stone-200 p-3 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-850 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في رسائل سَنَد..."
                  className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-9 pl-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              </div>
              {unreadTotal > 0 && (
                <div className="flex items-center justify-between text-[11px] px-1 text-stone-500 dark:text-stone-400">
                  <span className="font-medium">
                    {unreadTotal === 1 ? 'رسالة واحدة غير مقروءة' : `${unreadTotal} رسائل غير مقروءة`}
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-amber-800 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>وسم الكل كمقروء</span>
                  </button>
                </div>
              )}
            </div>

            {/* محتوى القائمة */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 max-h-[600px]">
              {loading ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-800 mb-2" />
                  <span>جارٍ جلب الرسائل...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Mail className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-600 mb-2" />
                  <p className="font-bold text-stone-600 dark:text-stone-300">لا توجد رسائل في هذا المجلد</p>
                  <p className="text-[11px] mt-1 text-stone-400">
                    {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'صندوقك نظيف ومحدّث بالكامل'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMessageId === msg.id
                  const isStarred = starredIds.has(msg.id)
                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg)}
                      className={`group relative flex items-start gap-2.5 p-3.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 border-r-4 border-r-emerald-800 dark:bg-emerald-950/40 dark:border-r-emerald-500'
                          : !msg.read
                          ? 'bg-amber-50/50 hover:bg-stone-50 dark:bg-amber-950/20 dark:hover:bg-stone-800/50'
                          : 'hover:bg-stone-50/80 dark:hover:bg-stone-800/40'
                      }`}
                    >
                      {/* زر النجمة */}
                      <button
                        type="button"
                        onClick={(e) => toggleStar(msg.id, e)}
                        className="mt-0.5 text-stone-300 hover:text-amber-400 transition"
                      >
                        <Star
                          className={`h-4 w-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`}
                        />
                      </button>

                      {/* تفاصيل الرسالة */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs truncate ${
                              !msg.read
                                ? 'font-black text-stone-900 dark:text-white'
                                : 'font-bold text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {msg.sender || msg.senderName || 'إدارة منصة سَنَد'}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono shrink-0">
                            {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <h4
                          className={`text-xs mt-0.5 truncate ${
                            !msg.read
                              ? 'font-bold text-stone-900 dark:text-white'
                              : 'text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {msg.subject || 'إشعار من منصة سَنَد'}
                        </h4>

                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {(msg.body || '').replace(/\n/g, ' ')}
                        </p>

                        {/* شارة رمز التحقق إن وُجد */}
                        {msg.otpCode && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3" />
                              <span>{msg.otpCode}</span>
                            </span>
                            <span className="text-[10px] text-stone-400">انقر للنسخ</span>
                          </div>
                        )}
                      </div>

                      {/* نقطة غير مقروء */}
                      {!msg.read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 3. نافذة قراءة الرسالة المحددة (Reading Pane - Gmail Style) */}
          <div className="lg:col-span-5 rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900/90 flex flex-col">
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                {/* ترويسة الرسالة وأدوات الإجراء */}
                <div className="flex items-center justify-between border-b border-stone-200 bg-[#fbf9f4] p-4 dark:border-stone-800 dark:bg-stone-850">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      title="حذف الرسالة"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>موثق بسند</span>
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400">
                    {new Date(selectedMessage.createdAt).toLocaleString('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                {/* تفاصيل الرسالة ومحتواها */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  
                  {/* عنوان الرسالة */}
                  <h2 className="text-lg font-black text-stone-900 dark:text-white leading-snug">
                    {selectedMessage.subject}
                  </h2>

                  {/* بطاقة المرسل والمستلم */}
                  <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900 text-amber-300 font-black text-sm">
                      {(selectedMessage?.sender || selectedMessage?.senderName || 'سَنَد')[0] || 'س'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900 dark:text-white">
                          {selectedMessage?.sender || selectedMessage?.senderName || 'إدارة منصة سَنَد'}
                        </span>
                        <span className="text-[10px] text-stone-400">&lt;noreply@sanad.edu&gt;</span>
                      </div>
                      <div className="text-[10px] text-stone-400">
                        إلى: {selectedMessage?.recipient || studentEmail || 'طالب العلم'}
                      </div>
                    </div>
                  </div>

                  {/* في حال وجود رمز تحقق OTP: بطاقة بارزة جاهزة للنسخ بنقرة واحدة */}
                  {selectedMessage.otpCode && (
                    <div className="rounded-2xl border-2 border-dashed border-emerald-600/40 bg-emerald-50/70 p-5 text-center dark:border-emerald-700/50 dark:bg-emerald-950/40">
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        رمز التحقق السري الخاص بك (OTP)
                      </div>
                      <div className="font-mono text-3xl font-black tracking-widest text-emerald-950 dark:text-white my-3 select-all">
                        {selectedMessage.otpCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyOtp(selectedMessage.otpCode!)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-black text-white hover:bg-emerald-950 transition cursor-pointer shadow-md"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-amber-300" />
                            <span>تم نسخ الرمز!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>نسخ الرمز للاستخدام في شاشة الدخول</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2">
                        صالح لمدة 10 دقائق من تاريخ الإرسال. لا تشارك هذا الرمز مع أي شخص.
                      </p>
                    </div>
                  )}

                  {/* نص الرسالة الأصلي */}
                  <div className="rounded-2xl bg-stone-50/80 p-5 text-xs text-stone-800 leading-loose dark:bg-stone-850 dark:text-stone-200 border border-stone-200/60 dark:border-stone-800 whitespace-pre-line font-medium">
                    {selectedMessage.body}
                  </div>

                  {/* إجراءات سريعة لطالب العلم */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Link
                      href="/courses"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-950 transition"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                      <span>الانتقال لفهرس المتون</span>
                    </Link>
                    <Link
                      href="/roadmap"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      <span>خارطة الطريق التأصيلية</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center text-stone-400">
                <Mail className="h-12 w-12 text-stone-300 dark:text-stone-700 mb-3" />
                <h3 className="text-sm font-black text-stone-600 dark:text-stone-300">
                  اختر رسالة من القائمة لعرض تفاصيلها
                </h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">
                  يمكنك مراجعة كافة رسائل التأصيل، ورموز التحقق، والإشعارات الإدارية الخاصة بك هنا.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  )
}
