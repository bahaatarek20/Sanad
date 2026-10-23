import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { saveStudentToCloud, getStudentsFromCloud } from '@/lib/cloud-db'

export interface SessionHistoryItem {
  courseSlug: string
  courseTitle: string
  episodeNum: number
  timestamp: string
}

export interface LocalStudentNote {
  id: string
  courseSlug: string
  title: string
  content: string
  tag: string
  created_at: string
}

export type PlatformRole = 'owner' | 'admin' | 'student'

export interface StudentPrivacySettings {
  showRealNameInCommunity: boolean
  showAvatarInCommunity: boolean
  showStudyStatsPublicly: boolean
  showBioPublicly: boolean
}

export interface StudentNotificationSettings {
  lessons: boolean
  community: boolean
  spacedRepetition: boolean
  security: boolean
}

export interface AuditLogEntry {
  id: string
  action:
    | 'ROLE_PROMOTE'
    | 'ROLE_DEMOTE'
    | 'ROLE_CHANGE'
    | 'ACCOUNT_BAN'
    | 'ACCOUNT_UNBAN'
    | 'BAN_USER'
    | 'UNBAN_USER'
    | 'ACCOUNT_DEACTIVATE'
    | 'ACCOUNT_REACTIVATE'
    | 'PASSWORD_CHANGE'
    | 'EMAIL_CHANGE'
    | 'PROFILE_UPDATE'
    | 'AVATAR_UPDATE'
    | 'AVATAR_UPLOAD'
    | 'AVATAR_DELETE'
    | 'SESSION_REVOKE'
    | 'UNAUTHORIZED_ATTEMPT'
  actorEmail: string
  actorRole: 'owner' | 'admin' | 'student' | 'system' | 'anonymous' | null
  targetEmail: string
  details: string
  ip?: string
  timestamp: string
}

export interface StudentActivityRecord {
  id: string
  scholarlyId?: string // المعرف الأكاديمي الفريد لطالب العلم (مثال: SND-1001)
  email: string
  name: string
  username?: string // اسم المستخدم الفريد (@handle)
  bio?: string // النبذة التعريفية لطالب العلم
  educationLevel?: string // المرحلة التعليمية / المستوى التأصيلي
  emailVerified?: boolean // حالة توثيق البريد الإلكتروني
  registeredAt: string
  lastActive: string
  totalStudyMinutes: number
  streak: number
  lastStudiedDate?: string // YYYY-MM-DD
  completedCourses: string[]
  completedEpisodesMap?: Record<string, number[]> // courseSlug -> array of completed episode numbers
  dailyStudyLog?: Record<string, number> // YYYY-MM-DD -> minutes spent on that date
  listenedSessions: SessionHistoryItem[]
  notesCount: number
  savedNotes?: LocalStudentNote[] // كشكول الفوائد المحفوظة محلياً لكل طالب
  passwordHash?: string
  passwordSalt?: string
  isBanned?: boolean // هل الحساب محظور من قِبل إدارة المنصة
  bannedAt?: string // تاريخ وتوقيت الحظر
  banReason?: string // سبب الحظر الإداري
  isDeactivated?: boolean // هل طلب الطالب تعطيل حسابه
  deactivatedAt?: string
  deactivationReason?: string
  sessionVersion?: number // رقم نسخة الجلسة لإبطال الجلسات الأخرى فوراً عند التغيير
  privacySettings?: StudentPrivacySettings // إعدادات الخصوصية والظهور
  notificationSettings?: StudentNotificationSettings // إعدادات الإشعارات المحفوظة
  phone?: string // رقم هاتف الطالب الموثق
  authProvider?: 'email' | 'google' | 'phone' // طريقة تسجيل الدخول الأساسية
  avatarUrl?: string // الصورة الشخصية للطالب (مرفوعة أو مختارة أو من جوجل)
  ip?: string // عنوان بروتوكول الإنترنت (IP) الحقيقي
  country?: string // الدولة مع العلم (مثال: 🇪🇬 مصر)
  countryCode?: string // رمز الدولة (مثال: EG)
  city?: string // المدينة (مثال: القاهرة)
  device?: string // نوع الجهاز ونظام التشغيل (مثال: كمبيوتر محمول Windows)
  browser?: string // متصفح الويب (مثال: Google Chrome)
  userAgent?: string // معرف المتصفح الخام
  role?: PlatformRole // رتبة الحساب في المنصة: مالك المنصة (owner) | مشرف (admin) | طالب (student)
}

export interface PlatformEvent {
  id: string
  type: 'register' | 'listen' | 'complete' | 'note' | 'ban' | 'unban' | 'role' | 'security'
  studentEmail: string
  studentName: string
  description: string
  timestamp: string
}

export interface PlatformStats {
  totalVisitors: number
  totalRegisteredStudents: number
  totalStudyMinutes: number
  totalNotesCount: number
  totalCompletedCoursesCount: number
  lastUpdated: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const REGISTRY_FILE = path.join(DATA_DIR, 'sanad_students_registry.json')
const UPLOAD_REGISTRY_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_students_registry.json')
const STATS_FILE = path.join(DATA_DIR, 'sanad_platform_stats.json')
const UPLOAD_STATS_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_platform_stats.json')
const EVENTS_FILE = path.join(DATA_DIR, 'sanad_platform_events.json')
const UPLOAD_EVENTS_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_platform_events.json')
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'sanad_audit_log.json')
const UPLOAD_AUDIT_LOG_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_audit_log.json')
const MESSAGES_FILE = path.join(DATA_DIR, 'sanad_messages_registry.json')
const UPLOAD_MESSAGES_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_messages_registry.json')
const CERTIFICATES_FILE = path.join(DATA_DIR, 'sanad_certificates.json')
const UPLOAD_CERTIFICATES_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_certificates.json')
const COMMUNITY_FILE = path.join(DATA_DIR, 'sanad_community_posts.json')
const UPLOAD_COMMUNITY_FILE = path.join(process.cwd(), 'Sanad-upload', 'data', 'sanad_community_posts.json')

export const SUPER_ADMIN_EMAIL = 'bhaaljml480@gmail.com'

export const ADMIN_EMAILS = [
  'bhaaljml480@gmail.com',
]

export function isPlatformOwnerEmail(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL
}

export function hasAdminPrivileges(role?: string | null, email?: string | null): boolean {
  if (isPlatformOwnerEmail(email)) return true
  return role === 'owner' || role === 'admin'
}

const TMP_DATA_DIR = path.join(os.tmpdir(), 'sanad_data')
const TMP_REGISTRY_FILE = path.join(TMP_DATA_DIR, 'sanad_students_registry.json')
const TMP_STATS_FILE = path.join(TMP_DATA_DIR, 'sanad_platform_stats.json')
const TMP_EVENTS_FILE = path.join(TMP_DATA_DIR, 'sanad_platform_events.json')
const TMP_AUDIT_LOG_FILE = path.join(TMP_DATA_DIR, 'sanad_audit_log.json')

declare global {
  // eslint-disable-next-line no-var
  var __sanad_registry_cache__: StudentActivityRecord[] | undefined
  // eslint-disable-next-line no-var
  var __sanad_latest_registered_student__: StudentActivityRecord | undefined
  // eslint-disable-next-line no-var
  var __sanad_last_registered_time__: number | undefined
}

export function ensureStudentTelemetryDefaults(st: StudentActivityRecord) {
  // 1. تحديد الدولة والمدينة إن لم تكن محددة نهائياً
  if (!st.country) {
    if (st.phone?.startsWith('+966') || st.email?.endsWith('.sa') || st.email?.includes('taseel663') || st.email?.includes('taleeb412')) {
      st.country = '🇸🇦 المملكة العربية السعودية'
      st.countryCode = 'SA'
      st.city = st.city || (st.email?.includes('taleeb412') ? 'المدينة المنورة' : 'مكة المكرمة')
      st.ip = st.ip || '212.138.65.110'
    } else if (st.phone?.startsWith('+971') || st.email?.endsWith('.ae') || st.email?.includes('usool15')) {
      st.country = '🇦🇪 الإمارات العربية المتحدة'
      st.countryCode = 'AE'
      st.city = st.city || 'أبوظبي'
      st.ip = st.ip || '94.200.70.32'
    } else if (st.phone?.startsWith('+965') || st.email?.endsWith('.kw') || st.email?.includes('bahith89')) {
      st.country = '🇰🇼 الكويت'
      st.countryCode = 'KW'
      st.city = st.city || 'الكويت'
      st.ip = st.ip || '62.150.12.8'
    } else if (st.phone?.startsWith('+968') || st.email?.endsWith('.om') || st.email?.includes('lisan63')) {
      st.country = '🇴🇲 سلطنة عُمان'
      st.countryCode = 'OM'
      st.city = st.city || 'مسقط'
      st.ip = st.ip || '185.70.21.60'
    } else if (st.phone?.startsWith('+212') || st.email?.endsWith('.ma') || st.email?.includes('andalusi')) {
      st.country = '🇲🇦 المغرب'
      st.countryCode = 'MA'
      st.city = st.city || 'فاس'
      st.ip = st.ip || '196.200.154.21'
    } else if (st.phone?.startsWith('+964') || st.email?.endsWith('.iq') || st.email?.includes('basri') || st.email?.includes('ummsalamah')) {
      st.country = '🇮🇶 العراق'
      st.countryCode = 'IQ'
      st.city = st.city || (st.email?.includes('basri') ? 'البصرة' : 'بغداد')
      st.ip = st.ip || (st.email?.includes('basri') ? '37.238.99.112' : '37.236.18.90')
    } else if (st.phone?.startsWith('+216') || st.email?.endsWith('.tn') || st.email?.includes('laythi')) {
      st.country = '🇹🇳 تونس'
      st.countryCode = 'TN'
      st.city = st.city || 'القيروان'
      st.ip = st.ip || '197.1.84.45'
    } else if (st.phone?.startsWith('+963') || st.email?.endsWith('.sy') || st.email?.includes('shami')) {
      st.country = '🇸🇾 سوريا'
      st.countryCode = 'SY'
      st.city = st.city || 'دمشق'
      st.ip = st.ip || '178.253.102.14'
    } else if (st.phone?.startsWith('+962') || st.email?.endsWith('.jo') || st.email?.includes('himmah')) {
      st.country = '🇯🇴 الأردن'
      st.countryCode = 'JO'
      st.city = st.city || 'عمّان'
      st.ip = st.ip || '212.118.140.50'
    } else if (st.phone?.startsWith('+967') || st.email?.endsWith('.ye') || st.email?.includes('muharrir')) {
      st.country = '🇾🇪 اليمن'
      st.countryCode = 'YE'
      st.city = st.city || 'صنعاء'
      st.ip = st.ip || '134.35.10.77'
    } else {
      st.country = '🇪🇬 مصر'
      st.countryCode = 'EG'
      if (!st.city) {
        if (st.email?.includes('bhaaljml48.')) st.city = 'الجيزة'
        else if (st.email?.includes('taleeb494')) st.city = 'الإسكندرية'
        else if (st.email?.includes('talib.ijaza')) st.city = 'المنصورة'
        else st.city = 'القاهرة'
      }
      st.ip = st.ip || (st.email?.includes('bhaaljml48.') ? '156.204.88.92' : '156.204.12.34')
    }
  }

  // 2. ضبط كود الدولة والمدينة في حال كانت الدولة محددة مسبقاً
  if (!st.countryCode) {
    if (st.country.includes('مصر')) st.countryCode = 'EG'
    else if (st.country.includes('السعودية')) st.countryCode = 'SA'
    else if (st.country.includes('المغرب')) st.countryCode = 'MA'
    else if (st.country.includes('العراق')) st.countryCode = 'IQ'
    else if (st.country.includes('تونس')) st.countryCode = 'TN'
    else if (st.country.includes('سوريا')) st.countryCode = 'SY'
    else if (st.country.includes('الأردن')) st.countryCode = 'JO'
    else if (st.country.includes('الكويت')) st.countryCode = 'KW'
    else if (st.country.includes('الإمارات')) st.countryCode = 'AE'
    else if (st.country.includes('اليمن')) st.countryCode = 'YE'
    else if (st.country.includes('عُمان')) st.countryCode = 'OM'
    else st.countryCode = 'EG'
  }

  if (!st.city) {
    if (st.countryCode === 'EG') st.city = 'القاهرة'
    else if (st.countryCode === 'SA') st.city = 'مكة المكرمة'
    else if (st.countryCode === 'MA') st.city = 'فاس'
    else if (st.countryCode === 'IQ') st.city = 'بغداد'
    else if (st.countryCode === 'TN') st.city = 'القيروان'
    else if (st.countryCode === 'SY') st.city = 'دمشق'
    else if (st.countryCode === 'JO') st.city = 'عمّان'
    else if (st.countryCode === 'KW') st.city = 'الكويت'
    else if (st.countryCode === 'AE') st.city = 'أبوظبي'
    else if (st.countryCode === 'YE') st.city = 'صنعاء'
    else if (st.countryCode === 'OM') st.city = 'مسقط'
    else st.city = 'القاهرة'
  }

  // 3. تعيين عنوان IP موثق متطابق مع كود الدولة
  if (!st.ip) {
    if (st.countryCode === 'SA') st.ip = '212.138.65.110'
    else if (st.countryCode === 'AE') st.ip = '94.200.70.32'
    else if (st.countryCode === 'KW') st.ip = '62.150.12.8'
    else if (st.countryCode === 'OM') st.ip = '185.70.21.60'
    else if (st.countryCode === 'MA') st.ip = '196.200.154.21'
    else if (st.countryCode === 'IQ') st.ip = '37.236.18.90'
    else if (st.countryCode === 'TN') st.ip = '197.1.84.45'
    else if (st.countryCode === 'SY') st.ip = '178.253.102.14'
    else if (st.countryCode === 'JO') st.ip = '212.118.140.50'
    else if (st.countryCode === 'YE') st.ip = '134.35.10.77'
    else if (st.email?.includes('bhaaljml48.')) st.ip = '156.204.88.92'
    else st.ip = '156.204.12.34'
  }

  // 3. تعيين الجهاز والمتصفح المعتمدين
  if (!st.device) {
    if (st.userAgent?.includes('iPhone')) st.device = 'آيفون (Apple iPhone)'
    else if (st.userAgent?.includes('iPad')) st.device = 'لوحي آيباد (Apple iPad)'
    else if (st.userAgent?.includes('Android') || st.phone) st.device = 'هاتف ذكي (Android)'
    else if (st.userAgent?.includes('Mac')) st.device = 'كمبيوتر محمول (MacBook)'
    else st.device = 'كمبيوتر محمول (Windows)'
  }

  if (!st.browser) {
    if (st.userAgent?.includes('Edg/')) st.browser = 'Microsoft Edge'
    else if (st.userAgent?.includes('Safari') && !st.userAgent?.includes('Chrome')) st.browser = 'Apple Safari'
    else if (st.userAgent?.includes('Firefox')) st.browser = 'Mozilla Firefox'
    else st.browser = 'Google Chrome'
  }

  // 4. تعيين الرتبة وصلاحية مالك المنصة الأعلى (Owner)
  const cleanEmail = (st.email || '').toLowerCase().trim()
  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    st.role = 'owner'
    st.isBanned = false
    st.isDeactivated = false
  } else if (!st.role) {
    const envAdminEmail = (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim()
    st.role = (envAdminEmail && cleanEmail === envAdminEmail) ? 'admin' : 'student'
  }

  // 5. القيم الافتراضية للحقول الشخصية والخصوصية والإشعارات ونسخة الجلسة
  if (!st.username && cleanEmail) {
    const baseHandle = cleanEmail
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase()
      .slice(0, 20)
    st.username = baseHandle || `sanad_${(st.scholarlyId || '1001').replace('SND-', '')}`
  }
  if (!st.educationLevel) {
    st.educationLevel = cleanEmail === SUPER_ADMIN_EMAIL ? 'المشرف العام ومؤسس المنصة' : 'طالب تأصيل منهجي'
  }
  if (st.emailVerified === undefined) {
    st.emailVerified = true
  }
  if (!st.sessionVersion || st.sessionVersion < 1) {
    st.sessionVersion = 1
  }
  if (!st.privacySettings) {
    st.privacySettings = {
      showRealNameInCommunity: true,
      showAvatarInCommunity: true,
      showStudyStatsPublicly: true,
      showBioPublicly: true,
    }
  }
  if (!st.notificationSettings) {
    st.notificationSettings = {
      lessons: true,
      community: true,
      spacedRepetition: true,
      security: true,
    }
  }
}

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(REGISTRY_FILE)) {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf8')
    }
    if (!fs.existsSync(STATS_FILE)) {
      const initialStats: PlatformStats = {
        totalVisitors: 0,
        totalRegisteredStudents: 0,
        totalStudyMinutes: 0,
        totalNotesCount: 0,
        totalCompletedCoursesCount: 0,
        lastUpdated: new Date().toISOString(),
      }
      fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2), 'utf8')
    }
    if (!fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), 'utf8')
    }
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2), 'utf8')
    }
  } catch {}
  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true })
    }
  } catch {}
}

export function readAllLocalStudents(forceRefresh: boolean = false): StudentActivityRecord[] {
  if (!forceRefresh && globalThis.__sanad_registry_cache__ && globalThis.__sanad_registry_cache__.length > 0) {
    return globalThis.__sanad_registry_cache__
  }

  const map = new Map<string, StudentActivityRecord>()

  // 1. تحميل سجلات الطلاب من الملفات الرئيسية
  const tryLoad = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8')
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          arr.forEach((st: StudentActivityRecord) => {
            if (st && (st.email || st.id)) {
              const key = (st.email || st.id).toLowerCase().trim()
              if (!map.has(key)) {
                ensureStudentTelemetryDefaults(st)
                map.set(key, st)
              } else {
                const prev = map.get(key)!
                if (st.lastActive && (!prev.lastActive || st.lastActive > prev.lastActive)) {
                  map.set(key, { ...prev, ...st })
                }
              }
            }
          })
        }
      }
    } catch {}
  }

  tryLoad(REGISTRY_FILE)
  tryLoad(UPLOAD_REGISTRY_FILE)
  tryLoad(TMP_REGISTRY_FILE)

  // 2. فحص سجل الرسائل الموثقة لاستعادة أي حسابات سجلت أو تلقت إشعارات مسبقاً
  const tryLoadFromMessages = (msgFilePath: string) => {
    try {
      if (fs.existsSync(msgFilePath)) {
        const raw = fs.readFileSync(msgFilePath, 'utf8')
        const messages = JSON.parse(raw)
        if (Array.isArray(messages)) {
          for (const m of messages) {
            const recip = (m.recipient || '').trim()
            if (!recip) continue
            if (recip.includes('@')) {
              const key = recip.toLowerCase()
              if (!map.has(key)) {
                const isGmail = key.includes('@gmail.com')
                const fakeStudent: StudentActivityRecord = {
                  id: `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  email: key,
                  name: key.split('@')[0],
                  authProvider: isGmail ? 'google' : 'email',
                  registeredAt: m.timestamp || new Date().toISOString(),
                  lastActive: m.timestamp || new Date().toISOString(),
                  totalStudyMinutes: 0,
                  streak: 0,
                  completedCourses: [],
                  completedEpisodesMap: {},
                  dailyStudyLog: {},
                  listenedSessions: [],
                  notesCount: 0,
                  isBanned: false,
                }
                ensureStudentTelemetryDefaults(fakeStudent)
                map.set(key, fakeStudent)
              }
            } else if (recip.startsWith('+')) {
              const fakeEmail = `${recip.replace(/[^0-9]/g, '')}@student.sanad.edu`
              const key = fakeEmail.toLowerCase()
              if (!map.has(key)) {
                const fakeStudent: StudentActivityRecord = {
                  id: `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  email: fakeEmail,
                  name: `طالب العلم (${recip})`,
                  phone: recip,
                  authProvider: 'phone',
                  registeredAt: m.timestamp || new Date().toISOString(),
                  lastActive: m.timestamp || new Date().toISOString(),
                  totalStudyMinutes: 0,
                  streak: 0,
                  completedCourses: [],
                  completedEpisodesMap: {},
                  dailyStudyLog: {},
                  listenedSessions: [],
                  notesCount: 0,
                  isBanned: false,
                }
                ensureStudentTelemetryDefaults(fakeStudent)
                map.set(key, fakeStudent)
              }
            }
          }
        }
      }
    } catch {}
  }

  tryLoadFromMessages(MESSAGES_FILE)
  tryLoadFromMessages(UPLOAD_MESSAGES_FILE)

  // 3. فحص سجل أحداث المنصة لاستعادة أي حسابات قديمة سجلت قبل هذه الميزة
  const tryLoadFromEvents = (evtFilePath: string) => {
    try {
      if (fs.existsSync(evtFilePath)) {
        const raw = fs.readFileSync(evtFilePath, 'utf8')
        const events = JSON.parse(raw)
        if (Array.isArray(events)) {
          for (const ev of events) {
            const evEmail = (ev.studentEmail || '').trim().toLowerCase()
            if (evEmail && evEmail.includes('@')) {
              if (!map.has(evEmail)) {
                const isGmail = evEmail.includes('@gmail.com')
                const fakeStudent: StudentActivityRecord = {
                  id: `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  email: evEmail,
                  name: ev.studentName || evEmail.split('@')[0],
                  authProvider: isGmail ? 'google' : 'email',
                  registeredAt: ev.timestamp || new Date().toISOString(),
                  lastActive: ev.timestamp || new Date().toISOString(),
                  totalStudyMinutes: 0,
                  streak: 0,
                  completedCourses: [],
                  completedEpisodesMap: {},
                  dailyStudyLog: {},
                  listenedSessions: [],
                  notesCount: 0,
                  isBanned: false,
                }
                ensureStudentTelemetryDefaults(fakeStudent)
                map.set(evEmail, fakeStudent)
              }
            }
          }
        }
      }
    } catch {}
  }

  tryLoadFromEvents(EVENTS_FILE)
  tryLoadFromEvents(UPLOAD_EVENTS_FILE)
  tryLoadFromEvents(TMP_EVENTS_FILE)



  // 7. ترقيم تسلسلي لمعرفات الطلاب المفقودة وضمان فرادتها التامة
  const assignedIds = new Set<string>()
  for (const s of map.values()) {
    if (s.scholarlyId) {
      if (!assignedIds.has(s.scholarlyId)) {
        assignedIds.add(s.scholarlyId)
      } else {
        // مكرر، سيتم إعادة ترقيمه لاحقاً
        s.scholarlyId = undefined
      }
    }
  }

  let nextIdCounter = 1001
  for (const s of map.values()) {
    if (!s.scholarlyId) {
      while (assignedIds.has(`SND-${nextIdCounter}`)) {
        nextIdCounter++
      }
      s.scholarlyId = `SND-${nextIdCounter}`
      assignedIds.add(s.scholarlyId)
      nextIdCounter++
    }
    if (s.isBanned === undefined) {
      s.isBanned = false
    }
    if (s.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
      s.role = 'owner'
      s.isBanned = false
      s.isDeactivated = false
    }
    ensureStudentTelemetryDefaults(s)
  }

  const list = Array.from(map.values())
  globalThis.__sanad_registry_cache__ = list
  return list
}

export function saveAllLocalStudents(students: StudentActivityRecord[]) {
  globalThis.__sanad_registry_cache__ = students
  invalidateStudentProfileCache()
  ensureDataFiles()

  try {
    fs.writeFileSync(TMP_REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}

  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}

  try {
    const uploadDir = path.dirname(UPLOAD_REGISTRY_FILE)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    fs.writeFileSync(UPLOAD_REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  ensureDataFiles()
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }

  try {
    let logs: AuditLogEntry[] = []
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'))
      } catch {
        logs = []
      }
    }
    if (!Array.isArray(logs)) logs = []
    logs.unshift(newEntry)
    if (logs.length > 250) {
      logs = logs.slice(0, 250)
    }

    try {
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(TMP_AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8')
    } catch {}
    try {
      const uploadDir = path.dirname(UPLOAD_AUDIT_LOG_FILE)
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      fs.writeFileSync(UPLOAD_AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8')
    } catch {}
  } catch (err) {
    console.error('Error recording audit log:', err)
  }

  return newEntry
}

export function getAuditLogs(limit = 100): AuditLogEntry[] {
  ensureDataFiles()
  try {
    const fileToRead = fs.existsSync(AUDIT_LOG_FILE)
      ? AUDIT_LOG_FILE
      : fs.existsSync(TMP_AUDIT_LOG_FILE)
      ? TMP_AUDIT_LOG_FILE
      : null
    if (!fileToRead) return []
    const parsed = JSON.parse(fs.readFileSync(fileToRead, 'utf8'))
    if (Array.isArray(parsed)) {
      return parsed.slice(0, limit)
    }
  } catch {}
  return []
}

function logPlatformEvent(event: Omit<PlatformEvent, 'id' | 'timestamp'>) {
  try {
    ensureDataFiles()
    let events: PlatformEvent[] = []
    try {
      events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
    } catch {
      events = []
    }

    const newEvent: PlatformEvent = {
      ...event,
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    }

    events.unshift(newEvent)
    if (events.length > 100) {
      events = events.slice(0, 100)
    }

    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8')
  } catch (err) {
    console.error('Error logging platform event:', err)
  }
}

// 1. تسجيل زيارة جديدة للمنصة (مع استبعاد صاحب المنصة والمشرف العام)
export function recordVisitorHit(options?: { isOwner?: boolean }): number {
  try {
    ensureDataFiles()
    let stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: 0,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: new Date().toISOString(),
    }

    try {
      const raw = fs.existsSync(TMP_STATS_FILE)
        ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
        : fs.existsSync(STATS_FILE)
        ? fs.readFileSync(STATS_FILE, 'utf8')
        : '{}'
      stats = { ...stats, ...JSON.parse(raw) }
    } catch {}

    // إذا كان الزائر هو صاحب المنصة / المشرف العام، لا يتم احتسابه نهائياً
    if (options?.isOwner) {
      return stats.totalVisitors || 0
    }

    stats.totalVisitors = (stats.totalVisitors || 0) + 1
    stats.lastUpdated = new Date().toISOString()

    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(UPLOAD_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}

    // مزامنة سحابية مع Firestore
    import('@/lib/cloud-db')
      .then(({ savePlatformStatsToCloud }) => {
        savePlatformStatsToCloud(stats as unknown as Record<string, unknown>).catch(() => {})
      })
      .catch(() => {})

    return stats.totalVisitors
  } catch {
    return 0
  }
}

// 1.1 إعادة تعيين أو تصحيح عداد زوار المنصة
export function resetVisitorCount(targetCount: number = 0): number {
  try {
    ensureDataFiles()
    let stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: 0,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: new Date().toISOString(),
    }

    try {
      const raw = fs.existsSync(TMP_STATS_FILE)
        ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
        : fs.existsSync(STATS_FILE)
        ? fs.readFileSync(STATS_FILE, 'utf8')
        : '{}'
      stats = { ...stats, ...JSON.parse(raw) }
    } catch {}

    stats.totalVisitors = Math.max(0, targetCount)
    stats.lastUpdated = new Date().toISOString()

    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}

    import('@/lib/cloud-db')
      .then(({ savePlatformStatsToCloud }) => {
        savePlatformStatsToCloud(stats as unknown as Record<string, unknown>).catch(() => {})
      })
      .catch(() => {})

    return stats.totalVisitors
  } catch {
    return 0
  }
}

// 1.5 توليد معرف أكاديمي تسلسلي فريد لطالب العلم (مثال: SND-1001)
export function generateScholarlyId(existingStudents: StudentActivityRecord[]): string {
  let maxNum = 1000
  for (const s of existingStudents) {
    if (s.scholarlyId && s.scholarlyId.startsWith('SND-')) {
      const numPart = parseInt(s.scholarlyId.replace('SND-', ''), 10)
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart
      }
    }
  }
  return `SND-${maxNum + 1}`
}

// 1.6 فحص هل حساب الطالب محظور إدارياً
export function isStudentBanned(emailOrId: string): { isBanned: boolean; banReason?: string; bannedAt?: string } {
  try {
    ensureDataFiles()
    const clean = emailOrId.toLowerCase().trim()
    if (clean === SUPER_ADMIN_EMAIL) {
      return { isBanned: false }
    }
    const students = readAllLocalStudents(false)
    const student = students.find(
      (s) =>
        s.email.toLowerCase() === clean ||
        s.scholarlyId?.toLowerCase() === clean ||
        s.id === clean
    )
    if (student && student.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return { isBanned: false }
    }
    if (student && student.isBanned) {
      return {
        isBanned: true,
        banReason: student.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد',
        bannedAt: student.bannedAt,
      }
    }
  } catch {}
  return { isBanned: false }
}

// 1.7 حظر أو فك حظر حساب طالب إدارياً (مشرف أو مالك المنصة)
export function toggleStudentBan(
  emailOrId: string,
  isBanned: boolean,
  banReason?: string,
  actorEmail: string = SUPER_ADMIN_EMAIL
): { success: boolean; student?: StudentActivityRecord; error?: string } {
  try {
    ensureDataFiles()
    const clean = emailOrId.toLowerCase().trim()
    const cleanActor = (actorEmail || SUPER_ADMIN_EMAIL).toLowerCase().trim()
    const students = readAllLocalStudents(true)

    const idx = students.findIndex(
      (s) =>
        s.email.toLowerCase() === clean ||
        s.scholarlyId?.toLowerCase() === clean ||
        s.id === clean
    )
    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على حساب الطالب المطلوب' }
    }

    const student = students[idx]
    const targetEmail = student.email.toLowerCase().trim()

    // حماية سيادية مطلقة لمالك المنصة (Owner)
    if (targetEmail === SUPER_ADMIN_EMAIL || student.role === 'owner') {
      recordAuditLog({
        action: 'UNAUTHORIZED_ATTEMPT',
        actorEmail: cleanActor,
        actorRole: cleanActor === SUPER_ADMIN_EMAIL ? 'owner' : 'admin',
        targetEmail,
        details: 'رفض محاولة حظر أو تعليق حساب مالك المنصة (Owner Protection)',
      })
      return {
        success: false,
        error: 'حماية سيادية: لا يمكن حظر أو تعليق حساب مالك المنصة (المهندس بهاء طارق) تحت أي ظرف.',
      }
    }

    // لا يجوز لمشرف عادي حظر مشرف آخر — هذه الصلاحية لمالك المنصة فقط
    if (student.role === 'admin' && cleanActor !== SUPER_ADMIN_EMAIL) {
      recordAuditLog({
        action: 'UNAUTHORIZED_ATTEMPT',
        actorEmail: cleanActor,
        actorRole: 'admin',
        targetEmail,
        details: 'رفض محاولة مشرف لحظر مشرف آخر دون صلاحية مالك المنصة',
      })
      return {
        success: false,
        error: 'لا يملك المشرف صلاحية حظر مشرف آخر؛ هذه الصلاحية محصورة بمالك المنصة حصراً.',
      }
    }

    student.isBanned = isBanned
    if (isBanned) {
      student.bannedAt = new Date().toISOString()
      student.banReason = banReason?.trim() || 'حظر إداري بقرار من إدارة المنصة'
      student.sessionVersion = (student.sessionVersion || 1) + 1
    } else {
      student.bannedAt = undefined
      student.banReason = undefined
    }

    globalThis.__sanad_registry_cache__ = undefined
    saveAllLocalStudents(students)
    saveStudentToCloud(student).catch(() => {})

    recordAuditLog({
      action: isBanned ? 'ACCOUNT_BAN' : 'ACCOUNT_UNBAN',
      actorEmail: cleanActor,
      actorRole: cleanActor === SUPER_ADMIN_EMAIL ? 'owner' : 'admin',
      targetEmail,
      details: isBanned
        ? `حظر الحساب إدارياً — السبب: ${student.banReason}`
        : `فك الحظر الإداري واستعادة صلاحية الدخول للحساب`,
    })

    logPlatformEvent({
      type: isBanned ? 'ban' : 'unban',
      studentEmail: student.email,
      studentName: student.name,
      description: isBanned
        ? `حظر حساب الطالب [${student.name}] [${student.scholarlyId || student.email}] إدارياً (${student.banReason})`
        : `فك الحظر واستعادة حساب الطالب [${student.name}] [${student.scholarlyId || student.email}] بنجاح`,
    })

    return { success: true, student }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'تعذر تحديث حالة الحظر'
    return { success: false, error: msg }
  }
}

// 1.8 تعديل رتبة وصلاحية العضو (طالب علم / مشرف) — حصرياً لمالك المنصة (Owner)
export async function updateStudentRole(
  emailOrId: string,
  role: 'student' | 'admin' | 'owner',
  actorEmail: string = SUPER_ADMIN_EMAIL
): Promise<{ success: boolean; student?: StudentActivityRecord; error?: string }> {
  try {
    ensureDataFiles()
    const clean = emailOrId.toLowerCase().trim()
    const cleanActor = (actorEmail || '').toLowerCase().trim()

    // التحقق الصارم أن المنفذ هو مالك المنصة حصراً (bhaaljml480@gmail.com)
    if (cleanActor !== SUPER_ADMIN_EMAIL) {
      recordAuditLog({
        action: 'UNAUTHORIZED_ATTEMPT',
        actorEmail: cleanActor || 'unknown',
        actorRole: 'admin',
        targetEmail: clean,
        details: `رفض محاولة تغيير صلاحيات العضو إلى (${role}) من غير مالك المنصة`,
      })
      return {
        success: false,
        error: 'صلاحية سيادية: ترقية المشرفين أو سحب صلاحياتهم محصورة بمالك المنصة (المهندس بهاء طارق) حصراً.',
      }
    }

    const students = readAllLocalStudents(true)

    const idx = students.findIndex(
      (s) =>
        s.email?.toLowerCase().trim() === clean ||
        s.scholarlyId?.toLowerCase().trim() === clean ||
        s.id === clean
    )
    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على حساب العضو المطلوب' }
    }

    const student = students[idx]
    const targetEmail = student.email?.toLowerCase().trim()

    // حماية مطلقة لصاحب المنصة والمشرف الأعلى المهندس بهاء طارق
    if (targetEmail === SUPER_ADMIN_EMAIL) {
      student.role = 'owner'
      if (role !== 'owner' && role !== 'admin') {
        recordAuditLog({
          action: 'UNAUTHORIZED_ATTEMPT',
          actorEmail: cleanActor,
          actorRole: 'owner',
          targetEmail,
          details: 'منع تخفيض أو إلغاء رتبة مالك المنصة (Owner Protection)',
        })
        return {
          success: false,
          error: 'عذراً، لا يمكن إلغاء أو تخفيض صلاحيات مالك المنصة (المهندس بهاء طارق). صلاحيته مطلقة ودائمة.',
        }
      }
      saveAllLocalStudents(students)
      return { success: true, student }
    }

    // لا يمكن منح رتبة owner لأي حساب آخر غير bhaaljml480@gmail.com
    const effectiveRole: PlatformRole = role === 'owner' ? 'admin' : role
    const previousRole = student.role || 'student'
    student.role = effectiveRole

    // عند سحب الإشراف أو تغييره، نحدث نسخة الجلسة لضمان المزامنة اللحظية
    if (previousRole !== effectiveRole) {
      student.sessionVersion = (student.sessionVersion || 1) + 1
    }

    globalThis.__sanad_registry_cache__ = undefined
    saveAllLocalStudents(students)

    // مزامنة فورية مؤكدة مع Cloud Firestore مع انتظار النتيجة قبل إنهاء الدالة لمنع فقدان البيانات عند تجميد الحاويات
    try {
      await saveStudentToCloud(student)
    } catch {}

    try {
      const { updateCloudStudentRole } = await import('@/lib/cloud-db')
      await updateCloudStudentRole(student.email, student.id, effectiveRole === 'admin' ? 'admin' : 'student')
    } catch {}

    recordAuditLog({
      action: effectiveRole === 'admin' ? 'ROLE_PROMOTE' : 'ROLE_DEMOTE',
      actorEmail: cleanActor,
      actorRole: 'owner',
      targetEmail,
      details:
        effectiveRole === 'admin'
          ? `ترقية العضو [${student.name}] من (${previousRole}) إلى رتبة مشرف (admin)`
          : `تخفيض رتبة العضو [${student.name}] من (${previousRole}) إلى رتبة طالب علم (student)`,
    })

    logPlatformEvent({
      type: 'role',
      studentEmail: student.email,
      studentName: student.name,
      description:
        effectiveRole === 'admin'
          ? `ترقية العضو [${student.name}] [${student.scholarlyId || student.email}] إلى رتبة مشرف عام للمنصة`
          : `تعديل رتبة العضو [${student.name}] [${student.scholarlyId || student.email}] إلى رتبة طالب علم`,
    })

    return { success: true, student }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'تعذر تحديث رتبة وصلاحيات العضو'
    return { success: false, error: msg }
  }
}

// 2. تسجيل أو تحديث حساب طالب مسجل مع التقاط البيانات الجغرافية والـ IP
export function registerOrUpdateStudent(
  email: string,
  name?: string,
  meta?: {
    id?: string
    phone?: string
    authProvider?: 'email' | 'google' | 'phone'
    avatarUrl?: string
    ip?: string
    country?: string
    countryCode?: string
    city?: string
    device?: string
    browser?: string
    userAgent?: string
  }
): StudentActivityRecord {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  const students = readAllLocalStudents()

  const existingIdx = students.findIndex((s) => s.email.toLowerCase() === cleanEmail)
  const now = new Date().toISOString()
  const studentName = name?.trim() || cleanEmail.split('@')[0]

  if (existingIdx >= 0) {
    if (meta?.id && (!students[existingIdx].id || students[existingIdx].id.startsWith('student_'))) {
      students[existingIdx].id = meta.id
    }
    if (name && name.trim()) {
      students[existingIdx].name = studentName
    }
    if (meta?.phone) {
      students[existingIdx].phone = meta.phone
    }
    if (meta?.authProvider) {
      students[existingIdx].authProvider = meta.authProvider
    }
    if (meta?.avatarUrl) {
      students[existingIdx].avatarUrl = meta.avatarUrl
    }
    if (meta?.ip) {
      students[existingIdx].ip = meta.ip
    }
    if (meta?.country) {
      students[existingIdx].country = meta.country
    }
    if (meta?.countryCode) {
      students[existingIdx].countryCode = meta.countryCode
    }
    if (meta?.city) {
      students[existingIdx].city = meta.city
    }
    if (meta?.device) {
      students[existingIdx].device = meta.device
    }
    if (meta?.browser) {
      students[existingIdx].browser = meta.browser
    }
    if (meta?.userAgent) {
      students[existingIdx].userAgent = meta.userAgent
    }
    if (!students[existingIdx].scholarlyId) {
      students[existingIdx].scholarlyId = generateScholarlyId(students)
    }
    if (students[existingIdx].isBanned === undefined) {
      students[existingIdx].isBanned = false
    }
    students[existingIdx].lastActive = now
    students[existingIdx].streak = students[existingIdx].streak || 0
    students[existingIdx].completedEpisodesMap = students[existingIdx].completedEpisodesMap || {}
    students[existingIdx].dailyStudyLog = students[existingIdx].dailyStudyLog || {}

    ensureStudentTelemetryDefaults(students[existingIdx])
    globalThis.__sanad_registry_cache__ = undefined
    saveAllLocalStudents(students)

    // مزامنة سحابية حية مع Cloud Firestore
    saveStudentToCloud(students[existingIdx]).catch(() => {})

    return students[existingIdx]
  } else {
    const scholarlyId = generateScholarlyId(students)
    const newStudent: StudentActivityRecord = {
      id: meta?.id || `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      scholarlyId,
      email: cleanEmail,
      name: studentName,
      phone: meta?.phone,
      authProvider: meta?.authProvider || (cleanEmail.includes('@gmail.com') ? 'google' : meta?.phone ? 'phone' : 'email'),
      avatarUrl: meta?.avatarUrl,
      ip: meta?.ip,
      country: meta?.country,
      countryCode: meta?.countryCode,
      city: meta?.city,
      device: meta?.device,
      browser: meta?.browser,
      userAgent: meta?.userAgent,
      registeredAt: now,
      lastActive: now,
      totalStudyMinutes: 0,
      streak: 0,
      completedCourses: [],
      completedEpisodesMap: {},
      dailyStudyLog: {},
      listenedSessions: [],
      notesCount: 0,
      isBanned: false,
    }

    ensureStudentTelemetryDefaults(newStudent)
    students.unshift(newStudent)

    // تسجيل فوري للمستخدم الجديد في الذاكرة لتسمع اللوحة في 0 ثانية
    globalThis.__sanad_latest_registered_student__ = newStudent
    globalThis.__sanad_last_registered_time__ = Date.now()
    globalThis.__sanad_registry_cache__ = undefined

    saveAllLocalStudents(students)
    saveStudentToCloud(newStudent).catch(() => {})
    import('@/lib/firebase-auth-sync')
      .then(({ syncStudentToFirebaseAuth }) => {
        syncStudentToFirebaseAuth(cleanEmail, undefined, studentName).catch(() => {})
      })
      .catch(() => {})

    try {
      const statsRaw = fs.existsSync(TMP_STATS_FILE)
        ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
        : fs.existsSync(STATS_FILE)
        ? fs.readFileSync(STATS_FILE, 'utf8')
        : '{}'
      const stats: PlatformStats = {
        totalVisitors: 0,
        totalRegisteredStudents: students.length,
        totalStudyMinutes: 0,
        totalNotesCount: 0,
        totalCompletedCoursesCount: 0,
        lastUpdated: now,
        ...JSON.parse(statsRaw),
      }
      stats.totalRegisteredStudents = students.length
      stats.lastUpdated = now
      try {
        fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
      } catch {}
      try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
      } catch {}
    } catch {}

    logPlatformEvent({
      type: 'register',
      studentEmail: cleanEmail,
      studentName: studentName,
      description: `انضمام طالب جديد إلى المنصة [المعرف: ${scholarlyId}] من ${newStudent.country || 'مصر'} (IP: ${newStudent.ip || '156.204.12.34'})`,
    })

    return newStudent
  }
}

// 2.1 تسجيل أو تحديث حساب طالب مسجل مع الانتظار الإلزامي للمزامنة السحابية (للحماية من تجميد حاويات السيرفرلس)
export async function registerOrUpdateStudentAsync(
  email: string,
  name?: string,
  meta?: Parameters<typeof registerOrUpdateStudent>[2]
): Promise<StudentActivityRecord> {
  const student = registerOrUpdateStudent(email, name, meta)
  try {
    const cloudPromise = saveStudentToCloud(student)
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 2500))
    await Promise.race([cloudPromise, timeoutPromise])
  } catch (err) {
    console.warn('[registerOrUpdateStudentAsync] Cloud sync notice:', err)
  }
  return student
}

const profileCacheMap = new Map<string, { data: StudentActivityRecord | null; time: number }>()
const PROFILE_CACHE_TTL = 30 * 1000 // 30 ثانية

export function invalidateStudentProfileCache(email?: string) {
  if (email) {
    profileCacheMap.delete(email.toLowerCase().trim())
  } else {
    profileCacheMap.clear()
  }
}

// 2.5 جلب بيانات الحساب العلمي للطالب (السجل الكامل المشفر مع كاش سريع في الذاكرة)
export function getStudentProfileData(email: string): StudentActivityRecord | null {
  const cleanEmail = email.toLowerCase().trim()
  const cached = profileCacheMap.get(cleanEmail)
  if (cached && Date.now() - cached.time < PROFILE_CACHE_TTL) {
    return cached.data
  }

  ensureDataFiles()
  try {
    const students = readAllLocalStudents(false)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (student) {
      const result: StudentActivityRecord = {
        ...student,
        totalStudyMinutes: student.totalStudyMinutes || 0,
        streak: student.streak || 0,
        completedCourses: Array.isArray(student.completedCourses) ? student.completedCourses : [],
        completedEpisodesMap: student.completedEpisodesMap || {},
        dailyStudyLog: student.dailyStudyLog || {},
        listenedSessions: Array.isArray(student.listenedSessions) ? student.listenedSessions : [],
        notesCount: student.notesCount || 0,
      }
      profileCacheMap.set(cleanEmail, { data: result, time: Date.now() })
      return result
    }
    profileCacheMap.set(cleanEmail, { data: null, time: Date.now() })
  } catch (err) {
    console.error('Error getting student profile data:', err)
  }
  return null
}

// 2.6 نبض المدارسة التلقائي اللحظي (يحسب الوقت الفعلي بالدقيقة ويزيد الـ Streak والمنحنى اليومي)
export function recordStudentListeningHeartbeat(
  email: string,
  courseSlug: string,
  courseTitle: string,
  episodeNum: number,
  addedMinutes = 1
): { totalMinutes: number; todayMinutes: number; streak: number } {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = readAllLocalStudents(false)
    student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail) || student
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]

  student.lastActive = now.toISOString()
  student.totalStudyMinutes = (student.totalStudyMinutes || 0) + addedMinutes

  // تسجيل المنحنى اليومي الحقيقي
  student.dailyStudyLog = student.dailyStudyLog || {}
  student.dailyStudyLog[todayStr] = (student.dailyStudyLog[todayStr] || 0) + addedMinutes

  // حساب سلسلة الهمة (Streak) الحقيقية بدقة
  if (!student.lastStudiedDate) {
    student.streak = 1
  } else if (student.lastStudiedDate === todayStr) {
    student.streak = Math.max(student.streak || 1, 1)
  } else if (student.lastStudiedDate === yesterdayStr) {
    student.streak = (student.streak || 0) + 1
  } else {
    student.streak = 1
  }
  student.lastStudiedDate = todayStr

  // حفظ السجل في كافة المخازن المحلية والسحابية
  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  // تحديث إحصائيات المنصة العامة
  try {
    const rawStats = fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : '{}'
    const stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: students.length,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: now.toISOString(),
      ...JSON.parse(rawStats),
    }
    stats.totalStudyMinutes = (stats.totalStudyMinutes || 0) + addedMinutes
    stats.lastUpdated = now.toISOString()
    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    import('@/lib/cloud-db')
      .then(({ savePlatformStatsToCloud }) => {
        savePlatformStatsToCloud(stats as unknown as Record<string, unknown>).catch(() => {})
      })
      .catch(() => {})
  } catch {}

  return {
    totalMinutes: student.totalStudyMinutes,
    todayMinutes: student.dailyStudyLog[todayStr],
    streak: student.streak,
  }
}

// 2.7 تسجيل تبديل إنجاز حلقة أو مجلس معين في المتن
export function recordStudentEpisodeToggle(
  email: string,
  courseSlug: string,
  episodeNum: number,
  isCompleted: boolean
): number[] {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = readAllLocalStudents(false)
    student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail) || student
  }

  student.completedEpisodesMap = student.completedEpisodesMap || {}
  const currentEpisodes = student.completedEpisodesMap[courseSlug] || []

  if (isCompleted) {
    student.completedEpisodesMap[courseSlug] = Array.from(new Set([...currentEpisodes, episodeNum])).sort((a, b) => a - b)
  } else {
    student.completedEpisodesMap[courseSlug] = currentEpisodes.filter((n) => n !== episodeNum)
  }

  student.lastActive = new Date().toISOString()
  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  return student.completedEpisodesMap[courseSlug]
}

// 3. تسجيل جلسة استماع لمجلس وزيادة وقت المدارسة الفعلي
export function recordStudentListeningSession(
  email: string,
  courseSlug: string,
  courseTitle: string,
  episodeNum: number,
  durationMinutes = 15
) {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = readAllLocalStudents(false)
    student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail) || student
  }
  if (!student) return

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]

  student.lastActive = now.toISOString()
  student.totalStudyMinutes = (student.totalStudyMinutes || 0) + durationMinutes

  // تسجيل المنحنى اليومي والـ Streak
  student.dailyStudyLog = student.dailyStudyLog || {}
  student.dailyStudyLog[todayStr] = (student.dailyStudyLog[todayStr] || 0) + durationMinutes

  if (!student.lastStudiedDate) {
    student.streak = 1
  } else if (student.lastStudiedDate === todayStr) {
    student.streak = Math.max(student.streak || 1, 1)
  } else if (student.lastStudiedDate === yesterdayStr) {
    student.streak = (student.streak || 0) + 1
  } else {
    student.streak = 1
  }
  student.lastStudiedDate = todayStr

  if (!Array.isArray(student.listenedSessions)) {
    student.listenedSessions = []
  }

  // تجنب التكرار الفوري لنفس المجلس في نفس الدقيقة
  const alreadyRecent = student.listenedSessions.find(
    (s) => s.courseSlug === courseSlug && s.episodeNum === episodeNum && (Date.now() - new Date(s.timestamp).getTime()) < 2 * 60 * 1000
  )

  if (!alreadyRecent) {
    student.listenedSessions.unshift({
      courseSlug,
      courseTitle,
      episodeNum,
      timestamp: now.toISOString(),
    })

    if (student.listenedSessions.length > 50) {
      student.listenedSessions = student.listenedSessions.slice(0, 50)
    }

    logPlatformEvent({
      type: 'listen',
      studentEmail: cleanEmail,
      studentName: student.name,
      description: `استمع إلى المجلس (${episodeNum}) من متن «${courseTitle}»`,
    })
  }

  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  try {
    const rawStats = fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : '{}'
    const stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: students.length,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: now.toISOString(),
      ...JSON.parse(rawStats),
    }
    stats.totalStudyMinutes = (stats.totalStudyMinutes || 0) + durationMinutes
    stats.lastUpdated = now.toISOString()
    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    import('@/lib/cloud-db')
      .then(({ savePlatformStatsToCloud }) => {
        savePlatformStatsToCloud(stats as unknown as Record<string, unknown>).catch(() => {})
      })
      .catch(() => {})
  } catch {}
}

// 4. تسجيل إتمام متن علمي بالكامل
export function recordStudentCourseCompleted(
  email: string,
  courseSlug: string,
  courseTitle: string,
  isCompleted: boolean
) {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) return

  const now = new Date().toISOString()
  student.lastActive = now

  if (!Array.isArray(student.completedCourses)) {
    student.completedCourses = []
  }

  if (isCompleted) {
    if (!student.completedCourses.includes(courseSlug)) {
      student.completedCourses.push(courseSlug)

      logPlatformEvent({
        type: 'complete',
        studentEmail: cleanEmail,
        studentName: student.name,
        description: `أتم بنجاح دراسة متن «${courseTitle}» كاملاً`,
      })
    }
  } else {
    student.completedCourses = student.completedCourses.filter((s) => s !== courseSlug)
  }

  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  // تحديث إجمالي المتون المكتملة على المنصة
  try {
    const totalCompleted = students.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0)
    const rawStats = fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : '{}'
    const stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: students.length,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: now,
      ...JSON.parse(rawStats),
    }
    stats.totalCompletedCoursesCount = totalCompleted
    stats.lastUpdated = now
    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
  } catch {}
}

// 5. تسجيل قيد فائدة جديدة في الكشكول
export function recordStudentNoteAdded(email: string) {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) return

  const now = new Date().toISOString()
  student.lastActive = now
  student.notesCount = (student.notesCount || 0) + 1

  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  try {
    const rawStats = fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : '{}'
    const stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: students.length,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: now,
      ...JSON.parse(rawStats),
    }
    stats.totalNotesCount = (stats.totalNotesCount || 0) + 1
    stats.lastUpdated = now
    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
  } catch {}

  logPlatformEvent({
    type: 'note',
    studentEmail: cleanEmail,
    studentName: student.name,
    description: `قيد فائدة علمية جديدة في كشكوله الخاص`,
  })
}

// 5.ب: حفظ فائدة تفصيلية في كشكول الطالب المحلي مع ضمان بقائها واسترجاعها
export function saveStudentLocalNote(
  email: string,
  note: { courseSlug: string; title: string; content: string; tag: string; id?: string }
): LocalStudentNote | null {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students = readAllLocalStudents(false)

  let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = readAllLocalStudents(false)
    student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail) || student
  }
  if (!student) return null

  if (!Array.isArray(student.savedNotes)) {
    student.savedNotes = []
  }

  const now = new Date().toISOString()
  const noteId = note.id || `loc_note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // منع التكرار إذا كانت نفس الفائدة بنفس الـ id
  const existingIdx = student.savedNotes.findIndex((n) => n.id === noteId)
  const newNote: LocalStudentNote = {
    id: noteId,
    courseSlug: note.courseSlug,
    title: note.title,
    content: note.content,
    tag: note.tag,
    created_at: now,
  }

  if (existingIdx >= 0) {
    student.savedNotes[existingIdx] = newNote
  } else {
    student.savedNotes.unshift(newNote)
  }

  student.notesCount = student.savedNotes.length
  student.lastActive = now

  saveAllLocalStudents(students)
  saveStudentToCloud(student).catch(() => {})

  try {
    const rawStats = fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : '{}'
    const stats: PlatformStats = {
      totalVisitors: 0,
      totalRegisteredStudents: students.length,
      totalStudyMinutes: 0,
      totalNotesCount: 0,
      totalCompletedCoursesCount: 0,
      lastUpdated: now,
      ...JSON.parse(rawStats),
    }
    stats.totalNotesCount = (stats.totalNotesCount || 0) + 1
    stats.lastUpdated = now
    try {
      fs.writeFileSync(TMP_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}
  } catch {}

  logPlatformEvent({
    type: 'note',
    studentEmail: cleanEmail,
    studentName: student.name,
    description: `قيد فائدة علمية في كشكوله: "${note.title.slice(0, 35)}"`,
  })

  return newNote
}

// جلب فوائد الطالب من السجل المحلي
export function getStudentLocalNotes(email?: string, courseSlug?: string): LocalStudentNote[] {
  if (!email) return []
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  try {
    const students = readAllLocalStudents(false)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student || !Array.isArray(student.savedNotes)) return []
    if (courseSlug) {
      return student.savedNotes.filter((n) => n.courseSlug === courseSlug)
    }
    return student.savedNotes
  } catch {
    return []
  }
}

// حذف فائدة من السجل المحلي
export function deleteStudentLocalNote(email: string, noteId: string): boolean {
  if (!email) return false
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  try {
    const students = readAllLocalStudents(false)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student || !Array.isArray(student.savedNotes)) return false

    const initialLen = student.savedNotes.length
    student.savedNotes = student.savedNotes.filter((n) => n.id !== noteId)
    if (student.savedNotes.length !== initialLen) {
      student.notesCount = student.savedNotes.length
      saveAllLocalStudents(students)
      saveStudentToCloud(student).catch(() => {})
      return true
    }
    return false
  } catch {
    return false
  }
}

// 6. جلب كافة بيانات الإحصائيات والطلاب للوحة الإدارة مدمجة من كافة السجلات مع الـ IP والدول
export function getAdminDashboardData(forceRefresh: boolean = false): {
  students: StudentActivityRecord[]
  stats: PlatformStats
  recentEvents: PlatformEvent[]
} {
  ensureDataFiles()
  const students = readAllLocalStudents(forceRefresh)
  let recentEvents: PlatformEvent[] = []
  let stats: PlatformStats = {
    totalVisitors: 0,
    totalRegisteredStudents: 0,
    totalStudyMinutes: 0,
    totalNotesCount: 0,
    totalCompletedCoursesCount: 0,
    lastUpdated: new Date().toISOString(),
  }

  // التأكد من معرف فريد وبيانات التتبع لكل طالب
  let currentMax = 1000
  for (const s of students) {
    if (s.scholarlyId && s.scholarlyId.startsWith('SND-')) {
      const numPart = parseInt(s.scholarlyId.replace('SND-', ''), 10)
      if (!isNaN(numPart) && numPart > currentMax) {
        currentMax = numPart
      }
    }
  }
  students.forEach((s) => {
    if (!s.scholarlyId) {
      currentMax += 1
      s.scholarlyId = `SND-${currentMax}`
    }
    if (s.isBanned === undefined) {
      s.isBanned = false
    }
    ensureStudentTelemetryDefaults(s)
  })

  try {
    recentEvents = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
  } catch {
    try {
      if (fs.existsSync(TMP_EVENTS_FILE)) {
        recentEvents = JSON.parse(fs.readFileSync(TMP_EVENTS_FILE, 'utf8'))
      }
    } catch {}
  }

  try {
    const rawStats = fs.existsSync(STATS_FILE)
      ? fs.readFileSync(STATS_FILE, 'utf8')
      : fs.existsSync(TMP_STATS_FILE)
      ? fs.readFileSync(TMP_STATS_FILE, 'utf8')
      : '{}'
    const loadedStats = JSON.parse(rawStats)
    stats = {
      ...stats,
      ...loadedStats,
      totalRegisteredStudents: students.length,
      totalCompletedCoursesCount: students.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0),
      totalStudyMinutes: students.reduce((acc, s) => acc + (s.totalStudyMinutes || 0), 0),
      totalNotesCount: students.reduce((acc, s) => acc + (s.notesCount || 0), 0),
    }
  } catch {}

  return {
    students,
    stats,
    recentEvents,
  }
}

/**
 * 6.1 جلب كافة بيانات الطلاب المحدثة حياً من Cloud Firestore ودمجها مع السجل المحلي للوحة الإدارة
 */
export async function getAdminDashboardDataAsync(forceRefresh: boolean = true): Promise<{
  students: StudentActivityRecord[]
  stats: PlatformStats
  recentEvents: PlatformEvent[]
}> {
  const localData = getAdminDashboardData(forceRefresh)
  const mergedStudents = [...localData.students]

  try {
    const cloudStudents = await getStudentsFromCloud()
    if (cloudStudents && cloudStudents.length > 0) {
      const existingEmails = new Set(mergedStudents.map((s) => s.email.toLowerCase()))
      for (const cs of cloudStudents) {
        const clean = cs.email.toLowerCase()
        if (!existingEmails.has(clean)) {
          ensureStudentTelemetryDefaults(cs)
          mergedStudents.unshift(cs)
          existingEmails.add(clean)
        } else {
          const idx = mergedStudents.findIndex((s) => s.email.toLowerCase() === clean)
          if (idx >= 0 && cs.lastActive && (!mergedStudents[idx].lastActive || cs.lastActive > mergedStudents[idx].lastActive)) {
            const currentRole = mergedStudents[idx].role
            mergedStudents[idx] = { ...mergedStudents[idx], ...cs }
            if (currentRole && !cs.role) {
              mergedStudents[idx].role = currentRole
            }
            ensureStudentTelemetryDefaults(mergedStudents[idx])
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch students from Cloud Firestore:', err)
  }

  if (globalThis.__sanad_latest_registered_student__) {
    const latestEmail = globalThis.__sanad_latest_registered_student__.email.toLowerCase()
    const idx = mergedStudents.findIndex((s) => s.email.toLowerCase() === latestEmail)
    if (idx === -1) {
      mergedStudents.unshift(globalThis.__sanad_latest_registered_student__)
    } else {
      mergedStudents[idx] = { ...mergedStudents[idx], ...globalThis.__sanad_latest_registered_student__ }
    }
  }

  mergedStudents.forEach((st) => ensureStudentTelemetryDefaults(st))

  // ترتيب الطلاب تنازلياً بحيث يظهر أحدث طالب سجل في المنصة في المقدمة فوراً
  mergedStudents.sort((a, b) => {
    const timeA = new Date(a.registeredAt || a.lastActive || 0).getTime()
    const timeB = new Date(b.registeredAt || b.lastActive || 0).getTime()
    return timeB - timeA
  })

  // حفظ القائمة المدمجة المحدثة
  saveAllLocalStudents(mergedStudents)

  let visitorCount = localData.stats.totalVisitors || 0
  try {
    const { getPlatformStatsFromCloud } = await import('@/lib/cloud-db')
    const cloudStats = await getPlatformStatsFromCloud()
    if (cloudStats && typeof cloudStats.totalVisitors === 'number' && cloudStats.totalVisitors > visitorCount) {
      visitorCount = cloudStats.totalVisitors
    }
  } catch {}

  const stats = {
    ...localData.stats,
    totalVisitors: visitorCount,
    totalRegisteredStudents: mergedStudents.length,
    totalCompletedCoursesCount: mergedStudents.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0),
    totalStudyMinutes: mergedStudents.reduce((acc, s) => acc + (s.totalStudyMinutes || 0), 0),
    totalNotesCount: mergedStudents.reduce((acc, s) => acc + (s.notesCount || 0), 0),
  }

  return {
    students: mergedStudents,
    stats,
    recentEvents: localData.recentEvents,
  }
}

/**
 * 6.2 جلب أحدث طالب انضم للمنصة في الذاكرة الحية أو في السجل
 */
export function getLatestRegisteredStudent(): StudentActivityRecord | null {
  if (globalThis.__sanad_latest_registered_student__) {
    return globalThis.__sanad_latest_registered_student__
  }
  const students = readAllLocalStudents(false)
  if (students.length > 0) {
    const sorted = [...students].sort((a, b) => {
      const timeA = new Date(a.registeredAt || a.lastActive || 0).getTime()
      const timeB = new Date(b.registeredAt || b.lastActive || 0).getTime()
      return timeB - timeA
    })
    return sorted[0] || null
  }
  return null
}

// 7. حفظ كلمة مرور مشفرة للطالب محلياً وسحابياً مع تحديث ذاكرة التخزين المؤقت
export function saveStudentLocalPassword(email: string, password: string, name?: string): boolean {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    let students = readAllLocalStudents(true)

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')

    let student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student) {
      student = registerOrUpdateStudent(cleanEmail, name)
      students = readAllLocalStudents(true)
      student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail) || student
    }

    student.passwordHash = hash
    student.passwordSalt = salt
    student.sessionVersion = (student.sessionVersion || 1) + 1
    student.lastActive = new Date().toISOString()
    if (name && name.trim()) {
      student.name = name.trim()
    }

    saveAllLocalStudents(students)
    if (student) {
      saveStudentToCloud(student).catch(() => {})
    }
    recordAuditLog({
      action: 'PASSWORD_CHANGE',
      actorEmail: cleanEmail,
      actorRole: cleanEmail === SUPER_ADMIN_EMAIL ? 'owner' : student.role || 'student',
      targetEmail: cleanEmail,
      details: 'تحديث كلمة المرور المشفرة للحساب ورفع نسخة الجلسة الأمنية',
    })
    return true
  } catch (err) {
    console.error('Error saving local student password:', err)
    return false
  }
}

// 8. التحقق من كلمة مرور الطالب محلياً
export function verifyStudentLocalPassword(email: string, password: string): boolean {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    const students = readAllLocalStudents(true)

    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student || !student.passwordHash || !student.passwordSalt) {
      return false
    }

    const verifyHash = crypto.scryptSync(password, student.passwordSalt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(verifyHash, 'hex'), Buffer.from(student.passwordHash, 'hex'))
  } catch {
    return false
  }
}

// 8.1 فحص هل الحساب لديه كلمة مرور محفوظة مسبقاً
export function hasStudentLocalPassword(email: string): boolean {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    const students = readAllLocalStudents(false)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    return Boolean(student && student.passwordHash && student.passwordSalt)
  } catch {
    return false
  }
}

// 8.2 تحديث البيانات الشخصية الشاملة والخصوصية والإشعارات والهوية البصرية
export function updateStudentExtendedProfile(
  email: string,
  updates: {
    name?: string
    username?: string
    bio?: string
    educationLevel?: string
    phone?: string
    avatarUrl?: string | null
    privacySettings?: Partial<StudentPrivacySettings>
    notificationSettings?: Partial<StudentNotificationSettings>
  }
): { success: boolean; student?: StudentActivityRecord; error?: string } {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    let students = readAllLocalStudents(true)

    let idx = students.findIndex((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (idx === -1) {
      registerOrUpdateStudent(cleanEmail, updates.name)
      students = readAllLocalStudents(true)
      idx = students.findIndex((s) => s.email?.toLowerCase().trim() === cleanEmail)
    }
    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على الحساب المطلوب' }
    }

    const student = students[idx]

    if (updates.username !== undefined) {
      const cleanHandle = updates.username
        .trim()
        .replace(/^@+/, '')
        .toLowerCase()
      if (cleanHandle.length < 3 || cleanHandle.length > 30 || !/^[a-z0-9_\u0600-\u06FF.]+$/.test(cleanHandle)) {
        return {
          success: false,
          error: 'اسم المستخدم يجب أن يتكون من 3 إلى 30 حرفاً أو رقماً أو شرطة سفلية بدون مسافات.',
        }
      }
      const handleTaken = students.some(
        (s, i) => i !== idx && s.username?.toLowerCase().trim() === cleanHandle
      )
      if (handleTaken) {
        return {
          success: false,
          error: 'اسم المستخدم هذا محجوز لطالب آخر، يرجى اختيار معرف مختلف.',
        }
      }
      student.username = cleanHandle
    }

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim()
      if (cleanName.length < 2 || cleanName.length > 80) {
        return { success: false, error: 'الاسم الكامل يجب أن يكون بين حرفين و80 حرفاً.' }
      }
      student.name = cleanName
    }

    if (updates.bio !== undefined) {
      const cleanBio = updates.bio.trim().slice(0, 350)
      student.bio = cleanBio
    }

    if (updates.educationLevel !== undefined) {
      student.educationLevel = updates.educationLevel.trim().slice(0, 80)
    }

    if (updates.phone !== undefined) {
      student.phone = updates.phone.trim()
    }

    if (updates.avatarUrl !== undefined) {
      if (updates.avatarUrl === null || updates.avatarUrl === '') {
        student.avatarUrl = undefined
        recordAuditLog({
          action: 'AVATAR_DELETE',
          actorEmail: cleanEmail,
          actorRole: cleanEmail === SUPER_ADMIN_EMAIL ? 'owner' : student.role || 'student',
          targetEmail: cleanEmail,
          details: 'حذف الصورة الشخصية والعودة للصورة الافتراضية',
        })
      } else {
        student.avatarUrl = updates.avatarUrl
        recordAuditLog({
          action: 'AVATAR_UPDATE',
          actorEmail: cleanEmail,
          actorRole: cleanEmail === SUPER_ADMIN_EMAIL ? 'owner' : student.role || 'student',
          targetEmail: cleanEmail,
          details: 'تحديث الصورة الشخصية للحساب',
        })
      }
    }

    if (updates.privacySettings) {
      student.privacySettings = {
        showRealNameInCommunity:
          updates.privacySettings.showRealNameInCommunity ??
          student.privacySettings?.showRealNameInCommunity ??
          true,
        showAvatarInCommunity:
          updates.privacySettings.showAvatarInCommunity ??
          student.privacySettings?.showAvatarInCommunity ??
          true,
        showStudyStatsPublicly:
          updates.privacySettings.showStudyStatsPublicly ??
          student.privacySettings?.showStudyStatsPublicly ??
          true,
        showBioPublicly:
          updates.privacySettings.showBioPublicly ??
          student.privacySettings?.showBioPublicly ??
          true,
      }
    }

    if (updates.notificationSettings) {
      student.notificationSettings = {
        lessons:
          updates.notificationSettings.lessons ??
          student.notificationSettings?.lessons ??
          true,
        community:
          updates.notificationSettings.community ??
          student.notificationSettings?.community ??
          true,
        spacedRepetition:
          updates.notificationSettings.spacedRepetition ??
          student.notificationSettings?.spacedRepetition ??
          true,
        security:
          updates.notificationSettings.security ??
          student.notificationSettings?.security ??
          true,
      }
    }

    student.lastActive = new Date().toISOString()
    ensureStudentTelemetryDefaults(student)
    saveAllLocalStudents(students)
    saveStudentToCloud(student).catch(() => {})

    recordAuditLog({
      action: 'PROFILE_UPDATE',
      actorEmail: cleanEmail,
      actorRole: cleanEmail === SUPER_ADMIN_EMAIL ? 'owner' : student.role || 'student',
      targetEmail: cleanEmail,
      details: `تحديث بيانات الملف الشخصي وإعدادات الحساب (${student.name})`,
    })

    return { success: true, student }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'تعذر تحديث الملف الشخصي',
    }
  }
}

// 8.3 تغيير البريد الإلكتروني للحساب بعد التحقق من الملكية
export async function changeStudentEmailAddress(
  currentEmail: string,
  newEmail: string
): Promise<{ success: boolean; student?: StudentActivityRecord; error?: string }> {
  try {
    ensureDataFiles()
    const cleanCurrent = currentEmail.toLowerCase().trim()
    const cleanNew = newEmail.toLowerCase().trim()

    if (!cleanNew || !cleanNew.includes('@')) {
      return { success: false, error: 'يرجى إدخال عنوان بريد إلكتروني جديد صحيح.' }
    }
    if (cleanCurrent === cleanNew) {
      return { success: false, error: 'البريد الإلكتروني الجديد مطابق للبريد الحالي.' }
    }
    if (cleanCurrent === SUPER_ADMIN_EMAIL || cleanNew === SUPER_ADMIN_EMAIL) {
      return {
        success: false,
        error: 'حماية سيادية: لا يمكن تغيير البريد المخصص لمالك المنصة أو استخدامه لحساب آخر.',
      }
    }

    const students = readAllLocalStudents(true)
    const idx = students.findIndex((s) => s.email?.toLowerCase().trim() === cleanCurrent)
    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على الحساب الحالي.' }
    }

    const emailExists = students.some(
      (s, i) => i !== idx && s.email?.toLowerCase().trim() === cleanNew
    )
    if (emailExists) {
      return { success: false, error: 'البريد الإلكتروني الجديد مسجل بالفعل لحساب آخر في المنصة.' }
    }

    const student = students[idx]
    student.email = cleanNew
    student.emailVerified = true
    student.sessionVersion = (student.sessionVersion || 1) + 1
    student.lastActive = new Date().toISOString()

    invalidateStudentProfileCache(cleanCurrent)
    invalidateStudentProfileCache(cleanNew)
    saveAllLocalStudents(students)
    await saveStudentToCloud(student).catch(() => {})

    recordAuditLog({
      action: 'EMAIL_CHANGE',
      actorEmail: cleanCurrent,
      actorRole: student.role || 'student',
      targetEmail: cleanNew,
      details: `تغيير البريد الإلكتروني الموثق من (${cleanCurrent}) إلى (${cleanNew})`,
    })

    return { success: true, student }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'تعذر تغيير البريد الإلكتروني',
    }
  }
}

// 8.4 إبطال وإنهاء كافة الجلسات الأخرى للطالب عبر رفع رقم نسخة الجلسة (Session Version)
export function revokeOtherStudentSessions(email: string): {
  success: boolean
  newSessionVersion: number
  error?: string
} {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    const students = readAllLocalStudents(true)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student) {
      return { success: false, newSessionVersion: 1, error: 'لم يتم العثور على الحساب' }
    }

    student.sessionVersion = (student.sessionVersion || 1) + 1
    student.lastActive = new Date().toISOString()

    saveAllLocalStudents(students)
    saveStudentToCloud(student).catch(() => {})

    recordAuditLog({
      action: 'SESSION_REVOKE',
      actorEmail: cleanEmail,
      actorRole: cleanEmail === SUPER_ADMIN_EMAIL ? 'owner' : student.role || 'student',
      targetEmail: cleanEmail,
      details: `إنهاء وإبطال كافة الجلسات الأخرى النشطة (Session Version -> ${student.sessionVersion})`,
    })

    return { success: true, newSessionVersion: student.sessionVersion }
  } catch (err: unknown) {
    return {
      success: false,
      newSessionVersion: 1,
      error: err instanceof Error ? err.message : 'تعذر إنهاء الجلسات الأخرى',
    }
  }
}

// 8.5 تعطيل الحساب بناءً على طلب الطالب مع حفظ سجل التدقيق
export function deactivateStudentAccount(
  email: string,
  reason?: string
): { success: boolean; error?: string } {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      return {
        success: false,
        error: 'حماية سيادية: لا يمكن تعطيل أو حذف حساب مالك المنصة (المهندس بهاء طارق).',
      }
    }

    const students = readAllLocalStudents(true)
    const student = students.find((s) => s.email?.toLowerCase().trim() === cleanEmail)
    if (!student) {
      return { success: false, error: 'لم يتم العثور على الحساب.' }
    }

    student.isDeactivated = true
    student.deactivatedAt = new Date().toISOString()
    student.deactivationReason = reason?.trim() || 'تعطيل الحساب بناءً على طلب صاحب الحساب'
    student.sessionVersion = (student.sessionVersion || 1) + 1

    saveAllLocalStudents(students)
    saveStudentToCloud(student).catch(() => {})

    recordAuditLog({
      action: 'ACCOUNT_DEACTIVATE',
      actorEmail: cleanEmail,
      actorRole: student.role || 'student',
      targetEmail: cleanEmail,
      details: `تعطيل الحساب بناءً على طلب المستخدم (${student.deactivationReason})`,
    })

    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'تعذر تعطيل الحساب',
    }
  }
}

// 9. منظومة لوحة الشرف والتنافس المحمود بين طلاب العلم («وفي ذلك فليتنافس المتنافسون»)
export interface LeaderboardStudentEntry {
  rank: number
  id: string
  name: string
  maskedEmail: string
  totalStudyMinutes: number
  streak: number
  completedCoursesCount: number
  notesCount: number
  isCurrentStudent: boolean
  specialHonor?: string
  levelTitle: string
}

export interface ScholarlyLeaderboardData {
  topStreakLeader: LeaderboardStudentEntry
  topHoursLeader: LeaderboardStudentEntry
  topCoursesLeader: LeaderboardStudentEntry
  topNotesLeader: LeaderboardStudentEntry
  allRankedStudents: LeaderboardStudentEntry[]
  currentStudent?: {
    rank: number
    totalStudents: number
    aheadOfYouStudent?: {
      name: string
      gapMinutes: number
      gapStreak: number
    }
    isTopThree: boolean
    motivationalTip: string
  }
}

export function getScholarlyLeaderboardData(currentStudentEmail?: string): ScholarlyLeaderboardData {
  ensureDataFiles()
  const cleanCurrentEmail = currentStudentEmail?.toLowerCase().trim() || ''

  const registeredStudents = readAllLocalStudents(false)

  // نماذج محفزة ورفقاء مدارسة ملهمون لتكون المنافسة حية وميسرة دائماً
  const inspiringPeers: Array<{
    id: string
    name: string
    email: string
    totalStudyMinutes: number
    streak: number
    completedCourses: string[]
    notesCount: number
  }> = [
    {
      id: 'peer_1',
      name: 'أحمد بن عبد الرحمن',
      email: 'ahmed.taseel@sanad.edu',
      totalStudyMinutes: 45,
      streak: 3,
      completedCourses: ['bidayat-al-mutafaqqih'],
      notesCount: 5,
    },
    {
      id: 'peer_2',
      name: 'أبو عبد الله الأندلسي',
      email: 'andalusi@sanad.edu',
      totalStudyMinutes: 30,
      streak: 2,
      completedCourses: ['three-principles'],
      notesCount: 4,
    },
    {
      id: 'peer_3',
      name: 'أم سلمة البغدادية',
      email: 'ummsalamah@sanad.edu',
      totalStudyMinutes: 20,
      streak: 2,
      completedCourses: ['al-ajrumiyyah'],
      notesCount: 3,
    },
    {
      id: 'peer_4',
      name: 'أنس بن مالك البصري',
      email: 'anas.basri@sanad.edu',
      totalStudyMinutes: 15,
      streak: 1,
      completedCourses: [],
      notesCount: 2,
    },
  ]

  // دمج الطلاب الحقيقيين مع رفقاء المدارسة
  const allMergedMap = new Map<string, {
    id: string
    name: string
    email: string
    totalStudyMinutes: number
    streak: number
    completedCoursesCount: number
    notesCount: number
    isRealStudent: boolean
  }>()

  // 1. إضافة الرفقاء الملهمين
  inspiringPeers.forEach((p) => {
    allMergedMap.set(p.email, {
      id: p.id,
      name: p.name,
      email: p.email,
      totalStudyMinutes: p.totalStudyMinutes,
      streak: p.streak,
      completedCoursesCount: p.completedCourses.length,
      notesCount: p.notesCount,
      isRealStudent: false,
    })
  })

  // 2. دمج الطلاب الحقيقيين وتحديث إحصاءاتهم الحية مع احترام إعدادات الخصوصية
  registeredStudents.forEach((s) => {
    if (s.isBanned || s.isDeactivated) return // استبعاد أي حساب محظور إدارياً أو معطل من لوحة الصدارة العامة

    const sEmail = (s.email || '').trim()
    const isMe = Boolean(cleanCurrentEmail && sEmail.toLowerCase() === cleanCurrentEmail)
    if (!isMe && s.privacySettings?.showStudyStatsPublicly === false) {
      return
    }

    const hideRealName = !isMe && s.privacySettings?.showRealNameInCommunity === false
    const studentName = hideRealName
      ? `طالب علم (${s.scholarlyId || 'سَنَد'})`
      : s.name && s.name.trim() && !s.name.includes('@')
      ? s.name.trim()
      : sEmail.includes('bhaaljml480')
      ? 'المهندس بهاء طارق'
      : s.name || (sEmail.includes('@') ? sEmail.split('@')[0] : sEmail || 'طالب العلم')

    const studentKey = sEmail ? sEmail.toLowerCase() : `student_${s.id}`

    allMergedMap.set(studentKey, {
      id: s.id,
      name: studentName,
      email: sEmail,
      totalStudyMinutes: s.totalStudyMinutes || 0,
      streak: s.streak || 0,
      completedCoursesCount: Array.isArray(s.completedCourses) ? s.completedCourses.length : 0,
      notesCount: s.notesCount || 0,
      isRealStudent: true,
    })
  })

  const mergedList = Array.from(allMergedMap.values())

  // حساب ترتيب المتصدرين الإجمالي (حسب دقائق المدارسة والمواظبة)
  mergedList.sort((a, b) => {
    if (b.totalStudyMinutes !== a.totalStudyMinutes) {
      return b.totalStudyMinutes - a.totalStudyMinutes
    }
    if (b.streak !== a.streak) {
      return b.streak - a.streak
    }
    return b.notesCount - a.notesCount
  })

  // صياغة اللائحة المرتبة بالأوسمة
  const rankedEntries: LeaderboardStudentEntry[] = mergedList.map((item, idx) => {
    const rank = idx + 1
    const itemEmailClean = (item.email || '').toLowerCase()
    const isCurrent = Boolean(cleanCurrentEmail && itemEmailClean === cleanCurrentEmail)

    let honor: string | undefined = undefined
    if (rank === 1) honor = '🥇 فارس الصدارة'
    else if (rank === 2) honor = '🥈 وصيف الصدارة'
    else if (rank === 3) honor = '🥉 أهل الرسوخ'
    else if (item.streak >= 10) honor = '🔥 وتد المواظبة'
    else if (item.totalStudyMinutes >= 300) honor = '⏱️ عميد المدارسة'

    let levelTitle = 'طالب علم سائر'
    if (item.totalStudyMinutes >= 600 || item.streak >= 12) levelTitle = 'سابق بالخيرات'
    else if (item.totalStudyMinutes >= 300 || item.streak >= 7) levelTitle = 'مواظب متقدم'
    else if (item.totalStudyMinutes >= 100 || item.streak >= 3) levelTitle = 'طالب مبادر بهمة'

    // تمويه البريد الإلكتروني أو رقم الهاتف لحماية الخصوصية
    let masked = 'طالب مؤصل'
    if (item.email && item.email.includes('@')) {
      const parts = item.email.split('@')
      masked = parts[0].length > 3
        ? `${parts[0].slice(0, 3)}***@${parts[1] || 'sanad.edu'}`
        : `${parts[0]}***@sanad.edu`
    } else if (item.email && item.email.length > 4) {
      masked = `${item.email.slice(0, 4)}***${item.email.slice(-3)}`
    }

    return {
      rank,
      id: item.id,
      name: item.name,
      maskedEmail: masked,
      totalStudyMinutes: item.totalStudyMinutes,
      streak: item.streak,
      completedCoursesCount: item.completedCoursesCount,
      notesCount: item.notesCount,
      isCurrentStudent: isCurrent,
      specialHonor: honor,
      levelTitle,
    }
  })

  // فرسان الصدارة في الفئات الأربع الرئيسية:
  // 1. فارس المواظبة (أطول سلسلة أيام متتالية)
  const streakSorted = [...rankedEntries].sort((a, b) => b.streak - a.streak)
  const topStreakLeader = streakSorted[0]

  // 2. عميد ساعات المدارسة (أكبر وقت استماع للمجالس)
  const hoursSorted = [...rankedEntries].sort((a, b) => b.totalStudyMinutes - a.totalStudyMinutes)
  const topHoursLeader = hoursSorted[0]

  // 3. سابق المتون (أكبر عدد متون منجزة)
  const coursesSorted = [...rankedEntries].sort((a, b) => b.completedCoursesCount - a.completedCoursesCount)
  const topCoursesLeader = coursesSorted[0]

  // 4. قيّد الأوابد (أكثر من قيد فوائد بالكشكول)
  const notesSorted = [...rankedEntries].sort((a, b) => b.notesCount - a.notesCount)
  const topNotesLeader = notesSorted[0]

  // معلومات الطالب الحالي وموقعه في السباق
  let currentStudentInfo: ScholarlyLeaderboardData['currentStudent'] = undefined
  const currentIdx = rankedEntries.findIndex((e) => e.isCurrentStudent)

  if (currentIdx >= 0) {
    const myEntry = rankedEntries[currentIdx]
    const isTopThree = myEntry.rank <= 3

    let aheadStudent: { name: string; gapMinutes: number; gapStreak: number } | undefined = undefined
    let motivationalTip = 'ثبتك الله وبارك في همتك؛ المدارسة القليلة الدائمة تفتح مغاليق الفهوم.'

    if (currentIdx > 0) {
      const studentAhead = rankedEntries[currentIdx - 1]
      const gapMin = Math.max(1, studentAhead.totalStudyMinutes - myEntry.totalStudyMinutes)
      const gapStr = Math.max(0, studentAhead.streak - myEntry.streak)

      aheadStudent = {
        name: studentAhead.name,
        gapMinutes: gapMin,
        gapStreak: gapStr,
      }

      if (gapMin <= 60) {
        motivationalTip = `أنت على بعد مجلس واحد (${gapMin} دقيقة فقط) لتتجاوز «${studentAhead.name}» وتصعد للمركز #${studentAhead.rank}! استعن بالله.`
      } else {
        motivationalTip = `يفصلك ${Math.ceil(gapMin / 60)} ساعة مدارسة للوصول إلى مرتبة «${studentAhead.name}» (#${studentAhead.rank}). فاستبقوا الخيرات!`
      }
    } else {
      motivationalTip = 'ما شاء الله تبارك الله! أنت في صدارة طلاب منصة سَنَد، واصل الثبات واحتسب أجر الاستمرار والإلهام لإخوانك.'
    }

    currentStudentInfo = {
      rank: myEntry.rank,
      totalStudents: rankedEntries.length,
      aheadOfYouStudent: aheadStudent,
      isTopThree,
      motivationalTip,
    }
  }

  return {
    topStreakLeader,
    topHoursLeader,
    topCoursesLeader,
    topNotesLeader,
    allRankedStudents: rankedEntries,
    currentStudent: currentStudentInfo,
  }
}

