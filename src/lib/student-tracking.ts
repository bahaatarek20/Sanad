import fs from 'fs'
import path from 'path'
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

export interface StudentActivityRecord {
  id: string
  scholarlyId?: string // المعرف الأكاديمي الفريد لطالب العلم (مثال: SND-1001)
  email: string
  name: string
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
  phone?: string // رقم هاتف الطالب الموثق
  authProvider?: 'email' | 'google' | 'phone' // طريقة تسجيل الدخول الأساسية
  avatarUrl?: string // صورة حساب جوجل إن وجدت
}

export interface PlatformEvent {
  id: string
  type: 'register' | 'listen' | 'complete' | 'note' | 'ban' | 'unban'
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
const STATS_FILE = path.join(DATA_DIR, 'sanad_platform_stats.json')
const EVENTS_FILE = path.join(DATA_DIR, 'sanad_platform_events.json')

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
        totalVisitors: 0, // عداد حقيقي يبدأ من الصفر
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
  } catch (err) {
    console.error('Error ensuring data files:', err)
  }
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
    const content = fs.readFileSync(STATS_FILE, 'utf8')
    const stats: PlatformStats = JSON.parse(content)

    // إذا كان الزائر هو صاحب المنصة / المشرف العام، لا يتم احتسابه نهائياً
    if (options?.isOwner) {
      return stats.totalVisitors || 0
    }

    stats.totalVisitors = (stats.totalVisitors || 0) + 1
    stats.lastUpdated = new Date().toISOString()
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    return stats.totalVisitors
  } catch {
    return 0
  }
}

// 1.1 إعادة تعيين أو تصحيح عداد زوار المنصة
export function resetVisitorCount(targetCount: number = 0): number {
  try {
    ensureDataFiles()
    const content = fs.readFileSync(STATS_FILE, 'utf8')
    const stats: PlatformStats = JSON.parse(content)
    stats.totalVisitors = Math.max(0, targetCount)
    stats.lastUpdated = new Date().toISOString()
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
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
    let students: StudentActivityRecord[] = []
    try {
      students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    } catch {
      return { isBanned: false }
    }
    const student = students.find(
      (s) =>
        s.email.toLowerCase() === clean ||
        s.scholarlyId?.toLowerCase() === clean ||
        s.id === clean
    )
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

// 1.7 حظر أو فك حظر حساب طالب إدارياً (مشرف فقط)
export function toggleStudentBan(
  emailOrId: string,
  isBanned: boolean,
  banReason?: string
): { success: boolean; student?: StudentActivityRecord; error?: string } {
  try {
    ensureDataFiles()
    const clean = emailOrId.toLowerCase().trim()
    let students: StudentActivityRecord[] = []
    try {
      students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    } catch {
      students = []
    }

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
    student.isBanned = isBanned
    if (isBanned) {
      student.bannedAt = new Date().toISOString()
      student.banReason = banReason?.trim() || 'حظر إداري بقرار من المشرف العام'
    } else {
      student.bannedAt = undefined
      student.banReason = undefined
    }

    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')

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

// 2. تسجيل أو تحديث حساب طالب مسجل
export function registerOrUpdateStudent(
  email: string,
  name?: string,
  meta?: { phone?: string; authProvider?: 'email' | 'google' | 'phone'; avatarUrl?: string }
): StudentActivityRecord {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students: StudentActivityRecord[] = []

  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8')
    students = JSON.parse(raw)
  } catch {
    students = []
  }

  const existingIdx = students.findIndex((s) => s.email === cleanEmail)
  const now = new Date().toISOString()
  const studentName = name?.trim() || cleanEmail.split('@')[0]

  if (existingIdx >= 0) {
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
    try {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
    } catch (e) {
      console.warn('Could not write registry file locally (expected on Vercel):', e)
    }

    // مزامنة سحابية حية مع Cloud Firestore
    saveStudentToCloud(students[existingIdx]).catch(() => {})

    return students[existingIdx]
  } else {
    const scholarlyId = generateScholarlyId(students)
    const newStudent: StudentActivityRecord = {
      id: `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      scholarlyId,
      email: cleanEmail,
      name: studentName,
      phone: meta?.phone,
      authProvider: meta?.authProvider || 'email',
      avatarUrl: meta?.avatarUrl,
      registeredAt: now,
      lastActive: now,
      totalStudyMinutes: 0,
      streak: 0, // يبدأ بصفر دقيق حتى ينجز الطالب أول مجلس
      completedCourses: [],
      completedEpisodesMap: {},
      dailyStudyLog: {},
      listenedSessions: [],
      notesCount: 0,
      isBanned: false,
    }
    students.unshift(newStudent)

    try {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
    } catch (e) {
      console.warn('Could not write registry file locally (expected on Vercel):', e)
    }

    // مزامنة سحابية حية مع Cloud Firestore فوراً
    saveStudentToCloud(newStudent).catch(() => {})

    // تحديث إحصائيات الطلاب
    try {
      const statsRaw = fs.readFileSync(STATS_FILE, 'utf8')
      const stats: PlatformStats = JSON.parse(statsRaw)
      stats.totalRegisteredStudents = students.length
      stats.lastUpdated = now
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
    } catch {}

    logPlatformEvent({
      type: 'register',
      studentEmail: cleanEmail,
      studentName: studentName,
      description: `انضمام طالب جديد إلى المنصة وتأكيد بريده الإلكتروني [المعرف: ${scholarlyId}]`,
    })

    return newStudent
  }
}

// 2.5 جلب بيانات الحساب العلمي للطالب (السجل الكامل المشفر)
export function getStudentProfileData(email: string): StudentActivityRecord | null {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8')
    const students: StudentActivityRecord[] = JSON.parse(raw)
    const student = students.find((s) => s.email === cleanEmail)
    if (student) {
      return {
        ...student,
        totalStudyMinutes: student.totalStudyMinutes || 0,
        streak: student.streak || 0,
        completedCourses: Array.isArray(student.completedCourses) ? student.completedCourses : [],
        completedEpisodesMap: student.completedEpisodesMap || {},
        dailyStudyLog: student.dailyStudyLog || {},
        listenedSessions: Array.isArray(student.listenedSessions) ? student.listenedSessions : [],
        notesCount: student.notesCount || 0,
      }
    }
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
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    students = []
  }

  let student = students.find((s) => s.email === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    student = students.find((s) => s.email === cleanEmail) || student
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

  // حفظ السجل
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')

  // تحديث إحصائيات المنصة العامة
  try {
    const stats: PlatformStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalStudyMinutes = (stats.totalStudyMinutes || 0) + addedMinutes
    stats.lastUpdated = now.toISOString()
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
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
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return []
  }

  let student = students.find((s) => s.email === cleanEmail)
  if (!student) {
    student = registerOrUpdateStudent(cleanEmail)
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    student = students.find((s) => s.email === cleanEmail) || student
  }

  student.completedEpisodesMap = student.completedEpisodesMap || {}
  const currentEpisodes = student.completedEpisodesMap[courseSlug] || []

  if (isCompleted) {
    student.completedEpisodesMap[courseSlug] = Array.from(new Set([...currentEpisodes, episodeNum])).sort((a, b) => a - b)
  } else {
    student.completedEpisodesMap[courseSlug] = currentEpisodes.filter((n) => n !== episodeNum)
  }

  student.lastActive = new Date().toISOString()
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}
  if (student) {
    saveStudentToCloud(student).catch(() => {})
  }

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
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return
  }

  const student = students.find((s) => s.email === cleanEmail)
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

  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}
  if (student) {
    saveStudentToCloud(student).catch(() => {})
  }

  try {
    const stats: PlatformStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalStudyMinutes = (stats.totalStudyMinutes || 0) + durationMinutes
    stats.lastUpdated = now.toISOString()
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
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
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return
  }

  const student = students.find((s) => s.email === cleanEmail)
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

  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}
  if (student) {
    saveStudentToCloud(student).catch(() => {})
  }

  // تحديث إجمالي المتون المكتملة على المنصة
  try {
    const totalCompleted = students.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0)
    const stats: PlatformStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalCompletedCoursesCount = totalCompleted
    stats.lastUpdated = now
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
  } catch {}
}

// 5. تسجيل قيد فائدة جديدة في الكشكول
export function recordStudentNoteAdded(email: string) {
  ensureDataFiles()
  const cleanEmail = email.toLowerCase().trim()
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return
  }

  const student = students.find((s) => s.email === cleanEmail)
  if (!student) return

  const now = new Date().toISOString()
  student.lastActive = now
  student.notesCount = (student.notesCount || 0) + 1

  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
  } catch {}
  if (student) {
    saveStudentToCloud(student).catch(() => {})
  }

  try {
    const stats: PlatformStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalNotesCount = (stats.totalNotesCount || 0) + 1
    stats.lastUpdated = now
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
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
  let students: StudentActivityRecord[] = []

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return null
  }

  const student = students.find((s) => s.email === cleanEmail)
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

  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')

  try {
    const stats: PlatformStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalNotesCount = (stats.totalNotesCount || 0) + 1
    stats.lastUpdated = now
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8')
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
    const students: StudentActivityRecord[] = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    const student = students.find((s) => s.email === cleanEmail)
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
    const students: StudentActivityRecord[] = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    const student = students.find((s) => s.email === cleanEmail)
    if (!student || !Array.isArray(student.savedNotes)) return false

    const initialLen = student.savedNotes.length
    student.savedNotes = student.savedNotes.filter((n) => n.id !== noteId)
    if (student.savedNotes.length !== initialLen) {
      student.notesCount = student.savedNotes.length
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
      return true
    }
    return false
  } catch {
    return false
  }
}

// 6. جلب كافة بيانات الإحصائيات والطلاب للوحة الإدارة
export function getAdminDashboardData(): {
  students: StudentActivityRecord[]
  stats: PlatformStats
  recentEvents: PlatformEvent[]
} {
  ensureDataFiles()
  let students: StudentActivityRecord[] = []
  let recentEvents: PlatformEvent[] = []
  let stats: PlatformStats = {
    totalVisitors: 0,
    totalRegisteredStudents: 0,
    totalStudyMinutes: 0,
    totalNotesCount: 0,
    totalCompletedCoursesCount: 0,
    lastUpdated: new Date().toISOString(),
  }

  try {
    students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    // التأكد من امتلاك كل طالب لمعرف أكاديمي فريد وحالة الحظر
    let updated = false
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
        updated = true
      }
      if (s.isBanned === undefined) {
        s.isBanned = false
        updated = true
      }
    })
    if (updated) {
      try {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
      } catch {}
    }
  } catch {
    students = []
  }

  try {
    recentEvents = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
  } catch {
    recentEvents = []
  }

  try {
    stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    stats.totalRegisteredStudents = students.length
    stats.totalCompletedCoursesCount = students.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0)
    stats.totalStudyMinutes = students.reduce((acc, s) => acc + (s.totalStudyMinutes || 0), 0)
    stats.totalNotesCount = students.reduce((acc, s) => acc + (s.notesCount || 0), 0)
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
export async function getAdminDashboardDataAsync(): Promise<{
  students: StudentActivityRecord[]
  stats: PlatformStats
  recentEvents: PlatformEvent[]
}> {
  const localData = getAdminDashboardData()
  let mergedStudents = [...localData.students]

  try {
    const cloudStudents = await getStudentsFromCloud()
    if (cloudStudents && cloudStudents.length > 0) {
      const existingEmails = new Set(mergedStudents.map((s) => s.email.toLowerCase()))
      for (const cs of cloudStudents) {
        const clean = cs.email.toLowerCase()
        if (!existingEmails.has(clean)) {
          mergedStudents.unshift(cs)
          existingEmails.add(clean)
        } else {
          const idx = mergedStudents.findIndex((s) => s.email.toLowerCase() === clean)
          if (idx >= 0 && cs.lastActive && (!mergedStudents[idx].lastActive || cs.lastActive > mergedStudents[idx].lastActive)) {
            mergedStudents[idx] = { ...mergedStudents[idx], ...cs }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch students from Cloud Firestore:', err)
  }

  const stats = {
    ...localData.stats,
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

// 7. حفظ كلمة مرور مشفرة للطالب محلياً
export function saveStudentLocalPassword(email: string, password: string, name?: string): boolean {
  try {
    ensureDataFiles()
    const cleanEmail = email.toLowerCase().trim()
    let students: StudentActivityRecord[] = []
    try {
      students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    } catch {
      students = []
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')

    let student = students.find((s) => s.email === cleanEmail)
    if (!student) {
      student = registerOrUpdateStudent(cleanEmail, name)
      students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
      student = students.find((s) => s.email === cleanEmail) || student
    }

    student.passwordHash = hash
    student.passwordSalt = salt
    student.lastActive = new Date().toISOString()
    if (name && name.trim()) {
      student.name = name.trim()
    }

    try {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(students, null, 2), 'utf8')
    } catch {}
    if (student) {
      saveStudentToCloud(student).catch(() => {})
    }
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
    let students: StudentActivityRecord[] = []
    try {
      students = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    } catch {
      return false
    }

    const student = students.find((s) => s.email === cleanEmail)
    if (!student || !student.passwordHash || !student.passwordSalt) {
      return false
    }

    const verifyHash = crypto.scryptSync(password, student.passwordSalt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(verifyHash, 'hex'), Buffer.from(student.passwordHash, 'hex'))
  } catch {
    return false
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

  let registeredStudents: StudentActivityRecord[] = []
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8')
    registeredStudents = JSON.parse(raw)
  } catch {
    registeredStudents = []
  }

  // نماذج محفزة ورفقاء مدارسة ملهمون لتكون المنافسة حية ونشطة دائماً
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
      name: 'أحمد بن عبد الرحمن (باحث تأصيلي)',
      email: 'ahmed.taseel@sanad.edu',
      totalStudyMinutes: 720,
      streak: 14,
      completedCourses: ['bidayat-al-mutafaqqih', '40-hadith-nawawi-1', 'al-ajrumiyyah'],
      notesCount: 24,
    },
    {
      id: 'peer_2',
      name: 'أبو عبد الله الأندلسي (طالب علم)',
      email: 'andalusi@sanad.edu',
      totalStudyMinutes: 540,
      streak: 11,
      completedCourses: ['three-principles', 'al-waraqat'],
      notesCount: 18,
    },
    {
      id: 'peer_3',
      name: 'أم سلمة البغدادية (مقرئة ودارسة)',
      email: 'ummsalamah@sanad.edu',
      totalStudyMinutes: 420,
      streak: 9,
      completedCourses: ['al-ajrumiyyah', '40-hadith-nawawi-1'],
      notesCount: 22,
    },
    {
      id: 'peer_4',
      name: 'أنس بن مالك البصري (شغوف بالحديث)',
      email: 'anas.basri@sanad.edu',
      totalStudyMinutes: 320,
      streak: 7,
      completedCourses: ['40-hadith-nawawi-1'],
      notesCount: 12,
    },
    {
      id: 'peer_5',
      name: 'يحيى بن يحيى الليثي (دارس الفقه)',
      email: 'yahya.laythi@sanad.edu',
      totalStudyMinutes: 240,
      streak: 5,
      completedCourses: ['bidayat-al-mutafaqqih'],
      notesCount: 9,
    },
    {
      id: 'peer_6',
      name: 'معاذ الشامي (مبادر بالمدارسة)',
      email: 'muadh.shami@sanad.edu',
      totalStudyMinutes: 150,
      streak: 4,
      completedCourses: [],
      notesCount: 6,
    },
    {
      id: 'peer_7',
      name: 'طالب علم سائر بالهمة',
      email: 'talib.himmah@sanad.edu',
      totalStudyMinutes: 85,
      streak: 3,
      completedCourses: [],
      notesCount: 4,
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

  // 2. دمج الطلاب الحقيقيين وتحديث إحصاءاتهم الحية
  registeredStudents.forEach((s) => {
    if (s.isBanned) return // استبعاد أي حساب محظور إدارياً من لوحة الصدارة العامة وميدان التنافس

    const sEmail = (s.email || '').trim()
    const studentName = s.name && s.name.trim() && !s.name.includes('@')
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

