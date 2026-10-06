'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  X,
  Send,
  Sparkles,
  BookOpen,
  KeyRound,
  Check,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Copy,
} from 'lucide-react'
import { ALL_COURSES, MatnCourse } from '@/lib/curriculum-data'

interface Message {
  role: 'user' | 'ai'
  text: string
  timestamp?: string
}

// بدون حد أقصى لعدد الحروف — طالب العلم حر في كتابة ما يشاء

/** Renders AI message text with basic markdown-like formatting */
function AiMessageContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="whitespace-pre-wrap text-xs leading-relaxed">
      {lines.map((line, i) => {
        // Bold lines wrapped in **...**
        const boldMatch = line.match(/^\*\*(.+)\*\*$/)
        if (boldMatch) {
          return (
            <p key={i} className="font-bold">
              {boldMatch[1]}
            </p>
          )
        }

        // Bullet items starting with "- " or "• "
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s+/, '')
          // Handle inline **bold** within bullet content
          const parts = content.split(/(\*\*[^*]+\*\*)/)
          return (
            <div key={i} className="flex items-start gap-1.5 mt-0.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                {parts.map((part, j) => {
                  const inlineBold = part.match(/^\*\*(.+)\*\*$/)
                  return inlineBold ? (
                    <strong key={j}>{inlineBold[1]}</strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                })}
              </span>
            </div>
          )
        }

        // Regular line — handle inline **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i} className={line === '' ? 'mt-1' : ''}>
            {parts.map((part, j) => {
              const inlineBold = part.match(/^\*\*(.+)\*\*$/)
              return inlineBold ? (
                <strong key={j}>{inlineBold[1]}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}

/** Copy-to-clipboard button that shows a checkmark for 2s */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="نسخ الرد"
      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-stone-400 hover:text-emerald-800 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

/** Bouncing dots typing indicator */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2.5 max-w-[80%]">
      <div className="flex gap-1 items-center py-2 px-3">
        <span
          className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
        <span className="text-[11px] text-stone-500 mr-2">صاحبك يكتب...</span>
      </div>
    </div>
  )
}

function getDynamicSuggestedQuestions(courseTitle: string): string[] {
  const t = courseTitle.toLowerCase()
  if (t.includes('آجرومية') || t.includes('نحو') || t.includes('إعراب') || t.includes('قطر الندى') || t.includes('ألفية')) {
    return [
      'ما هي علامات الإعراب الأصلية والفرعية؟',
      'كيف أميز بين الجملة الاسمية والجملة الفعلية؟',
      'اشرح لي إعراب الفاعل ونائب الفاعل باختصار',
      'ما الفرق بين المعرب والمبني من الأسماء والأفعال؟',
    ]
  }
  if (t.includes('فقه') || t.includes('متفقه') || t.includes('طهارة') || t.includes('زاد المستقنع') || t.includes('أخصر')) {
    return [
      'ما هي أركان الوضوء وشروطه وسننه؟',
      'ما الفرق بين الركن والواجب والشرط في الفقه؟',
      'ما هي نواقض الوضوء ومبطلات الصلاة؟',
      'كيف أضبط أبواب المعاملات وفقه البيوع؟',
    ]
  }
  if (t.includes('حديث') || t.includes('نووية') || t.includes('أربعين') || t.includes('بيقونية') || t.includes('نخبة')) {
    return [
      'ما هو الضابط الفقهي لحديث «إنما الأعمال بالنيات»؟',
      'ما الفرق بين الحديث الصحيح والحسن والضعيف؟',
      'اشرح لي مراتب الدين الثلاث في حديث جبريل',
      'ما هو ضابط العمل بالحديث في فضائل الأعمال؟',
    ]
  }
  if (t.includes('عقيدة') || t.includes('توحيد') || t.includes('واسطية') || t.includes('طحاوية') || t.includes('أصول ثلاثة')) {
    return [
      'ما الفرق بين توحيد الربوبية وتوحيد الألوهية؟',
      'ما هي أركان الإيمان الستة وما ضابط الإيمان بالقدر؟',
      'ما هي الأصول الثلاثة التي يجب على العبد معرفتها؟',
      'ما هو المنهج المعتمد في إثبات أسماء الله وصفاته؟',
    ]
  }
  if (t.includes('أصول') || t.includes('ورقات') || t.includes('قواعد')) {
    return [
      'ما الفرق بين الحكم التكليفي والحكم الوضعي؟',
      'ما هي الأدلة المتفق عليها بين الأئمة؟',
      'ما الفرق بين العام والخاص والمطلق والمقيد؟',
      'اشرح لي قاعدة «الأمور بمقاصدها» وتطبيقاتها',
    ]
  }
  if (t.includes('حلية') || t.includes('آداب')) {
    return [
      'ما هي أهم ركائز حفظ هيبة العلم وأدب الطلب؟',
      'كيف يتدرج طالب العلم بين المتون والمطولات؟',
      'ما هو أدب الطالب مع شيخه وأقرانه في الحلقات؟',
      'كيف يصون طالب العلم وقته ونباهته من الشواغل؟',
    ]
  }
  return [
    'هل انت ذكي وفاهم كلامي ومستوعب أسئلتي؟',
    'ما هي منهجية حفظ وضبط المتون خطوة بخطوة؟',
    'ما الفرق بين الفرض والواجب عند أهل العلم؟',
    'كيف أبدأ التأصيل المنهجي من البداية بدون تشتت؟',
  ]
}

export default function GlobalAiTutor() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'أهلاً بك في منصة سَنَد. أنا «رفيق المدارسة»، جاهز لمعاونتك في تفكيك ألفاظ المتون، وضبط المسائل الفقهية والعقدية والنحوية، وترتيب خطتك الدراسية. تفضل بطرح سؤالك أو استشكالك.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('عام في العلوم الشرعية')
  const [coursesList, setCoursesList] = useState<MatnCourse[]>(ALL_COURSES)
  const [userApiKey, setUserApiKey] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keySaved, setKeySaved] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // تحميل المفتاح والمحادثة المحفوظة إن وُجدت
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('sanad_gemini_key')
      if (storedKey) {
        setUserApiKey(storedKey)
        setKeyInput(storedKey)
      }
      const storedChat = localStorage.getItem('sanad_ai_chat_history')
      if (storedChat) {
        const parsed = JSON.parse(storedChat)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
      fetch('/api/courses')
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.courses) && data.courses.length > 0) {
            setCoursesList(data.courses)
          }
        })
        .catch(() => {})
    } catch {}
  }, [])

  // حفظ المحادثة تلقائياً
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem('sanad_ai_chat_history', JSON.stringify(messages.slice(-20)))
      }
    } catch {}
  }, [messages])

  // التمرير التلقائي لأسفل
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSaveKey = () => {
    const clean = keyInput.trim()
    setUserApiKey(clean)
    try {
      if (clean) {
        localStorage.setItem('sanad_gemini_key', clean)
      } else {
        localStorage.removeItem('sanad_gemini_key')
      }
      setKeySaved(true)
      setTimeout(() => {
        setKeySaved(false)
        setShowKeyModal(false)
      }, 1200)
    } catch {}
  }

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || input).trim()
    if (!q || isLoading) return

    if (!textToSend) setInput('')

    const userMsg: Message = { role: 'user', text: q }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          courseTitle: selectedCourse,
          categoryTitle: 'العلوم الشرعية والتأصيل المنهجي',
          history: messages.slice(-8),
          userApiKey: userApiKey || undefined,
        }),
      })

      const data = await res.json()
      const aiReply = data?.reply || 'حدث انقطاع مؤقت في الاتصال، يرجى إعادة إرسال السؤال وسأجيبك فوراً.'
      setMessages((prev) => [...prev, { role: 'ai', text: aiReply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'تعذر الاتصال بالخادم مؤقتاً، يرجى المحاولة مجدداً وسأكون معك مباشرة.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetChat = () => {
    const initial: Message[] = [
      {
        role: 'ai',
        text: 'حيّاك الله من جديد يا بطل! كشكول المحادثة متصفر وجاهز، اسألني في أي مسألة أو متن وأنا معاك في ضهرك.',
      },
    ]
    setMessages(initial)
    try {
      localStorage.removeItem('sanad_ai_chat_history')
    } catch {}
  }

  // الاستماع لزر المساعد الذكي من شريط التنقل العلوي
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('toggle-sanad-ai', handleToggle)
    window.addEventListener('open-sanad-ai', handleOpen)
    return () => {
      window.removeEventListener('toggle-sanad-ai', handleToggle)
      window.removeEventListener('open-sanad-ai', handleOpen)
    }
  }, [])

  return (
    <>
      {/* 2. نافذة المحادثة المنبثقة الذكية (Slide Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-start sm:p-6 bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="relative flex flex-col w-full sm:max-w-md h-[88vh] sm:h-[650px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden dark:bg-stone-900 dark:border-stone-800">
            
            {/* ترويسة النافذة */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-linear-to-r from-emerald-900 via-teal-950 to-emerald-950 px-4 py-3.5 text-white dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-amber-300 border border-white/15">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">صاحبك في الطلب</h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30">
                      مساعد ذكي (AI)
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200">رفيقك ومدارسك في متون العلوم الشرعية</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* زر ضبط مفتاح الذكاء الاصطناعي */}
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  title="ضبط مفتاح الذكاء الاصطناعي (AI Key)"
                  className="rounded-xl p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                </button>

                {/* زر تفريغ المحادثة */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="بدء محادثة جديدة"
                  className="rounded-xl p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* زر الإغلاق */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="إغلاق المحادثة"
                  className="rounded-xl p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* محدد المتن أو موضوع المدارسة */}
            <div className="flex items-center gap-2 border-b border-stone-200/60 bg-[#fbf9f4] px-4 py-2 text-xs dark:bg-stone-900 dark:border-stone-800">
              <BookOpen className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 shrink-0">
                موضوع المدارسة:
              </span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full truncate rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-800 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              >
                <option value="عام في العلوم الشرعية">عام في طلب العلم والتأصيل</option>
                {coursesList.map((c) => (
                  <option key={c.slug} value={c.title}>
                    «{c.title}» - {c.category}
                  </option>
                ))}
              </select>
            </div>

            {/* نافذة ضبط المفتاح إن تم فتحها */}
            {showKeyModal && (
              <div className="absolute inset-x-0 top-14 z-20 mx-3 rounded-2xl border border-amber-300/80 bg-amber-50/95 p-4 shadow-xl backdrop-blur-md dark:border-amber-700 dark:bg-stone-900/95">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 dark:text-amber-200">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    <span>مفتاح الذكاء الاصطناعي (AI Key)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                  المنصة مربوطة تلقائياً بمفتاح الخادم، ويمكنك أيضاً تزويد مفتاحك الخاص (AI Key) لضمان أقصى سرعة واستجابة ديناميكية بدون أي حدود:
                </p>

                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer"
                  >
                    {keySaved ? <Check className="h-3.5 w-3.5 text-amber-300" /> : 'حفظ'}
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline dark:text-emerald-400"
                  >
                    <span>احصل على مفتاح مجاني في 10 ثوانٍ (AI Studio)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* جسم المحادثة والرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1 text-[10px] text-stone-400 font-bold">
                    {m.role === 'user' ? 'أنت' : 'صاحبك في الطلب 🤖'}
                  </div>

                  {m.role === 'ai' ? (
                    <div className="group relative max-w-[88%]">
                      <div className="rounded-2xl p-3.5 bg-[#f8f6f0] text-stone-800 border border-stone-200/90 rounded-br-xs shadow-2xs dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700">
                        <AiMessageContent text={m.text} />
                      </div>
                      {/* زر النسخ يظهر عند التمرير */}
                      <div className="absolute -bottom-5 left-0 flex items-center gap-1">
                        <CopyButton text={m.text} />
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed bg-emerald-900 text-white rounded-bl-xs shadow-xs dark:bg-emerald-800">
                      {m.text}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>

            {/* اقتراحات الأسئلة السريعة الديناميكية حسب المقرر المختار */}
            <div className="px-3 py-2 border-t border-stone-200/60 bg-[#f7f5ed] flex flex-wrap gap-1.5 dark:border-stone-800 dark:bg-[#181614]">
              {getDynamicSuggestedQuestions(selectedCourse).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="rounded-lg border border-stone-200/80 bg-white px-2 py-1 text-[10px] font-bold text-stone-600 hover:border-emerald-800 hover:text-emerald-900 transition cursor-pointer dark:border-stone-700/80 dark:bg-stone-800/90 dark:text-stone-300 dark:hover:border-emerald-500"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* حقل الإدخال والإرسال — بدون أي حد أقصى لعدد الحروف */}
            <div className="p-3 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="اسأل صاحبك في الطلب عن أي مسألة أو متن... (بدون حد أقصى)"
                  rows={2}
                  className="flex-1 rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 text-xs text-stone-900 resize-none focus:outline-none focus:border-emerald-800 focus:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:bg-stone-800"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-r from-emerald-800 to-emerald-950 text-white hover:from-emerald-700 hover:to-emerald-900 disabled:opacity-40 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
