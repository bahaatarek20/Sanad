import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface SanadMessage {
  id: string
  recipient: string // البريد الإلكتروني أو رقم الهاتف المنظف
  senderName: string
  senderEmail?: string
  senderAvatar?: string
  senderTitle?: string // مثال: «إدارة منصة سَنَد»، «أمن الحسابات»، «قسم الإجازات والسند»
  subject: string
  snippet: string
  body: string
  timestamp: string
  isRead: boolean
  isStarred?: boolean
  category: 'inbox' | 'security' | 'academic' | 'reminders'
  verificationCode?: string
  actionUrl?: string
  actionLabel?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const MESSAGES_FILE = path.join(DATA_DIR, 'sanad_messages_registry.json')

function ensureMessagesFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), 'utf8')
    }
  } catch (err) {
    console.error('Error ensuring messages file:', err)
  }
}

function readAllMessages(): SanadMessage[] {
  try {
    ensureMessagesFile()
    if (!fs.existsSync(MESSAGES_FILE)) return []
    const content = fs.readFileSync(MESSAGES_FILE, 'utf8')
    if (!content || !content.trim()) return []
    return JSON.parse(content) as SanadMessage[]
  } catch {
    return []
  }
}

function writeAllMessages(messages: SanadMessage[]) {
  try {
    ensureMessagesFile()
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8')
  } catch (err) {
    console.error('Error writing messages:', err)
  }
}

function normalizeRecipient(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.includes('@')) return trimmed
  // تنظيف أرقام الهواتف للأرقام فقط مع الحفاظ على علامة +
  return trimmed.replace(/[^\d+]/g, '')
}

/**
 * جلب جميع رسائل الطالب مع إضافة رسائل الترحيب التلقائية إن كان حسابه جديداً
 */
export function getStudentMessages(recipientRaw: string): SanadMessage[] {
  const recipient = normalizeRecipient(recipientRaw)
  if (!recipient) return []

  const all = readAllMessages()
  let userMessages = all.filter((m) => normalizeRecipient(m.recipient) === recipient)

  // إذا لم يكن لديه رسائل بعد، نودع له باقة الرسائل التأسيسية الترحيبية الشبيهة بـ Gmail
  if (userMessages.length === 0) {
    const welcomeMessages: SanadMessage[] = [
      {
        id: `msg_welcome_${Date.now()}_1`,
        recipient,
        senderName: 'إدارة منصة سَنَد',
        senderEmail: 'admin@sanad.edu',
        senderTitle: 'المجلس العلمي والإشراف العام',
        subject: '✨ مرحباً بك في منصة سَنَد للتأصيل المنهجي لطلب العلم',
        snippet: 'حيّاك الله وبياك في رحاب العلم الشرعي المؤصل، إليك أهم معالم الانطلاق في المنصة...',
        body: `بسم الله الرحمن الرحيم، والصلاة والسلام على رسول الله وعلى آله وصحبه أجمعين.

أخي طالب العلم الكريم، حيّاك الله في منصة «سَنَد».

لقد بُنيت هذه المنصة لتكون عوناً لك على سلوك جادة السلف الصالح في تلقي العلم الشرعي، من خلال:
1. التدرج التأصيلي عبر المراحل الأربع (التمهيدية، التأسيسية، المتوسطة، والمتقدمة).
2. تقييد الفوائد والشوارد مباشرة في «كشكول الطالب» المربوط بحسابك.
3. المدارسة الحية، واختبارات الضبط والإجازات العلمية.

نسأل الله تعالى أن يرزقك علماً نافعاً، وعملاً صالحاً، وإخلاصاً في القول والعمل.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        isRead: false,
        isStarred: true,
        category: 'academic',
        actionUrl: '/courses',
        actionLabel: 'ابدأ تصفح فهرس المتون الآن ←',
      },
      {
        id: `msg_tips_${Date.now()}_2`,
        recipient,
        senderName: 'الشيخ الشارح (توجيهات المدارسة)',
        senderEmail: 'guidance@sanad.edu',
        senderTitle: 'وصايا الحفظ والضبط',
        subject: '📖 وصية ابن جماعة والنووي في تدوين كشكول الفوائد والشوارد',
        snippet: 'قال الإمام الشافعي: العلم صيدٌ والكتابة قيده.. قيّد قيدك بالحبال الواثقة...',
        body: `اعلم يا طالب العلم أن العلم لا يُنال براحة الجسد، وأن من أعظم أسباب ثبات العلم:
• كتابة الفوائد وقت سماع المجلس في كشكولك فوراً.
• تكرار المجلس أكثر من مرة، وقد وفرنا لك في المشغل زر (Loop) ومضخم الصوت الرقمي لتوضيح مخارج حروف الشارح.
• الاستعانة بمساعد المدارسة الذكي (صاحبك في الطلب) عند استشكال أي لفظ أو مصطلح غريب.

وفقك الله وسدد خطاك.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        isRead: false,
        category: 'academic',
        actionUrl: '/dashboard',
        actionLabel: 'فتح كشكول الفوائد والشوارد ←',
      },
    ]

    const updated = [...welcomeMessages, ...all]
    writeAllMessages(updated)
    userMessages = welcomeMessages
  }

  return userMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * إرسال رسالة جديدة إلى صندوق بريد الطالب (كالـ Gmail)
 */
export function sendSanadMessage(
  data: Omit<SanadMessage, 'id' | 'timestamp' | 'isRead'>
): SanadMessage {
  const all = readAllMessages()
  const recipient = normalizeRecipient(data.recipient)

  const newMessage: SanadMessage = {
    ...data,
    id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    recipient,
    timestamp: new Date().toISOString(),
    isRead: false,
  }

  // إضافة في مقدمة القائمة
  all.unshift(newMessage)
  writeAllMessages(all)

  console.log(`📨 [Sanad Mail] New message deposited in inbox for [${recipient}]: "${newMessage.subject}"`)
  return newMessage
}

/**
 * إيداع رسالة رمز التحقق السري (OTP) فوراً في صندوق الوارد
 */
export function depositOtpMessage(
  recipient: string,
  code: string,
  channel: 'email' | 'phone'
): SanadMessage {
  const channelLabel = channel === 'phone' ? 'رقم هاتفك' : 'بريدك الإلكتروني'
  return sendSanadMessage({
    recipient,
    senderName: 'أمن حسابات سَنَد (Google & Phone Auth)',
    senderEmail: 'security@sanad.edu',
    senderTitle: 'فريق الحماية والتحقق الموثق',
    subject: `🔐 رمز التحقق السري لمنصة سَنَد: [ ${code} ]`,
    snippet: `رمز التحقق الخاص بك هو ${code}، صالح لمدة 10 دقائق لتسجيل الدخول الآمن...`,
    body: `حيّاك الله طالب العلم،

لقد تلقينا طلباً للتحقق من ملكية ${channelLabel} لتسجيل الدخول إلى حسابك في منصة سَنَد.

رمز التحقق السري الخاص بك هو:
══════════════════════════
        ${code}
══════════════════════════

• الرمز صالح للاستخدام لمدة 10 دقائق فقط.
• لا تشارك هذا الرمز مع أي شخص حفاظاً على أمان كشكولك وسجل تقدمك العلمي.

إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.`,
    verificationCode: code,
    category: 'security',
    isStarred: true,
  })
}

/**
 * تحديد رسالة كمقروءة
 * تدعم كلا الترتيبين: (id, recipient) أو (recipient, id) أو (id) فقط
 */
export function markMessageAsRead(idOrRecipient: string, recipientOrId?: string): boolean {
  if (!idOrRecipient) return false

  let targetId = idOrRecipient
  let targetRecipient = recipientOrId ? normalizeRecipient(recipientOrId) : ''

  // في حال تم تمرير البريد كمعامل أول والمعرف كمعامل ثانٍ
  if (idOrRecipient.includes('@') && recipientOrId && !recipientOrId.includes('@')) {
    targetRecipient = normalizeRecipient(idOrRecipient)
    targetId = recipientOrId
  } else if (!idOrRecipient.includes('@') && recipientOrId && recipientOrId.includes('@')) {
    targetRecipient = normalizeRecipient(recipientOrId)
    targetId = idOrRecipient
  }

  const all = readAllMessages()
  let changed = false

  for (const m of all) {
    if (m.id === targetId) {
      if (!targetRecipient || normalizeRecipient(m.recipient) === targetRecipient) {
        if (!m.isRead) {
          m.isRead = true
          changed = true
        }
        break
      }
    }
  }

  if (changed) {
    writeAllMessages(all)
  }
  return changed
}

/**
 * تحديد كافة رسائل الطالب كمقروءة
 */
export function markAllMessagesAsRead(recipientRaw: string): boolean {
  const recipient = normalizeRecipient(recipientRaw)
  const all = readAllMessages()
  let changed = false

  for (const m of all) {
    if ((!recipient || normalizeRecipient(m.recipient) === recipient) && !m.isRead) {
      m.isRead = true
      changed = true
    }
  }

  if (changed) {
    writeAllMessages(all)
  }
  return changed
}

/**
 * حذف رسالة من الصندوق
 */
export function deleteSanadMessage(idOrRecipient: string, recipientOrId?: string): boolean {
  if (!idOrRecipient) return false

  let targetId = idOrRecipient
  let targetRecipient = recipientOrId ? normalizeRecipient(recipientOrId) : ''

  if (idOrRecipient.includes('@') && recipientOrId && !recipientOrId.includes('@')) {
    targetRecipient = normalizeRecipient(idOrRecipient)
    targetId = recipientOrId
  } else if (!idOrRecipient.includes('@') && recipientOrId && recipientOrId.includes('@')) {
    targetRecipient = normalizeRecipient(recipientOrId)
    targetId = idOrRecipient
  }

  const all = readAllMessages()
  const filtered = all.filter((m) => {
    if (m.id === targetId) {
      if (!targetRecipient || normalizeRecipient(m.recipient) === targetRecipient) {
        return false
      }
    }
    return true
  })

  if (filtered.length !== all.length) {
    writeAllMessages(filtered)
    return true
  }
  return false
}

/**
 * عداد الرسائل غير المقروءة للطالب
 */
export function getUnreadMessagesCount(recipientRaw: string): number {
  const recipient = normalizeRecipient(recipientRaw)
  if (!recipient) return 0
  const all = readAllMessages()
  return all.filter((m) => normalizeRecipient(m.recipient) === recipient && !m.isRead).length
}

export const getUnreadCount = getUnreadMessagesCount
export const deleteMessage = deleteSanadMessage

/**
 * إيداع رسالة ترحيبية فورية في صندوق رسائل الطالب الجديد
 */
export function depositWelcomeMessage(recipient: string, studentName?: string): SanadMessage {
  const name = studentName?.trim() || 'طالب العلم'
  return sendSanadMessage({
    recipient,
    senderName: 'إدارة منصة سَنَد',
    senderEmail: 'admin@sanad.edu',
    senderTitle: 'المجلس العلمي والإشراف العام',
    subject: `✨ مرحباً بك يا ${name} في منصة سَنَد للتأصيل المنهجي`,
    snippet: `حيّاك الله وبياك في رحاب العلم الشرعي المؤصل، لقد تم تفعيل حسابك بنجاح...`,
    body: `بسم الله الرحمن الرحيم، والصلاة والسلام على رسول الله وعلى آله وصحبه أجمعين.

أخي الكريم ${name}، حيّاك الله وبياك في منصة «سَنَد».

لقد تم تسجيل دخولك بنجاح وتفعيل حسابك التأصيلي. نسأل الله أن يبارك في وقتك وجهدك ويجعلك من ورثة الأنبياء.

معالم الانطلاق السريع في المنصة:
1. تصفح فهرس المتون والمراحل التأصيلية من المبادئ إلى المقاصد.
2. تدوين الفوائد والشوارد في كشكولك الخاص أثناء سماع كل مجلس.
3. التفاعل مع إخوانك في مجلس المذاكرة العام.

نسعد بصحبتك رفيقاً في طريق الطلب.`,
    category: 'academic',
    isStarred: true,
    actionUrl: '/courses',
    actionLabel: 'ابدأ تصفح المتون الآن ←',
  })
}

/**
 * إيداع تنبيه أمني بتسجيل الدخول أو تحديث الحساب
 */
export function depositSecurityAlert(
  recipient: string,
  studentName?: string,
  customMessage?: string
): SanadMessage {
  const name = studentName?.trim() || 'طالب العلم'
  const time = new Date().toLocaleString('ar-EG')
  const messageText = customMessage || 'تم تسجيل دخول جديد ومصادقة بياناتك بنجاح.'

  return sendSanadMessage({
    recipient,
    senderName: 'أمن حسابات سَنَد',
    senderEmail: 'security@sanad.edu',
    senderTitle: 'فريق الحماية والتحقق',
    subject: `🛡️ إشعار أمني لحسابك: ${name}`,
    snippet: `${messageText} • التوقيت: ${time}`,
    body: `السلام عليكم ورحمة الله وبركاته يا ${name}،

نود إشعارك بالإجراء الأمني التالي على حسابك في منصة سَنَد:

${messageText}

• التوقيت: ${time}
• الحماية: اتصال مشفر ومصادق بالكامل.

إذا كنت أنت من قام بهذه الخطوة، فلا يلزمك أي إجراء آخر.
نتمنى لك رحلة موفقة في مدارسة متون العلم الشريف.`,
    category: 'security',
    actionUrl: '/dashboard',
    actionLabel: 'مراجعة بيانات الحساب ←',
  })
}
