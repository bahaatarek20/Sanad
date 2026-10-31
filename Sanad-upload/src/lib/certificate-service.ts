import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { getActiveCourses } from '@/lib/courses-store'
import { saveCertificateToCloud, getCertificateFromCloud } from '@/lib/cloud-db'

export interface VerifiedCertificate {
  id: string // المعرف الفريد مثلاً: snd-ijz-2026-x8f9q
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
  signedToken?: string // رمز توثيق مشفر HMAC-SHA256 يعمل على أي خادم سحابي حتى بدون قاعدة بيانات
}

const CERTS_FILE = path.join(process.cwd(), 'data', 'sanad_certificates.json')
const TMP_DATA_DIR = path.join(os.tmpdir(), 'sanad_data')
const TMP_CERTS_FILE = path.join(TMP_DATA_DIR, 'sanad_certificates.json')

declare global {
  // eslint-disable-next-line no-var
  var __sanad_certificates_cache__: VerifiedCertificate[] | undefined
}

function getCertSecret(): string {
  return process.env.SANAD_CERT_SALT || 'Sanad-Verified-Ijaza-Cryptographic-Seal-2026'
}

/**
 * إنشاء رمز توثيق مشفر وموقع بـ HMAC-SHA256 يمكن التحقق منه على أي خادم Serverless دون الاعتماد على القرص المحلي
 */
export function createSignedCertificateToken(cert: VerifiedCertificate): string {
  try {
    const compactPayload = {
      i: cert.id,
      s: cert.serialNumber,
      c: cert.courseSlug,
      ct: cert.courseTitle,
      a: cert.authorName,
      in: cert.instructorName,
      n: cert.studentName,
      e: cert.studentEmail,
      at: cert.issuedAt,
      fd: cert.formattedDate,
      h: cert.verificationHash,
      ep: cert.episodesCount,
      hr: cert.studyHoursEstimated,
    }
    const payloadB64 = Buffer.from(JSON.stringify(compactPayload), 'utf8').toString('base64url')
    const sig = crypto
      .createHmac('sha256', getCertSecret())
      .update(payloadB64)
      .digest('base64url')
      .slice(0, 32)
    return `${payloadB64}.${sig}`
  } catch {
    return ''
  }
}

/**
 * فك والتحقق الجنائي من رمز التوثيق المشفر للإجازة (Stateless Verification)
 */
export function verifySignedCertificateToken(token?: string | null): VerifiedCertificate | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  try {
    const [payloadB64, sig] = token.trim().split('.')
    if (!payloadB64 || !sig) return null
    const expectedSig = crypto
      .createHmac('sha256', getCertSecret())
      .update(payloadB64)
      .digest('base64url')
      .slice(0, 32)
    if (sig !== expectedSig) return null

    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (!parsed || !parsed.i || !parsed.s || !parsed.c || !parsed.n || !parsed.h) return null

    const reconstructed: VerifiedCertificate = {
      id: String(parsed.i),
      serialNumber: String(parsed.s),
      courseSlug: String(parsed.c),
      courseTitle: String(parsed.ct || 'متن علمي تأصيلي'),
      authorName: parsed.a ? String(parsed.a) : 'أحد أئمة العلم المصنفين',
      instructorName: parsed.in ? String(parsed.in) : 'نخبة من العلماء والشارحين المعتمدين',
      studentName: String(parsed.n),
      studentEmail: parsed.e ? String(parsed.e) : undefined,
      issuedAt: String(parsed.at),
      formattedDate: String(parsed.fd || ''),
      verificationHash: String(parsed.h),
      authorityTitle: 'إِدَارَةُ مَنَصَّةِ سَنَدٍ لِلتَّأْصِيلِ الشَّرْعِيِّ',
      committeeTitle: 'هَيْئَةُ الإِشْرَافِ وَضَبْطِ المَتُونِ العِلْمِيَّةِ',
      episodesCount: Number(parsed.ep) || 10,
      studyHoursEstimated: Number(parsed.hr) || 6,
      isRevoked: false,
      signedToken: token,
    }
    return reconstructed
  } catch {
    return null
  }
}

function readCertsFromFile(filePath: string): VerifiedCertificate[] {
  try {
    if (!fs.existsSync(filePath)) return []
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function ensureCertsFile(): VerifiedCertificate[] {
  const map = new Map<string, VerifiedCertificate>()

  for (const c of readCertsFromFile(CERTS_FILE)) {
    if (c && c.id) map.set(c.id.toLowerCase(), c)
  }
  for (const c of readCertsFromFile(TMP_CERTS_FILE)) {
    if (c && c.id) map.set(c.id.toLowerCase(), c)
  }
  for (const c of globalThis.__sanad_certificates_cache__ || []) {
    if (c && c.id) map.set(c.id.toLowerCase(), c)
  }

  const merged = Array.from(map.values()).map((c) => ({
    ...c,
    signedToken: c.signedToken || createSignedCertificateToken(c),
  }))
  globalThis.__sanad_certificates_cache__ = merged
  return merged
}

function saveCertsFile(certs: VerifiedCertificate[]) {
  globalThis.__sanad_certificates_cache__ = certs
  const payload = JSON.stringify(certs, null, 2)
  try {
    const dataDir = path.dirname(CERTS_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(CERTS_FILE, payload, 'utf-8')
  } catch {}
  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(TMP_CERTS_FILE, payload, 'utf-8')
  } catch {}
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
  const secretSalt = getCertSecret()
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
  const cleanEmail = params.studentEmail?.trim().toLowerCase()

  // البحث عما إذا كانت هناك إجازة مسبقة صادرة لنفس الطالب (بالبريد الإلكتروني أولاً ثم الاسم) والمتن
  const existingIdx = certs.findIndex((c) => {
    if (c.courseSlug !== cleanSlug || c.isRevoked) return false
    if (cleanEmail && c.studentEmail) {
      return c.studentEmail.trim().toLowerCase() === cleanEmail
    }
    return (
      !cleanEmail &&
      !c.studentEmail &&
      c.studentName.trim().toLowerCase() === cleanStudentName.toLowerCase()
    )
  })

  if (existingIdx >= 0) {
    const existing = certs[existingIdx]
    // إذا كان الطالب قد حدث اسمه الحقيقي بعد إجازة قديمة باسم «طالب العلم»، نحدّث الاسم والختم المشفر
    if (
      cleanStudentName !== 'طالب العلم' &&
      existing.studentName !== cleanStudentName
    ) {
      existing.studentName = cleanStudentName
      existing.verificationHash = generateCertificateHash(
        cleanStudentName,
        existing.courseSlug,
        existing.serialNumber,
        existing.issuedAt
      )
      existing.signedToken = createSignedCertificateToken(existing)
      saveCertsFile(certs)
      saveCertificateToCloud(existing as unknown as Record<string, unknown>).catch(() => {})
    }
    if (!existing.signedToken) {
      existing.signedToken = createSignedCertificateToken(existing)
    }
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
    studentEmail: cleanEmail,
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
  newCertificate.signedToken = createSignedCertificateToken(newCertificate)

  certs.unshift(newCertificate)
  saveCertsFile(certs)
  saveCertificateToCloud(newCertificate as unknown as Record<string, unknown>).catch(() => {})

  return newCertificate
}

/**
 * البحث عن إجازة موثقة بواسطة المعرف أو الرقم التسلسلي أو رمز التوثيق المشفر
 */
export function getCertificateById(
  idOrSerial: string,
  signedToken?: string | null
): VerifiedCertificate | null {
  if (signedToken) {
    const fromToken = verifySignedCertificateToken(signedToken)
    if (fromToken) {
      const certs = ensureCertsFile()
      if (!certs.some((c) => c.id.toLowerCase() === fromToken.id.toLowerCase())) {
        certs.unshift(fromToken)
        saveCertsFile(certs)
      }
      return fromToken
    }
  }
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
 * البحث غير المتزامن (يشمل السجل المحلي + /tmp + الذاكرة + رمز التوثيق المشفر + Cloud Firestore)
 */
export async function getCertificateByIdAsync(
  idOrSerial: string,
  signedToken?: string | null
): Promise<VerifiedCertificate | null> {
  const local = getCertificateById(idOrSerial, signedToken)
  if (local) return local

  try {
    const cloudData = await getCertificateFromCloud(idOrSerial)
    if (cloudData && cloudData.id && cloudData.serialNumber && cloudData.verificationHash) {
      const cert = cloudData as unknown as VerifiedCertificate
      cert.signedToken = cert.signedToken || createSignedCertificateToken(cert)
      const certs = ensureCertsFile()
      if (!certs.some((c) => c.id.toLowerCase() === cert.id.toLowerCase())) {
        certs.unshift(cert)
        saveCertsFile(certs)
      }
      return cert
    }
  } catch {}

  return null
}

/**
 * جلب كافة الإجازات العلمية الصادرة لطالب معين لعرضها في الكشكول وصفحة المتن
 */
export function getStudentCertificates(
  studentEmail?: string | null,
  studentName?: string | null
): VerifiedCertificate[] {
  const certs = ensureCertsFile()
  const cleanEmail = (studentEmail || '').trim().toLowerCase()
  const cleanName = (studentName || '').trim().toLowerCase()
  if (!cleanEmail && !cleanName) return []

  return certs.filter((c) => {
    if (c.isRevoked) return false
    if (cleanEmail && c.studentEmail && c.studentEmail.trim().toLowerCase() === cleanEmail) {
      return true
    }
    if (!c.studentEmail && cleanName && cleanName !== 'طالب العلم' && c.studentName.trim().toLowerCase() === cleanName) {
      return true
    }
    return false
  })
}

/**
 * نقل إجازات الطالب عند تغيير بريده الإلكتروني في الإعدادات
 */
export function migrateStudentCertificates(oldEmailRaw: string, newEmailRaw: string): number {
  const oldEmail = (oldEmailRaw || '').trim().toLowerCase()
  const newEmail = (newEmailRaw || '').trim().toLowerCase()
  if (!oldEmail || !newEmail || oldEmail === newEmail) return 0

  const certs = ensureCertsFile()
  let count = 0
  for (const c of certs) {
    if (c.studentEmail && c.studentEmail.trim().toLowerCase() === oldEmail) {
      c.studentEmail = newEmail
      c.signedToken = createSignedCertificateToken(c)
      count++
      saveCertificateToCloud(c as unknown as Record<string, unknown>).catch(() => {})
    }
  }
  if (count > 0) {
    saveCertsFile(certs)
  }
  return count
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
