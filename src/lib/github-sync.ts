import type { StudentActivityRecord, PlatformStats } from '@/lib/student-tracking'

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'bahaatarek20/Sanad'
const GITHUB_BRANCH = process.env.GITHUB_REF_NAME || 'main'
const GITHUB_TOKEN =
  process.env.GITHUB_SYNC_TOKEN ||
  process.env.GITHUB_TOKEN ||
  process.env.GH_TOKEN ||
  ''

interface GitHubFileContentResponse {
  sha: string
  content: string
  encoding: string
}

let syncQueue: StudentActivityRecord[] = []
let isSyncing = false

async function getFileFromGitHub(filePath: string): Promise<GitHubFileContentResponse | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Sanad-AutoSync',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as GitHubFileContentResponse
  } catch {
    return null
  }
}

async function updateFileOnGitHub(
  filePath: string,
  contentStr: string,
  sha: string,
  commitMessage: string
): Promise<boolean> {
  try {
    const b64Content = Buffer.from(contentStr, 'utf8').toString('base64')
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Sanad-AutoSync',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: b64Content,
        sha,
        branch: GITHUB_BRANCH,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function performGitHubPush(studentsToSync: StudentActivityRecord[]): Promise<boolean> {
  if (!GITHUB_TOKEN || studentsToSync.length === 0) return false

  const regFilePath = 'data/sanad_students_registry.json'
  const statsFilePath = 'data/sanad_platform_stats.json'

  const currentRegFile = await getFileFromGitHub(regFilePath)
  if (!currentRegFile || !currentRegFile.sha) {
    return false
  }

  let existingStudents: StudentActivityRecord[] = []
  try {
    const decoded = Buffer.from(currentRegFile.content, 'base64').toString('utf8')
    existingStudents = JSON.parse(decoded)
    if (!Array.isArray(existingStudents)) existingStudents = []
  } catch {
    return false
  }

  const existingEmails = new Set(existingStudents.map((s) => (s.email || '').toLowerCase().trim()))
  let addedAny = false
  const newlyAddedNames: string[] = []

  for (const newStudent of studentsToSync) {
    const cleanEmail = (newStudent.email || '').toLowerCase().trim()
    if (!cleanEmail) continue

    if (!existingEmails.has(cleanEmail)) {
      existingStudents.unshift(newStudent)
      existingEmails.add(cleanEmail)
      addedAny = true
      newlyAddedNames.push(newStudent.name || newStudent.scholarlyId || cleanEmail)
    }
  }

  if (!addedAny) {
    return true // كل الطلاب موجودون بالفعل في المستودع
  }

  const commitMsg =
    newlyAddedNames.length === 1
      ? `feat(registry): auto-registered new student ${newlyAddedNames[0]}`
      : `feat(registry): auto-registered ${newlyAddedNames.length} new students`

  const updatedContent = JSON.stringify(existingStudents, null, 2)
  const regOk = await updateFileOnGitHub(regFilePath, updatedContent, currentRegFile.sha, commitMsg)

  // تحديث عدادات المنصة لتتطابق مع الإجمالي الجديد
  const currentStatsFile = await getFileFromGitHub(statsFilePath)
  if (currentStatsFile && currentStatsFile.sha) {
    try {
      const decodedStats = Buffer.from(currentStatsFile.content, 'base64').toString('utf8')
      const stats = JSON.parse(decodedStats) as PlatformStats
      const regCount = existingStudents.length
      const unreg = stats.unregisteredVisitors || 8
      stats.totalRegisteredStudents = regCount
      stats.registeredVisitsCount = Math.max(stats.registeredVisitsCount || 0, regCount)
      stats.totalVisitors = Math.max(stats.totalVisitors || 0, regCount + unreg)
      stats.lastUpdated = new Date().toISOString()

      const statsContent = JSON.stringify(stats, null, 2)
      await updateFileOnGitHub(statsFilePath, statsContent, currentStatsFile.sha, `chore(stats): update baseline to ${regCount} students`).catch(() => {})
    } catch {}
  }

  return regOk
}

/**
 * دالة المزامنة التلقائية مع GitHub:
 * تُستدعى فورياً عند تسجيل أي طالب جديد لعمل Push مباشر للمستودع وتثبيته في المنصة للأبد
 */
export async function syncNewStudentToGitHub(student: StudentActivityRecord): Promise<boolean> {
  if (!student || !student.email) return false

  syncQueue.push(student)
  if (isSyncing) return true

  isSyncing = true
  try {
    while (syncQueue.length > 0) {
      const studentsToSync = [...syncQueue]
      syncQueue = []
      await performGitHubPush(studentsToSync)
    }
    return true
  } catch (err) {
    console.warn('[GitHub Auto-Sync] Warning:', err)
    return false
  } finally {
    isSyncing = false
  }
}
