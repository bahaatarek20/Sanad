'use client'

import { useState, useEffect } from 'react'
import { Sparkles, X, BookOpen, Flame, Bell, Megaphone } from 'lucide-react'

interface ScholarlyQuote {
  type: 'milestone' | 'warning' | 'broadcast'
  speaker: string
  quote: string
  encouragement: string
}

const SCHOLARLY_QUOTES: ScholarlyQuote[] = [
  {
    type: 'milestone',
    speaker: 'الإمام مالك بن أنس',
    quote: '«إن هذا العلم دين، فانظروا عمن تأخذون دينكم، ولا يُؤخذ العلم إلا عمن عُرف بطلبه وضبطه»',
    encouragement: 'ثبتك الله، أنت اليوم تسير في طريق التأصيل الصحيح.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام الشافعي',
    quote: '«أخي لن تنال العلم إلا بستة: سأنبيك عن تفصيلها ببيان: ذكاء وحرص واجتهاد وبلغة، وصحبة أستاذ وطول زمان»',
    encouragement: 'طول الزمان والتكرار هو سر رسوخ العلم في الصدر.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام أحمد بن حنبل',
    quote: '«مع المحبرة إلى المقبرة، وإذا طلب العبد العلم لله خشع لله ولانت عريكته للمؤمنين»',
    encouragement: 'اجعل نيتك اليوم رفع الجهل عن نفسك والعمل بما تعلمت.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام أبو حنيفة النعمان',
    quote: '«من طلب العلم للدين ولإحياء الشريعة فذاك المفلح، والعلم يحيي القلوب كما يحيي المطر الأرض الموات»',
    encouragement: 'مجلس علم واحد خير من حمر النعم.',
  },
  {
    type: 'milestone',
    speaker: 'أمير المؤمنين في الحديث الإمام البخاري',
    quote: '«لا يكون المحدّث والفقيه كاملاً حتى يأخذ عمن هو فوقه، وعمن هو مثله، وعمن هو دونه»',
    encouragement: 'التواضع للعلم زكاة الفهم، فتح الله عليك فتوح العارفين.',
  },
  {
    type: 'warning',
    speaker: 'شيخ الإسلام ابن تيمية',
    quote: '«العلم ما قام عليه الدليل، والنافع منه ما جاء به الرسول ﷺ، وما فاتك من العلم اليوم ملأ الفراغ غيره»',
    encouragement: 'لا تفرّط في وردك اليومي، مجلس خمس دقائق يصنع الفارق!',
  },
  {
    type: 'milestone',
    speaker: 'شمس الدين ابن القيم',
    quote: '«لو نطق العلم لقال: يا ابن آدم، إنما طلبتك لتصل بي إلى الله، لا لترتفع بي على خلقه»',
    encouragement: 'طوبى لمن كانت مدارسته عبادة وخبيئة عمل صالح.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام الحافظ النووي',
    quote: '«ينبغي للمتعلم أن ينقاد لمعلمه ويصبر على الجفاء في طلب العلم، فإن ذل التعلم يورث عز العمل»',
    encouragement: 'الصبر مفتاح الإتقان، وبالمثابرة تزول وعورة المتون.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام شمس الدين الذهبي',
    quote: '«العلم ليس بكثرة الرواية وسرد الكتب، ولكنه نور يقذفه الله في القلب، وشرطه الاتباع والفرار من الهوى»',
    encouragement: 'استحضر النور في قلبك ولا تتعجل النتائج.',
  },
  {
    type: 'milestone',
    speaker: 'الحافظ ابن رجب الحنبلي',
    quote: '«العلم النافع هو ما باشر القلوب فأوجب لها السكينة والخشية والإخبات والتواضع لله عز وجل»',
    encouragement: 'إذا خشع القلب لان حفظ المتن وسهل فهمه.',
  },
  {
    type: 'milestone',
    speaker: 'الحافظ الخطيب البغدادي',
    quote: '«حق لطالب العلم والحديث أن يتميز عن العامة بمجانبة اللهو واللغط والتصاون والوقار وملازمة السمت»',
    encouragement: 'أنت في ثغر عظيم، حفظ الله وقتك وجهدك.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام ابن الجوزي',
    quote: '«من أراد ألا ينقطع عمله بعد موته، فليضبط المتون ولينشر العلم، فإن من مات ومصنفه باقٍ فكأنه لم يمت»',
    encouragement: 'كل كلمة تدوّنها في كشكولك صدقة جارية في ميزانك.',
  },
  {
    type: 'warning',
    speaker: 'الإمام سفيان الثوري',
    quote: '«ما عالجت شيئاً أشد عليّ من نيتي، لأنها تتقلب عليّ، فجدد نيتك مع كل مسألة وكل متن»',
    encouragement: 'جدد نيتك الآن: «اللهم إني أتعلم لمرضاتك ورفع الجهل عن أمتي».',
  },
  {
    type: 'milestone',
    speaker: 'الإمام عبد الله بن المبارك',
    quote: '«طلبنا العلم للدنيا، فلم يدعنا العلم حتى طلبناه لله، وأول العلم النية ثم الاستماع ثم الحفظ ثم العمل ثم النشر»',
    encouragement: 'خطوات التأصيل واضحة، وأنت في مرحلة الاستماع والضبط.',
  },
  {
    type: 'warning',
    speaker: 'الإمام الفضيل بن عياض',
    quote: '«لا يزال العالم عالماً ما طلب العلم وتواضع لمسائله، فإذا ظن أنه قد استغنى وعلم فقد جهل»',
    encouragement: 'كلما زاد علمك زاد افتقارك لفضل الله ورحمته.',
  },
  {
    type: 'milestone',
    speaker: 'الحسن البصري',
    quote: '«طلب العلم في الصغر كالنقش في الحجر، ومن طلب العلم ابتغاء مرضاة الله نال ما عند الله ورزقه الفهم»',
    encouragement: 'نقش اليوم في صدرك لا تمحوه صروف الدهر بإذن الله.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام ابن شهاب الزهري',
    quote: '«إنما يُدرك العلم بالصبر وتتابع الليالي، ومن رام أخذه جملة واحدة ذهب عنه جملة واحدة»',
    encouragement: 'قليل دائم خير من كثير منقطع.. خطوة صغيرة اليوم تكفيك.',
  },
  {
    type: 'warning',
    speaker: 'يحيى بن أبي كثير',
    quote: '«لا يُستطاع العلم براحة الجسد، فاصبر على مجاهدة النفس في طلب الدليل والبرهان»',
    encouragement: 'لذة الفهم بعد التعب تنسيك كل مشقة وعناء.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام أبو إسحاق الشاطبي',
    quote: '«العلم وسيلة ومفتاح إلى العمل، فكل علم لا يفيد عملاً فليس في الشرع ما يدل على فضيلته»',
    encouragement: 'تعلم مسألة، واعمل بها، ثم علّمها لمن حولك.',
  },
  {
    type: 'milestone',
    speaker: 'العلامة عبد الرحمن السعدي',
    quote: '«العلم أصل كل خير، والجهل أصل كل شر، وما تقرب متقرب إلى الله بأفضل من الفقه في دينه ومعرفة أصوله»',
    encouragement: 'الفقه في الدين نعمة ساقها الله إليك فاشكرها بالمداومة.',
  },
  {
    type: 'milestone',
    speaker: 'العلامة محمد بن صالح العثيمين',
    quote: '«العلم يحتاج إلى تكرار وتأصيل؛ فمن ضبط متناً وحفظ أصوله انفتحت له أبواب العلوم كلها بيسر»',
    encouragement: 'ضبطك لألفاظ المتن يغنيك عن عشرات المجلدات غير المرتبة.',
  },
  {
    type: 'milestone',
    speaker: 'العلامة عبد العزيز بن باز',
    quote: '«العلم النافع يورث الخشية لله، ومراقبته في السر والعلن، وحسن الخلق مع عباد الله»',
    encouragement: 'العلم سراج يضيء دربك ويصفي سريرتك.',
  },
  {
    type: 'warning',
    speaker: 'الإمام الأوزاعي',
    quote: '«عليك بآثار من سلف وإن رفضك الناس، وإياك وآراء الرجال وإن زخرفوها لك بالقول»',
    encouragement: 'التأصيل على متون السلف المعتمدة حبل النجاة الصافي.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام ابن عبد البر الأندلسي',
    quote: '«طلب العلم درجات ومنازل ورتب لا ينبغي تعديها، ومن تعداها جملة فقد سلك غير طريق السلف»',
    encouragement: 'أنت الآن تتدرج درجة درجة بثبات وسداد.',
  },
  {
    type: 'milestone',
    speaker: 'الإمام أبو بكر الآجري',
    quote: '«أحب لطالب العلم أن يتصفح المتون متأملاً متفهماً، فالفهم قيد العلم وضابط مسائله»',
    encouragement: 'تأمل عبارات المتن، فكل لفظ وُضع بحساب وميزان دقيق.',
  },
  {
    type: 'milestone',
    speaker: 'التابعي مطرف بن عبد الله بن الشخير',
    quote: '«فضل العلم أحب إليّ من فضل العبادة، وخير دينكم الورع والعمل بالحق»',
    encouragement: 'ساعتك في مدارسة المتن عبادة يرفع الله بها درجتك.',
  },
  {
    type: 'warning',
    speaker: 'الإمام وكيع بن الجراح',
    quote: '«استعينوا على حفظ المتون وتثبيتها بترك المعاصي؛ فإن العلم نور من الله، ونور الله لا يهدى لعاص»',
    encouragement: 'طهّر قلبك بالاستغفار، يفيض عليك الله بالفهم والحفظ.',
  },
  {
    type: 'milestone',
    speaker: 'صاحبك في الطلب',
    quote: '«طريق الألف ميل يبدأ بآية وحديث ومسألة.. ثبتك الله، ولا تنقطع عن وردك المبارك اليوم!»',
    encouragement: 'اضغط على متنك المفضل، وابدأ مجلساً جديداً الآن.',
  },
]

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // النغمة الأولى: نغمة هادئة رخيمة (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.04)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.6)

    // النغمة الثانية: نغمة رنانة متوافقة (A5 - 880Hz) تعطي رنين إشعار راقٍ
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.12)
    gain2.gain.setValueAtTime(0, now + 0.12)
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.16)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.9)
  } catch {
    // المتصفحات قد تقيّد تشغيل الصوت حتى يتفاعل المستخدم مع الصفحة
  }
}

export default function ScholarlyNotification() {
  const [currentNotification, setCurrentNotification] = useState<ScholarlyQuote | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let isCancelled = false
    let autoHideTimer: NodeJS.Timeout | null = null

    // 1. فحص الإعلان الإداري الحي من الخادم مباشرة (يظهر فقط إذا كان جديداً وغير معروض من قبل)
    const checkLiveBroadcast = async () => {
      try {
        const res = await fetch('/api/broadcast', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!isCancelled && data?.notice?.active && data.notice.message) {
            const broadcastId = data.notice.timestamp || data.notice.message
            const lastSeen = localStorage.getItem('sanad_last_broadcast_seen')
            if (lastSeen !== broadcastId) {
              setCurrentNotification({
                type: 'broadcast',
                speaker: data.notice.sender || 'إدارة منصة سَنَد',
                quote: data.notice.message,
                encouragement: data.notice.subtext || 'إعلان وتنبيه عام لجميع طلاب المنصة.',
              })
              setIsVisible(true)
              playNotificationChime()
              localStorage.setItem('sanad_last_broadcast_seen', broadcastId)
              return
            }
          }
        }
      } catch {
        // Fallback to local storage if offline
        try {
          const localRaw = localStorage.getItem('sanad_admin_broadcast')
          if (localRaw) {
            const b = JSON.parse(localRaw)
            if (b && b.active && b.message && !isCancelled) {
              const broadcastId = b.timestamp || b.message
              const lastSeen = localStorage.getItem('sanad_last_broadcast_seen')
              if (lastSeen !== broadcastId) {
                setCurrentNotification({
                  type: 'broadcast',
                  speaker: b.sender || 'إدارة منصة سَنَد',
                  quote: b.message,
                  encouragement: b.subtext || 'إعلان وتنبيه عام لجميع طلاب المنصة.',
                })
                setIsVisible(true)
                playNotificationChime()
                localStorage.setItem('sanad_last_broadcast_seen', broadcastId)
                return
              }
            }
          }
        } catch {}
      }

      // 2. إشعارات شحذة الهمة: فاصل زمني هادئ ومريح جداً (15 دقيقة على الأقل)
      try {
        const lastQuoteTime = parseInt(localStorage.getItem('sanad_last_quote_time') || '0', 10)
        const now = Date.now()
        const COOLDOWN_MS = 15 * 60 * 1000 // 15 دقيقة كاملة بين كل إشعار وآخر

        if (now - lastQuoteTime < COOLDOWN_MS) {
          return // لا تزعج الطالب، الوقت لم يحن بعد
        }

        // إظهار حكمة تشجيعية بهدوء بعد 60 ثانية من القراءة الرصينة
        const timer = setTimeout(() => {
          if (!isCancelled) {
            const randomIndex = Math.floor(Math.random() * SCHOLARLY_QUOTES.length)
            const selected = SCHOLARLY_QUOTES[randomIndex]
            if (selected) {
              setCurrentNotification(selected)
              setIsVisible(true)
              localStorage.setItem('sanad_last_quote_time', Date.now().toString())

              // اختفاء تلقائي هادئ بعد 8 ثوانٍ دون إجبار الطالب على إغلاقه يدوياً
              autoHideTimer = setTimeout(() => {
                if (!isCancelled) {
                  setIsVisible(false)
                }
              }, 8000)
            }
          }
        }, 60000)

        return () => clearTimeout(timer)
      } catch {}
    }

    checkLiveBroadcast()

    return () => {
      isCancelled = true
      if (autoHideTimer) clearTimeout(autoHideTimer)
    }
  }, [])

  if (!isVisible || !currentNotification) return null

  return (
    <aside
      aria-label="إشعار همة طالب العلم وإعلانات المنصة"
      className="fixed bottom-6 left-6 z-40 max-w-sm overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 dark:border-stone-700 dark:bg-stone-900/95"
    >
      <div className={`absolute top-0 right-0 left-0 h-1 ${
        currentNotification.type === 'broadcast'
          ? 'bg-linear-to-r from-amber-600 via-emerald-600 to-amber-700'
          : 'bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950'
      }`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {currentNotification.type === 'broadcast' ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 animate-pulse">
              <Megaphone className="h-4 w-4" />
            </div>
          ) : currentNotification.type === 'milestone' ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
              <Flame className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
              <BookOpen className="h-4 w-4" />
            </div>
          )}

          <span className="text-[11px] font-black text-stone-900 dark:text-white">
            {currentNotification.type === 'broadcast' ? 'إعلان إداري عاجل:' : 'شحذة همّة:'} {currentNotification.speaker}
          </span>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          title="إغلاق التنبيه"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 space-y-1.5 text-xs">
        <p className="font-semibold leading-relaxed text-stone-800 dark:text-stone-200">
          {currentNotification.quote}
        </p>
        <p className="text-[11px] font-medium text-emerald-900 dark:text-emerald-400">
          {currentNotification.encouragement}
        </p>
      </div>
    </aside>
  )
}

