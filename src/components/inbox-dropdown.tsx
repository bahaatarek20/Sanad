'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  ShieldCheck,
  BookOpen,
  Bell,
  Award,
  Inbox,
  ChevronLeft,
  X,
  Copy,
  Check,
  ExternalLink,
  Clock,
} from 'lucide-react'

interface StudentMessage {
  id: string
  recipient: string
  sender: string
  subject: string
  body: string
  type: 'otp' | 'security' | 'academic' | 'reminder' | 'system'
  read: boolean
  createdAt: string
  otpCode?: string
}

export default function InboxDropdown() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<StudentMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<StudentMessage | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // Ignore network errors in dropdown poll
    }
  }

  useEffect(() => {
    fetchMessages()

    const handleMessagesUpdated = () => {
      fetchMessages()
    }

    window.addEventListener('sanad_messages_updated', handleMessagesUpdated)
    const interval = setInterval(fetchMessages, 25000)
    return () => {
      window.removeEventListener('sanad_messages_updated', handleMessagesUpdated)
      clearInterval(interval)
    }
  }, [])

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const markAllRead = async () => {
    try {
      setUnreadCount(0)
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
      }
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' }),
      })
    } catch {}
  }

  const markMessageAsRead = async (id: string) => {
    try {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanad_messages_updated'))
      }
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', messageId: id }),
      })
    } catch {}
  }

  const handleMessageClick = (msg: StudentMessage) => {
    if (!msg.read) {
      markMessageAsRead(msg.id)
    }
    setSelectedMessage(msg)
    setIsOpen(false)
  }

  const handleNavigateToInbox = (path = '/inbox') => {
    setIsOpen(false)
    setSelectedMessage(null)
    router.push(path)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'otp':
      case 'security':
        return <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case 'academic':
        return <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case 'reminder':
        return <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <BookOpen className="h-4 w-4 text-stone-600 dark:text-stone-300" />
    }
  }

  const formatMessageTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      if (diffMinutes < 1) return 'الآن'
      if (diffMinutes < 60) return `منذ ${diffMinutes} د`
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return `منذ ${diffHours} س`
      return new Date(isoString).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر صندوق الرسائل في الشريط العلوي */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchMessages()
        }}
        title="بريد سَنَد والرسائل الواردة"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/90 bg-white/90 text-stone-600 hover:text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50"
      >
        <Mail className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-0.5 text-[9px] font-black text-stone-950 shadow-sm animate-pulse">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة للرسائل الواردة (Gmail Style Dropdown) */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-stone-200 bg-white shadow-2xl z-50 overflow-hidden dark:border-stone-700 dark:bg-stone-900 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* ترويسة الصندوق */}
          <div className="flex items-center justify-between border-b border-stone-100 bg-[#fbf9f4] px-4 py-3 dark:border-stone-800 dark:bg-stone-850">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-900 text-amber-300">
                <Inbox className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-stone-900 dark:text-white">صندوق رسائل سَنَد</h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {unreadCount > 0 ? `لديك ${unreadCount} رسائل غير مقروءة` : 'جميع الرسائل مقروءة'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline dark:text-emerald-400 cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* قائمة الرسائل السريعة */}
          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
            {messages.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
                <Mail className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-600 mb-2" />
                <p className="font-bold">لا توجد رسائل حالياً</p>
                <p className="text-[11px] text-stone-400 mt-1">ستصلك هنا رسائل التحقق وتنبيهات المجالس العلمية</p>
              </div>
            ) : (
              messages.slice(0, 5).map((msg) => (
                <button
                  type="button"
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`w-full text-right flex items-start gap-3 p-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer ${
                    !msg.read ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
                    {getIconForType(msg.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${!msg.read ? 'font-black text-stone-900 dark:text-white' : 'font-bold text-stone-700 dark:text-stone-300'}`}>
                        {msg.sender}
                      </span>
                      <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${!msg.read ? 'font-bold text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-400'}`}>
                      {msg.subject}
                    </p>
                    {msg.otpCode && (
                      <span className="inline-block mt-1 font-mono font-black text-[11px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                        رمز التحقق: {msg.otpCode}
                      </span>
                    )}
                  </div>
                  {!msg.read && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* التذييل: زر الانتقال لبريد سَنَد الكامل */}
          <div className="border-t border-stone-100 bg-[#fbf9f4] p-2.5 text-center dark:border-stone-800 dark:bg-stone-850">
            <button
              type="button"
              onClick={() => handleNavigateToInbox('/inbox')}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-black text-emerald-900 hover:text-emerald-700 dark:text-emerald-400 transition cursor-pointer py-1"
            >
              <span>فتح صندوق بريد سَنَد الكامل</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* نافذة معاينة وقراءة الرسالة الفورية (Message Viewer Modal) */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900 animate-in zoom-in-95 duration-150 text-right">
            {/* زر الإغلاق العلوي */}
            <button
              type="button"
              onClick={() => setSelectedMessage(null)}
              className="absolute left-4 top-4 rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* ترويسة الرسالة */}
            <div className="flex items-start gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {getIconForType(selectedMessage.type)}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                    {selectedMessage.sender}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{formatMessageTime(selectedMessage.createdAt)}</span>
                  </div>
                </div>
                <h3 className="mt-1 text-base font-black text-stone-900 dark:text-white leading-snug">
                  {selectedMessage.subject}
                </h3>
              </div>
            </div>

            {/* رمز التحقق السريع إن وجد */}
            {selectedMessage.otpCode && (
              <div className="my-4 rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                    رمز التحقق السري (OTP):
                  </span>
                  <span className="text-2xl font-mono font-black text-stone-900 dark:text-white tracking-widest mt-1 block">
                    {selectedMessage.otpCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedMessage.otpCode!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition cursor-pointer shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>نسخ الرمز</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* نص الرسالة الكامل */}
            <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl bg-stone-50/60 p-4 text-sm text-stone-700 dark:bg-stone-800/40 dark:text-stone-300 leading-relaxed whitespace-pre-wrap font-sans border border-stone-100 dark:border-stone-800">
              {selectedMessage.body}
            </div>

            {/* الأزرار السفلية */}
            <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => handleNavigateToInbox(`/inbox?id=${selectedMessage.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <span>الانتقال إلى صندوق البريد الكامل</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition cursor-pointer shadow-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
