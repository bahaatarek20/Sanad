import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getActiveCourses } from '@/lib/courses-store'

export interface VerifiedCertificate {
  id: string // المعرف الفريد مثلاً: SND-IJZ-2026-X8F9Q
  courseSlug: string
  courseTitle: string
  authorName?: string
  instructorName?: string
  studentName: string
  studentEmail?: string
  issuedAt: string // تاريخ الإصدار بتنسيق ISO
  formattedDate: string // تاريخ الإصدار الهجري/الميلادي
  verificationHash: string // كود التجزئة المشفر SHA-256
  serialNumber: string
  authorityTitle: string // اسم جهة الاعتماد: منصة سَنَد
  committeeTitle: string // هيئة الإشراف والتأصيل
  studyHoursEstimated?: number
  episodesCount?: number
  isRevoked?: boolean
}

const CERTS_FILE = path.join(process.cwd(), 'data', 'sanad_certificates.json')

function ensureCertsFile(): VerifiedCertificate[] {
  try {
    if (!fs.existsSync(CERTS_FILE)) {
      const dataDir = path.dirname(CERTS_FILE)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(CERTS_FILE, JSON.stringify([], null, 2), 'utf-8')
      return []
    }
    const content = fs.readFileSync(CERTS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

function saveCertsFile(certs: VerifiedCertificate[]) {
  try {
    const dataDir = path.dirname(CERTS_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(CERTS_FILE, JSON.stringify(certs, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error saving certificates:', err)
  }
}

/**
 * توليد كود التجزئة التوثيقي المشفر (SHA-256 Cryptographic Hash)
 */
export function generateCertificateHash(
  studentName: string,
  courseSlug: string,
  serialNumber: string,
  timestamp: string
): string {
  const secretSalt = process.env.SANAD_CERT_SALT || 'Sanad-Verified-Ijaza-Cryptographic-Seal-2026'
  const rawPayload = `${studentName.trim()}::${courseSlug.trim()}::${serialNumber}::${timestamp}::${secretSalt}`
  return crypto.createHash('sha256').update(rawPayload).digest('hex').toUpperCase()
}

/**
 * إصدار أو استرجاع إجازة قراءة وضبط موثقة لمتن علمي
 * التوقيع باسم المنصة حصراً لترسيخ علامتها وهويتها العالمية
 */
export function issueCourseCertificate(params: {
  courseSlug: string
  studentName: string
  studentEmail?: string
}): VerifiedCertificate {
  const certs = ensureCertsFile()
  const cleanStudentName = params.studentName.trim() || 'طالب العلم المبارك'
  const cleanSlug = params.courseSlug.trim()

  // البحث عما إذا كانت هناك إجازة مسبقة صادرة لنفس الطالب والمتن
  const existing = certs.find(
    (c) =>
      c.courseSlug === cleanSlug &&
      c.studentName.trim().toLowerCase() === cleanStudentName.toLowerCase() &&
      !c.isRevoked
  )

  if (existing) {
    return existing
  }

  // جلب تفاصيل المتن
  const allCourses = getActiveCourses()
  const course = allCourses.find((c) => c.slug === cleanSlug)

  const timestamp = new Date().toISOString()
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const year = new Date().getFullYear()
  const serialNumber = `SND-IJZ-${year}-${randomSuffix}`
  const id = serialNumber.toLowerCase()

  const verificationHash = generateCertificateHash(
    cleanStudentName,
    cleanSlug,
    serialNumber,
    timestamp
  )

  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  const newCertificate: VerifiedCertificate = {
    id,
    courseSlug: cleanSlug,
    courseTitle: course?.title || 'متن علمي تأصيلي',
    authorName: course?.author || 'أحد أئمة العلم المصنفين',
    instructorName: course?.instructor || 'نخبة من العلماء والشارحين المعتمدين',
    studentName: cleanStudentName,
    studentEmail: params.studentEmail,
    issuedAt: timestamp,
    formattedDate,
    verificationHash,
    serialNumber,
    authorityTitle: 'إِدَارَةُ مَنَصَّةِ سَنَدٍ لِلتَّأْصِيلِ الشَّرْعِيِّ',
    committeeTitle: 'هَيْئَةُ الإِشْرَافِ وَضَبْطِ المَتُونِ العِلْمِيَّةِ',
    episodesCount: course?.totalLessons || course?.episodes?.length || 10,
    studyHoursEstimated: Math.max(2, Math.round(((course?.totalLessons || 10) * 35) / 60)),
    isRevoked: false,
  }

  certs.unshift(newCertificate)
  saveCertsFile(certs)

  return newCertificate
}

/**
 * البحث عن إجازة موثقة بواسطة المعرف أو الرقم التسلسلي
 */
export function getCertificateById(idOrSerial: string): VerifiedCertificate | null {
  if (!idOrSerial) return null
  const certs = ensureCertsFile()
  const clean = idOrSerial.trim().toLowerCase()

  const found = certs.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.serialNumber.toLowerCase() === clean ||
      c.verificationHash.toLowerCase() === clean
  )

  return found || null
}

/**
 * التحقق الرياضي الدقيق من صحة كود التجزئة (Hash Verification)
 */
export function verifyCertificateIntegrity(cert: VerifiedCertificate): {
  isValid: boolean
  matchedHash: boolean
  computedHash: string
} {
  const computedHash = generateCertificateHash(
    cert.studentName,
    cert.courseSlug,
    cert.serialNumber,
    cert.issuedAt
  )

  const matchedHash = computedHash === cert.verificationHash
  return {
    isValid: matchedHash && !cert.isRevoked,
    matchedHash,
    computedHash,
  }
}
