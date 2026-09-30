'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  BookOpen,
  Users,
  Megaphone,
  Plus,
  Upload,
  Edit3,
  Trash2,
  ExternalLink,
  Search,
  Lock,
  Unlock,
  Check,
  AlertTriangle,
  FileDown,
  Volume2,
  Eye,
  EyeOff,
  Copy,
  LogOut,
  Sparkles,
  BarChart3,
  Clock,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Mail,
  History,
  Activity,
  Layers,
  FileText,
  UserCheck,
  ListOrdered,
  Link2,
  Play,
  Video,
  Ban,
  UserX,
  Hash,
  Folder,
  FolderUp,
  Files,
  FileVideo,
  RotateCcw,
  X,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react'
import { ALL_COURSES, CATEGORIES_LIST, MatnCourse, MatnEpisode } from '@/lib/curriculum-data'
import {
  loginAdminAction,
  logoutAdminAction,
  getAdminDashboardAction,
  deleteCommunityPostAdminAction,
  saveCourseAdminAction,
  deleteCourseAdminAction,
  moveCourseAdminAction,
  quickChangeCourseCategoryAdminAction,
  reorderCoursesAdminAction,
  saveBroadcastAdminAction,
  saveCategoryAdminAction,
  deleteCategoryAdminAction,
  toggleBanStudentAdminAction,
  resetVisitorCountAdminAction,
} from './actions'
import type { CategoryItem } from '@/lib/courses-store'
import type { StudentActivityRecord, PlatformStats, PlatformEvent } from '@/lib/student-tracking'
import {
  analyzeMatnStage,
  analyzeScienceDiscipline,
  generateSmartSlug,
  type MatnIntelligenceAnalysis,
  type ScienceIntelligenceAnalysis,
} from '@/lib/curriculum-intelligence'
import { cleanVideoTitle, cleanEpisodeDescription } from '@/lib/title-cleaner'

interface BroadcastNotice {
  active: boolean
  sender: string
  message: string
  subtext: string
  timestamp: string
}

interface ModerationPost {
  id: string
  user_id?: string
  anonymous_alias: string
  content: string
  course_slug?: string
  post_type: string
  upvotes_count: number
  created_at: string
}

interface BatchPreviewItem {
  file: File
  assignedNum: number
  title: string
  sizeFormatted: string
}

interface BatchUploadProgress {
  isUploading: boolean
  total: number
  current: number
  currentFileName: string
  percent: number
  successCount: number
  failCount: number
}

function formatEpisodeTitleFromFileName(fileName: string, episodeNum?: number): string {
  const cleaned = cleanVideoTitle(fileName)
  if (cleaned && !/^\d+$/.test(cleaned)) {
    return cleaned
  }
  return episodeNum ? `المجلس ${episodeNum}` : ''
}

function naturalSortVideoFiles(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const pathA = a.webkitRelativePath || a.name
    const pathB = b.webkitRelativePath || b.name
    return pathA.localeCompare(pathB, 'ar-u-kn-true', { numeric: true, sensitivity: 'base' })
  })
}

async function extractFilesFromDataTransfer(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = []
  const queue: any[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (typeof item.webkitGetAsEntry === 'function') {
      const entry = item.webkitGetAsEntry()
      if (entry) queue.push(entry)
    } else {
      const f = item.getAsFile()
      if (f) files.push(f)
    }
  }

  const readRecursively = async (entry: any): Promise<void> => {
    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file(
          (f: File) => {
            files.push(f)
            resolve()
          },
          () => resolve()
        )
      })
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      const readBatch = (): Promise<void> => {
        return new Promise<void>((resolve) => {
          reader.readEntries(
            async (entries: any[]) => {
              if (entries.length === 0) {
                resolve()
              } else {
                for (const child of entries) {
                  await readRecursively(child)
                }
                await readBatch()
                resolve()
              }
            },
            () => resolve()
          )
        })
      }
      await readBatch()
    }
  }

  for (const entry of queue) {
    await readRecursively(entry)
  }

  return files
}

export default function SanadControlGatePage() {
  const [isPending, startTransition] = useTransition()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sanad_is_platform_owner') === 'true'
    }
    return false
  })
  const [isInitialChecking, setIsInitialChecking] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sanad_is_platform_owner') !== 'true'
    }
    return true
  })

  // تسجيل الدخول
  const [passcodeInput, setPasscodeInput] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null)

  // التبويب النشط (بما فيها المستشار التأصيلي الذكي للمتون والفنون)
  const [activeTab, setActiveTab] = useState<'analytics' | 'courses' | 'categories' | 'intelligence' | 'moderation' | 'broadcast'>('analytics')

  // محرك فحص واستكشاف المتون والفنون الذكي
  const [intelligenceQuery, setIntelligenceQuery] = useState('')
  const [intelligenceType, setIntelligenceType] = useState<'matn' | 'science'>('matn')

  // بيانات التتبع والإحصائيات
  const [students, setStudents] = useState<StudentActivityRecord[]>([])
  const [stats, setStats] = useState<PlatformStats>({
    totalVisitors: 0,
    totalRegisteredStudents: 0,
    totalStudyMinutes: 0,
    totalNotesCount: 0,
    totalCompletedCoursesCount: 0,
    lastUpdated: new Date().toISOString(),
  })
  const [recentEvents, setRecentEvents] = useState<PlatformEvent[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentActivityRecord | null>(null)
  const [banModalStudent, setBanModalStudent] = useState<StudentActivityRecord | null>(null)
  const [banReasonInput, setBanReasonInput] = useState('حظر إداري بقرار من المشرف العام')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isBanningPending, setIsBanningPending] = useState(false)

  // قائمة المقررات والمتون
  const [courses, setCourses] = useState<MatnCourse[]>(ALL_COURSES)
  const [courseSearch, setCourseSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState<'all' | '1' | '2' | '3'>('all')

  // قائمة الفنون والتصنيفات الشرعية المعتمدة
  const [categories, setCategories] = useState<CategoryItem[]>(CATEGORIES_LIST)
  const [categorySearch, setCategorySearch] = useState('')
  const [editingCategory, setEditingCategory] = useState<{
    slug: string
    title: string
    isNew: boolean
    oldSlug?: string
    oldTitle?: string
  } | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({ slug: '', title: '' })
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  // نموذج إضافة / تعديل متن
  const [editingCourse, setEditingCourse] = useState<MatnCourse | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<MatnCourse>>({
    title: '',
    slug: '',
    category: 'الحديث النبوي ومصطلحه',
    categorySlug: 'hadith',
    instructor: '',
    author: '',
    stage: 1,
    youtubeId: '',
    videoUrl: '',
    isPlaylist: true,
    reversePlaylist: false,
    totalLessons: 10,
    pdfUrl: '',
    audioUrl: '',
    description: '',
    episodes: [],
    prerequisites: [],
    nextCourses: [],
    pedagogicalRole: '',
  })

  // رفع وإدارة ملفات الـ PDF من اللابتوب
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState<string | null>(null)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)
  const [pdfInputMode, setPdfInputMode] = useState<'upload' | 'url'>('upload')
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف بصيغة PDF فقط.')
      return
    }

    setIsUploadingPdf(true)
    setPdfUploadError(null)

    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(file.name),
          'content-type': file.type || 'application/pdf',
        },
        body: file,
      })

      const json = await res.json()
      if (json.success && json.url) {
        setFormData((prev) => ({ ...prev, pdfUrl: json.url }))
        setPdfUploadSuccess(`تم رفع ملف «${file.name}» (${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت) بنجاح وحفظه في المنصة!`)
        setTimeout(() => setPdfUploadSuccess(null), 6000)
      } else {
        setPdfUploadError(json.error || 'تعذر رفع الملف.')
      }
    } catch {
      setPdfUploadError('حدث خطأ في الاتصال أثناء رفع الملف.')
    } finally {
      setIsUploadingPdf(false)
      if (pdfFileInputRef.current) {
        pdfFileInputRef.current.value = ''
      }
    }
  }

  // رفع وإدارة ملفات الفيديو من اللابتوب للمتن
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUploadSuccess, setVideoUploadSuccess] = useState<string | null>(null)
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null)
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'youtube'>('upload')
  const videoFileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingEpisodeIndex, setUploadingEpisodeIndex] = useState<number | null>(null)

  // دالة الرفع المباشر الأحادي فائق السرعة عبر الدفق (Direct High-Speed Stream)
  // مخصصة للعمل محلياً عبر اللابتوب مباشرة بدون إنترنت وبسرعة كتابة القرص الصلب (ثوانٍ معدودة)
  const uploadVideoDirectStream = (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload-video', true)
      xhr.withCredentials = true
      xhr.setRequestHeader('x-sanad-admin-key', 'bahaa-sanad-owner')
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name))
      xhr.setRequestHeader('content-type', 'application/octet-stream')

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100))
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            if (onProgress) onProgress(100)
            resolve({ success: true, url: data.url })
          } catch {
            resolve({ success: false, error: 'استجابة غير صالحة من خادم الرفع.' })
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText)
            resolve({ success: false, error: errData.error || `خطأ استجابة (${xhr.status})` })
          } catch {
            resolve({ success: false, error: `فشل الرفع برمز (${xhr.status})` })
          }
        }
      }

      xhr.onerror = () => {
        resolve({ success: false, error: 'تعذر الاتصال بخادم الرفع المباشر.' })
      }

      xhr.ontimeout = () => {
        resolve({ success: false, error: 'تجاوزت العملية الوقت المسموح به.' })
      }

      xhr.send(file)
    })
  }

  // دالة الرفع الذكية (تحاول الدفق المباشر فائق السرعة أولاً، ثم التجزئة كاحتياط)
  const uploadVideoFileInChunks = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    // 1. محاولة الدفق المباشر الأحادي فائق السرعة أولاً (سرعة نقل الذاكرة والقرص للابتوب في ثوانٍ معدودة)
    try {
      const directResult = await uploadVideoDirectStream(file, onProgress)
      if (directResult.success && directResult.url) {
        return directResult
      }
      console.warn('⚠️ [Direct Stream Notice]:', directResult.error)
    } catch (e) {
      console.warn('⚠️ [Direct Stream Exception]:', e)
    }

    // 2. نظام التجزئة الاحتياطي في حال فرض حدود حجم من متصفح أو جدار ناري
    let CHUNK_SIZE = 32 * 1024 * 1024 // 32 ميجابايت للأجزاء الكبيرة
    if (file.size <= 32 * 1024 * 1024) {
      CHUNK_SIZE = 32 * 1024 * 1024
    } else if (file.size <= 200 * 1024 * 1024) {
      CHUNK_SIZE = 32 * 1024 * 1024
    } else {
      CHUNK_SIZE = 48 * 1024 * 1024
    }

    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE))
    const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(file.size, start + CHUNK_SIZE)
      const chunkBlob = file.slice(start, end)

      let chunkSuccess = false
      let lastErr = 'فشل رفع جزء من الفيديو'

      // إعادة محاولة ذكية (تلقائياً حتى 3 مرات) لتفادي أي انقطاع لحظي في الاتصال
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('/api/upload-video', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'x-file-name': encodeURIComponent(file.name),
              'x-chunk-index': i.toString(),
              'x-total-chunks': totalChunks.toString(),
              'x-upload-id': uploadId,
              'x-sanad-admin-key': 'bahaa-sanad-owner',
              'content-type': 'application/octet-stream',
            },
            body: chunkBlob,
          })

          if (res.ok) {
            const data = await res.json()
            if (i < totalChunks - 1) {
              if (onProgress) {
                onProgress(Math.round(((i + 1) / totalChunks) * 100))
              }
            } else {
              if (onProgress) onProgress(100)
              return { success: true, url: data.url }
            }
            chunkSuccess = true
            break
          } else {
            const errJson = await res.json().catch(() => ({}))
            lastErr = errJson.error || `خطأ استجابة (${res.status})`
          }
        } catch (fetchErr) {
          lastErr = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        }

        // انتظار قصير قبل إعادة المحاولة
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }

      if (!chunkSuccess) {
        return { success: false, error: lastErr }
      }
    }

    return { success: false, error: 'حدث خطأ غير متوقع أثناء الرفع' }
  }

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingVideo(true)
    setVideoUploadError(null)

    try {
      const result = await uploadVideoFileInChunks(file)
      if (result.success && result.url) {
        setFormData((prev) => ({
          ...prev,
          videoUrl: result.url,
          youtubeId: prev.youtubeId || result.url,
          isPlaylist: false,
        }))
        setVideoUploadSuccess(`تم رفع الفيديو «${file.name}» (${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت) بنجاح وحفظه في المنصة!`)
        setTimeout(() => setVideoUploadSuccess(null), 6000)
      } else {
        setVideoUploadError(result.error || 'تعذر رفع الفيديو.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setVideoUploadError(`حدث خطأ في الاتصال أثناء رفع الفيديو: ${msg}`)
    } finally {
      setIsUploadingVideo(false)
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = ''
      }
    }
  }

  const handleEpisodeVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, epIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingEpisodeIndex(epIndex)

    try {
      const result = await uploadVideoFileInChunks(file)
      if (result.success && result.url) {
        handleSetEpisodeVideo(epIndex, result.url, file.name)
        alert(`تم رفع فيديو المجلس ${epIndex + 1} بنجاح (${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت) كاملًا بدون بتر!\nتأكد من الضغط على زر «حفظ وتأكيد التعديلات» بالأسفل لتثبيته في المتن.`)
      } else {
        alert(result.error || 'تعذر رفع فيديو المجلس.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`حدث خطأ أثناء رفع ملف الفيديو: ${msg}`)
    } finally {
      setUploadingEpisodeIndex(null)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  // إدارة وتفريع مجالس المتن وروابطها
  const [editingEpisodesCourse, setEditingEpisodesCourse] = useState<MatnCourse | null>(null)
  const [courseEpisodesList, setCourseEpisodesList] = useState<MatnEpisode[]>([])
  const [isSavingEpisodes, setIsSavingEpisodes] = useState(false)
  const [episodesSavedSuccess, setEpisodesSavedSuccess] = useState(false)

  // رفع وإدارة مجلد كامل للفيديوهات مع الترتيب التسلسلي التلقائي
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const multipleVideosInputRef = useRef<HTMLInputElement | null>(null)
  const isBatchCancelledRef = useRef<boolean>(false)
  const [isDraggingFolder, setIsDraggingFolder] = useState(false)
  const [batchPreviewModal, setBatchPreviewModal] = useState<{
    items: BatchPreviewItem[]
    mode: 'replace' | 'append'
  } | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress | null>(null)

  // الإشراف على المجتمع
  const [moderationPosts, setModerationPosts] = useState<ModerationPost[]>([])
  const [bannedUserIds, setBannedUserIds] = useState<string[]>([])

  // الإعلان الإداري
  const [broadcast, setBroadcast] = useState<BroadcastNotice>({
    active: false,
    sender: 'المهندس بهاء طارق || إدارة سَنَد',
    message: '',
    subtext: 'تنبيه وإشعار عام لجميع طلاب المنصة.',
    timestamp: '',
  })
  const [broadcastSavedNotice, setBroadcastSavedNotice] = useState(false)

  // جلب بيانات لوحة التحكم من السيرفر (بما فيها المتون والإعلانات والفنون المعتمدة على مستوى المنصة كاملة)
  const refreshDashboardData = async () => {
    try {
      const res = await getAdminDashboardAction()
      if (res.success && res.students && res.stats) {
        setIsAuthenticated(true)
        setStudents(res.students)
        setStats(res.stats)
        if (res.recentEvents) {
          setRecentEvents(res.recentEvents)
        }
        if (res.courses && res.courses.length > 0) {
          setCourses(res.courses)
        }
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories)
        }
        if (res.broadcast) {
          setBroadcast(res.broadcast)
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('sanad_is_platform_owner', 'true')
        }
      } else {
        // حماية المشرف: إذا كان المستخدم يرفع ملفات حالياً أو كان مسجلاً بالفعل، لا تلغِ تسجيل دخوله
        if (typeof window !== 'undefined' && localStorage.getItem('sanad_is_platform_owner') === 'true') {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      }
    } catch {
      if (typeof window !== 'undefined' && localStorage.getItem('sanad_is_platform_owner') === 'true') {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } finally {
      setIsInitialChecking(false)
    }
  }

  // 1. حماية صارمة تمنع مغادرة أو إعادة تحميل الصفحة طالما توجد ملفات فيديو قيد الرفع
  useEffect(() => {
    const isBusyUploading = isUploadingVideo || Boolean(batchProgress?.isUploading) || uploadingEpisodeIndex !== null
    if (!isBusyUploading) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'تنبيه أمني: يوجد مقاطع فيديو قيد الرفع حالياً، إغلاق الصفحة أو إعادة تحميلها سيؤدي لإلغاء الرفع.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploadingVideo, batchProgress?.isUploading, uploadingEpisodeIndex])

  // 2. نبض الحفاظ على نشاط الجلسة (Session Keep-Alive Heartbeat) لتجديد الجلسة تلقائياً في الخلفية
  useEffect(() => {
    if (!isAuthenticated) return

    const heartbeatTimer = setInterval(async () => {
      try {
        await fetch('/api/admin-heartbeat', {
          method: 'POST',
          headers: {
            'x-sanad-admin-key': 'bahaa-sanad-owner',
          },
          credentials: 'include',
        })
      } catch {}
    }, 2 * 60 * 1000)

    return () => clearInterval(heartbeatTimer)
  }, [isAuthenticated])

  useEffect(() => {
    refreshDashboardData()

    // استعادة قائمة المحظورين
    try {
      const storedBans = localStorage.getItem('sanad_banned_users')
      if (storedBans) {
        setBannedUserIds(JSON.parse(storedBans))
      }
    } catch (err) {
      console.error('Error restoring local custom items:', err)
    }
  }, [])

  // معالجة تسجيل الدخول الآمن عبر Server Action
  const handleServerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthErrorMessage(null)
    setLockoutMinutes(null)

    const fd = new FormData()
    fd.append('passcode', passcodeInput)

    startTransition(async () => {
      const res = await loginAdminAction(fd)
      if (res.success) {
        setIsAuthenticated(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('sanad_is_platform_owner', 'true')
          if (res.token) {
            localStorage.setItem('sanad_admin_gate_token', res.token)
          }
        }
        setPasscodeInput('')
        await refreshDashboardData()
      } else {
        setAuthErrorMessage(res.message)
        if (res.remainingMinutes) {
          setLockoutMinutes(res.remainingMinutes)
        }
      }
    })
  }

  // تصفير أو تصحيح عداد الزيارات
  const handleResetVisitorCount = () => {
    if (window.confirm('هل ترغب في تصفير عداد زوار المنصة للبدء من جديد؟\n(علماً بأن زياراتك كصاحب للمنصة أصبحت مستثناة تلقائياً ولن تُحتسب مطلقاً)')) {
      startTransition(async () => {
        const res = await resetVisitorCountAdminAction(0)
        if (res.success) {
          setStats((prev) => ({ ...prev, totalVisitors: res.totalVisitors }))
        }
      })
    }
  }

  // تسجيل الخروج
  const handleServerLogout = () => {
    startTransition(async () => {
      await logoutAdminAction()
      setIsAuthenticated(false)
    })
  }

  // دوال إدارة الفنون والتصنيفات الشرعية
  const handleOpenAddCategory = () => {
    setEditingCategory({ slug: '', title: '', isNew: true })
    setCategoryFormData({ slug: '', title: '' })
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory({
      slug: cat.slug,
      title: cat.title,
      isNew: false,
      oldSlug: cat.slug,
      oldTitle: cat.title,
    })
    setCategoryFormData({ slug: cat.slug, title: cat.title })
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryFormData.title.trim() || !categoryFormData.slug.trim()) return

    setIsSavingCategory(true)
    startTransition(async () => {
      try {
        const res = await saveCategoryAdminAction({
          slug: categoryFormData.slug.trim(),
          title: categoryFormData.title.trim(),
          oldSlug: editingCategory?.oldSlug,
          oldTitle: editingCategory?.oldTitle,
        })
        if (res.success && res.categories) {
          setCategories(res.categories)
          // تحديث الفن تلقائياً في نموذج المتن في حال كان مفتوحاً
          setFormData((prev) => ({
            ...prev,
            categorySlug: categoryFormData.slug.trim(),
            category: categoryFormData.title.trim(),
          }))
          if (res.courses) {
            setCourses(res.courses)
            try {
              localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
            } catch {}
          }
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
          alert('تم حفظ وتحديث الفن الشرعي وتعميم التعديل على كافة المتون في المنصة بنجاح!')
        } else {
          alert(res.error || 'تعذر حفظ الفن الشرعي. تأكد من صلاحيات المشرف.')
        }
      } catch {
        alert('حدث خطأ أثناء حفظ الفن الشرعي في الخادم.')
      } finally {
        setIsSavingCategory(false)
      }
    })
  }

  const handleDeleteCategory = (cat: CategoryItem) => {
    const coursesInCat = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
    const msg = coursesInCat > 0
      ? `تنبيه: يوجد ${coursesInCat} متناً مرتبطاً بفن «${cat.title}»!\nهل أنت متأكد من رغبتك في حذف هذا الفن من قائمة الفنون؟`
      : `هل أنت متأكد من حذف فن «${cat.title}» نهائياً؟`
    if (!confirm(msg)) return

    startTransition(async () => {
      try {
        const res = await deleteCategoryAdminAction(cat.slug)
        if (res.success && res.categories) {
          setCategories(res.categories)
          alert('تم حذف الفن الشرعي بنجاح!')
        } else {
          alert(res.error || 'تعذر حذف الفن الشرعي.')
        }
      } catch {
        alert('حدث خطأ أثناء حذف الفن الشرعي.')
      }
    })
  }

  // حفظ التعديلات على المتون مع التحديث الفوري المباشر للمنصة
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.slug || (!formData.youtubeId && !formData.videoUrl)) return

    const selectedCategory = categories.find((c) => c.slug === formData.categorySlug) || CATEGORIES_LIST.find((c) => c.slug === formData.categorySlug)
    const categoryTitle = selectedCategory ? selectedCategory.title : formData.category || 'عام'

    // تنظيف معرف يوتيوب واستخراج الـ ID الصافي إذا تم لصق رابط كامل أو استخدام رابط الفيديو المرفوع
    let cleanYoutubeId = (formData.youtubeId || formData.videoUrl || '').trim()
    if (cleanYoutubeId.includes('list=')) {
      const m = cleanYoutubeId.match(/list=([a-zA-Z0-9_-]+)/)
      if (m) cleanYoutubeId = m[1]
    } else if (cleanYoutubeId.includes('youtu.be/')) {
      const m = cleanYoutubeId.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      if (m) cleanYoutubeId = m[1]
    } else if (cleanYoutubeId.includes('watch?v=' || cleanYoutubeId.includes('v='))) {
      const m = cleanYoutubeId.match(/[?&]v=([a-zA-Z0-9_-]+)/)
      if (m) cleanYoutubeId = m[1]
    }

    const isPlaylistDetected = cleanYoutubeId.startsWith('PL') || formData.isPlaylist

    const updatedCourse: MatnCourse = {
      slug: formData.slug.trim(),
      title: formData.title.trim(),
      category: categoryTitle,
      categorySlug: formData.categorySlug || 'hadith',
      instructor: formData.instructor?.trim() || 'نخبة من العلماء والشارحين',
      author: formData.author?.trim() || undefined,
      stage: (Number(formData.stage) as 1 | 2 | 3) || 1,
      youtubeId: cleanYoutubeId,
      videoUrl: formData.videoUrl ? formData.videoUrl.trim().replace(/[\/\\]+$/, '') : undefined,
      isPlaylist: Boolean(isPlaylistDetected),
      reversePlaylist: Boolean(formData.reversePlaylist),
      totalLessons: Number(formData.totalLessons) || 1,
      pdfUrl: formData.pdfUrl?.trim() || undefined,
      audioUrl: formData.audioUrl?.trim() || undefined,
      description: formData.description?.trim() || '',
      prerequisites: formData.prerequisites || [],
      nextCourses: formData.nextCourses || [],
      pedagogicalRole: formData.pedagogicalRole?.trim() || undefined,
      episodes: (formData.episodes || []).map((ep) => ({
        ...ep,
        youtubeUrl: (ep.youtubeUrl || '').trim().replace(/[\/\\]+$/, ''),
        videoUrl: (ep.videoUrl || ep.youtubeUrl || '').trim().replace(/[\/\\]+$/, ''),
      })),
    }

    startTransition(async () => {
      const res = await saveCourseAdminAction(updatedCourse, editingCourse?.slug)
      if (res.success && res.courses) {
        setCourses(res.courses)
        try {
          localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
          localStorage.setItem('sanad_data_version', 'sanad_courses_v9_stages_balanced')
        } catch {}
        alert('تم حفظ المتن وتحديثه في المنصة كاملة بنجاح!')
      } else {
        alert(res.error || 'تعذر حفظ المتن في الخادم. تأكد من جلسة الإدارة.')
      }
    })

    setIsModalOpen(false)
    setEditingCourse(null)
  }

  const handleEditClick = (course: MatnCourse) => {
    setEditingCourse(course)
    setFormData({
      ...course,
      author: course.author || '',
      stage: (course.stage as 1 | 2 | 3) || 1,
      reversePlaylist: Boolean(course.reversePlaylist),
      videoUrl: course.videoUrl || '',
      prerequisites: course.prerequisites || [],
      nextCourses: course.nextCourses || [],
      pedagogicalRole: course.pedagogicalRole || '',
      episodes: course.episodes && course.episodes.length > 0 ? [...course.episodes] : [],
    })
    setVideoInputMode(course.videoUrl ? 'upload' : 'youtube')
    setIsModalOpen(true)
  }

  const handleAddNewClick = () => {
    setEditingCourse(null)
    setFormData({
      title: '',
      slug: `matn-${Date.now().toString(36)}`,
      category: 'الحديث النبوي ومصطلحه',
      categorySlug: 'hadith',
      instructor: '',
      author: '',
      stage: 1,
      youtubeId: '',
      videoUrl: '',
      isPlaylist: false,
      reversePlaylist: false,
      totalLessons: 10,
      pdfUrl: '',
      audioUrl: '',
      description: '',
      episodes: [],
      prerequisites: [],
      nextCourses: [],
      pedagogicalRole: '',
    })
    setVideoInputMode('upload')
    setIsModalOpen(true)
  }

  // دوال إدارة وتفريع مجالس المتن وروابطها الفردية
  const handleOpenEpisodesModal = (course: MatnCourse) => {
    setEditingEpisodesCourse(course)
    const episodes = (course.episodes && course.episodes.length > 0 ? JSON.parse(JSON.stringify(course.episodes)) : []).map((ep: MatnEpisode) => ({
      ...ep,
      title: ep.title || '',
      description: ep.description || '',
    }))
    setCourseEpisodesList(episodes)
    setEpisodesSavedSuccess(false)
  }

  const handleAddEpisodeItem = () => {
    const nextNum = courseEpisodesList.length + 1
    const newEp: MatnEpisode = {
      episodeNum: nextNum,
      title: '',
      youtubeUrl: '',
      audioUrl: '',
      description: '',
    }
    setCourseEpisodesList((prev) => [...prev, newEp])
  }

  const handleAutoFillEpisodes = () => {
    if (!editingEpisodesCourse) return
    const targetCount = editingEpisodesCourse.totalLessons || 10
    const list: MatnEpisode[] = []
    for (let i = 1; i <= targetCount; i++) {
      const existing = courseEpisodesList.find((e) => e.episodeNum === i)
      if (existing) {
        list.push({
          ...existing,
          title: existing.title || '',
          description: existing.description || '',
        })
      } else {
        list.push({
          episodeNum: i,
          title: '',
          youtubeUrl: '',
          audioUrl: '',
          description: '',
        })
      }
    }
    setCourseEpisodesList(list)
  }

  const handleRemoveEpisodeItem = (index: number) => {
    const updated = courseEpisodesList
      .filter((_, idx) => idx !== index)
      .map((ep, idx) => ({
        ...ep,
        episodeNum: idx + 1,
      }))
    setCourseEpisodesList(updated)
  }

  const handleUpdateEpisodeField = (index: number, field: keyof MatnEpisode, value: string) => {
    setCourseEpisodesList((prev) => {
      const updated = [...prev]
      if (!updated[index]) return prev
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
      return updated
    })
  }

  const handleSetEpisodeVideo = (index: number, videoUrl: string, fileName?: string) => {
    const cleanUrl = (videoUrl || '').trim().replace(/[\/\\]+$/, '')
    setCourseEpisodesList((prev) => {
      const updated = [...prev]
      if (!updated[index]) return prev
      const currentTitle = updated[index].title?.trim() || ''
      // إذا كان للمجلس عنوان مكتوب مسبقاً، نحافظ عليه كما هو دون أي تغيير
      const newTitle = currentTitle && !/^المجلس\s*\d+$/i.test(currentTitle)
        ? currentTitle
        : (fileName ? cleanVideoTitle(fileName) : currentTitle)

      updated[index] = {
        ...updated[index],
        youtubeUrl: cleanUrl,
        videoUrl: cleanUrl,
        title: newTitle,
        description: updated[index].description || (fileName ? `فيديو مرفوع: ${cleanVideoTitle(fileName)}` : ''),
      }
      return updated
    })
  }

  // دوال إعادة ترتيب المجالس (تقديم / تأخير / نقل لموضع / ترتيب ذكي / عكس)
  const handleMoveEpisode = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= courseEpisodesList.length) return
    const list = [...courseEpisodesList]
    const temp = list[index]
    list[index] = list[targetIdx]
    list[targetIdx] = temp
    const reindexed = list.map((ep, idx) => ({
      ...ep,
      episodeNum: idx + 1,
    }))
    setCourseEpisodesList(reindexed)
  }

  const handleMoveEpisodeToPosition = (fromIndex: number, targetNum: number) => {
    const targetIdx = Math.max(0, Math.min(courseEpisodesList.length - 1, targetNum - 1))
    if (fromIndex === targetIdx) return
    const list = [...courseEpisodesList]
    const [movedItem] = list.splice(fromIndex, 1)
    list.splice(targetIdx, 0, movedItem)
    const reindexed = list.map((ep, idx) => ({
      ...ep,
      episodeNum: idx + 1,
    }))
    setCourseEpisodesList(reindexed)
  }

  const handleReverseEpisodesOrder = () => {
    if (courseEpisodesList.length <= 1) return
    const reversed = [...courseEpisodesList].reverse().map((ep, idx) => ({
      ...ep,
      episodeNum: idx + 1,
    }))
    setCourseEpisodesList(reversed)
  }

  const handleSortEpisodesNaturally = () => {
    if (courseEpisodesList.length <= 1) return
    const sorted = [...courseEpisodesList].sort((a, b) => {
      const titleA = a.title || ''
      const titleB = b.title || ''
      return titleA.localeCompare(titleB, 'ar-u-kn-true', { numeric: true, sensitivity: 'base' })
    }).map((ep, idx) => ({
      ...ep,
      episodeNum: idx + 1,
    }))
    setCourseEpisodesList(sorted)
  }

  // إعادة ترتيب ملفات الفيديو أثناء المعاينة قبل بدء الرفع الجماعي
  const handleMoveBatchItem = (index: number, direction: 'up' | 'down') => {
    if (!batchPreviewModal) return
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= batchPreviewModal.items.length) return
    const items = [...batchPreviewModal.items]
    const temp = items[index]
    items[index] = items[targetIdx]
    items[targetIdx] = temp
    const updated = items.map((item, idx) => ({
      ...item,
      assignedNum: idx + 1,
    }))
    setBatchPreviewModal({ ...batchPreviewModal, items: updated })
  }

  const handleIncomingVideoFiles = (rawFiles: File[]) => {
    const videoExts = [
      '.mp4', '.m4v', '.webm', '.mov', '.mkv', '.avi', '.wmv', '.flv',
      '.ts', '.3gp', '.ogv', '.ogg', '.mpg', '.mpeg', '.m2ts', '.mts',
      '.vob', '.divx', '.f4v', '.asf', '.rm', '.rmvb'
    ]
    const validVideoFiles = rawFiles.filter((f) => {
      const lower = f.name.toLowerCase()
      return f.type.startsWith('video/') || videoExts.some((ext) => lower.endsWith(ext))
    })

    if (validVideoFiles.length === 0) {
      alert('لم يتم العثور على أي ملفات فيديو صالحة في المجلد أو الملفات المحددة.')
      return
    }

    const sorted = naturalSortVideoFiles(validVideoFiles)
    const existingCount = courseEpisodesList.length

    const items: BatchPreviewItem[] = sorted.map((file, idx) => ({
      file,
      assignedNum: idx + 1,
      title: formatEpisodeTitleFromFileName(file.name, idx + 1),
      sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + ' ميجابايت',
    }))

    setBatchPreviewModal({
      items,
      mode: existingCount > 0 ? 'replace' : 'replace',
    })
  }

  const handleStartBatchUpload = async () => {
    if (!batchPreviewModal || batchPreviewModal.items.length === 0) return
    const { items, mode } = batchPreviewModal
    setBatchPreviewModal(null)

    isBatchCancelledRef.current = false

    const existingList = mode === 'replace' ? [] : [...courseEpisodesList]
    const baseOffset = existingList.length

    const newGeneratedEpisodes: MatnEpisode[] = items.map((item, idx) => ({
      episodeNum: baseOffset + idx + 1,
      title: item.title,
      youtubeUrl: '',
      videoUrl: '',
      audioUrl: '',
      description: item.file.name ? `فيديو مرفوع من المجلد: ${cleanVideoTitle(item.file.name)}` : '',
    }))

    const initialCombined = [...existingList, ...newGeneratedEpisodes]
    setCourseEpisodesList(initialCombined)
    setEditingEpisodesCourse((prev) =>
      prev
        ? {
            ...prev,
            totalLessons: initialCombined.length > 0 ? initialCombined.length : (prev.totalLessons || 1),
          }
        : null
    )

    setBatchProgress({
      isUploading: true,
      total: items.length,
      current: 0,
      currentFileName: items[0].file.name,
      percent: 0,
      successCount: 0,
      failCount: 0,
    })

    let successfulUploads = 0
    let failedUploads = 0

    for (let i = 0; i < items.length; i++) {
      if (isBatchCancelledRef.current) {
        break
      }

      const item = items[i]
      const epTargetIndex = baseOffset + i

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              current: i + 1,
              currentFileName: item.file.name,
              percent: Math.round((i / items.length) * 100),
            }
          : null
      )

      try {
        const result = await uploadVideoFileInChunks(item.file, (chunkPercent) => {
          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  percent: Math.min(99, Math.round(((i + (chunkPercent / 100)) / items.length) * 100)),
                }
              : null
          )
        })

        if (result.success && result.url) {
          successfulUploads++
          handleSetEpisodeVideo(epTargetIndex, result.url)
        } else {
          failedUploads++
          console.error(`Failed to upload ${item.file.name}:`, result.error)
        }
      } catch (err) {
        failedUploads++
        console.error(`Network error uploading ${item.file.name}:`, err)
      }

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              percent: Math.round(((i + 1) / items.length) * 100),
              successCount: successfulUploads,
              failCount: failedUploads,
            }
          : null
      )
    }

    setBatchProgress((prev) =>
      prev
        ? {
            ...prev,
            isUploading: false,
            percent: 100,
            successCount: successfulUploads,
            failCount: failedUploads,
          }
        : null
    )

    if (successfulUploads > 0) {
      alert(`🎉 تم بنجاح رفع وترتيب ${successfulUploads} مجلساً بالتسلسل الصحيح!\n\nيرجى مراجعة المجالس والضغط على «حفظ مجالس المتن» لتثبيتها فوراً في المنصة.`)
    }
  }

  const handleCancelBatchUpload = () => {
    isBatchCancelledRef.current = true
    setBatchProgress((prev) => (prev ? { ...prev, isUploading: false } : null))
  }

  const handleSaveEpisodes = () => {
    if (!editingEpisodesCourse) return
    setIsSavingEpisodes(true)
    const sanitizedEpisodes = courseEpisodesList.map((ep) => ({
      ...ep,
      title: ep.title ? ep.title.trim() : '',
      description: ep.description ? ep.description.trim() : '',
      youtubeUrl: (ep.youtubeUrl || '').trim().replace(/[\/\\]+$/, ''),
      videoUrl: (ep.videoUrl || ep.youtubeUrl || '').trim().replace(/[\/\\]+$/, ''),
    }))
    const updatedCourse: MatnCourse = {
      ...editingEpisodesCourse,
      totalLessons: sanitizedEpisodes.length > 0 ? sanitizedEpisodes.length : (editingEpisodesCourse.totalLessons || 1),
      episodes: sanitizedEpisodes,
    }

    startTransition(async () => {
      try {
        const res = await saveCourseAdminAction(updatedCourse)
        if (res.success && res.courses) {
          setCourses(res.courses)
          setEditingEpisodesCourse(updatedCourse)
          setEpisodesSavedSuccess(true)
          try {
            localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
            localStorage.setItem('sanad_data_version', 'sanad_courses_v9_stages_balanced')
          } catch {}
          setTimeout(() => {
            setEpisodesSavedSuccess(false)
            setEditingEpisodesCourse(null)
          }, 1500)
        } else {
          alert(res.error || 'تعذر حفظ مجالس المتن. يرجى التأكد من كلمة مرور الإدارة.')
        }
      } catch {
        alert('حدث خطأ أثناء حفظ مجالس المتن في الخادم.')
      } finally {
        setIsSavingEpisodes(false)
      }
    })
  }

  const handleDeleteCourse = (slug: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المتن من قائمة المنصة نهائياً؟')) return
    startTransition(async () => {
      const res = await deleteCourseAdminAction(slug)
      if (res.success && res.courses) {
        setCourses(res.courses)
        try {
          localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
        } catch {}
        alert('تم حذف المتن بنجاح وتحديث المنصة كاملة!')
      } else {
        alert(res.error || 'تعذر حذف المتن.')
      }
    })
  }

  // تبديل وتقديم أو تأخير المتن في الفهرس والمسار التأصيلي
  const handleMoveCourse = (slug: string, direction: 'up' | 'down') => {
    const idx = courses.findIndex((c) => c.slug === slug)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= courses.length) return

    // تحديث متفائل فوري للواجهة
    const newCourses = [...courses]
    const temp = newCourses[idx]
    newCourses[idx] = newCourses[targetIdx]
    newCourses[targetIdx] = temp
    setCourses(newCourses)

    startTransition(async () => {
      const res = await moveCourseAdminAction(slug, direction)
      if (res.success && res.courses) {
        setCourses(res.courses)
        try {
          localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
        } catch {}
      } else {
        alert(res.error || 'تعذر تغيير ترتيب المتن.')
        await refreshDashboardData()
      }
    })
  }

  // تغيير الفن الشرعي لمتن معين فوراً من جدول المتون
  const handleQuickChangeCourseCategory = (slug: string, newCategorySlug: string) => {
    const selectedCat = categories.find((c) => c.slug === newCategorySlug)
    if (!selectedCat) return

    // تحديث متفائل فوري للواجهة
    setCourses((prev) =>
      prev.map((c) =>
        c.slug === slug
          ? { ...c, categorySlug: newCategorySlug, category: selectedCat.title }
          : c
      )
    )

    startTransition(async () => {
      const res = await quickChangeCourseCategoryAdminAction(slug, newCategorySlug)
      if (res.success && res.courses) {
        setCourses(res.courses)
        try {
          localStorage.setItem('sanad_custom_courses', JSON.stringify(res.courses))
        } catch {}
      } else {
        alert(res.error || 'تعذر تغيير الفن الشرعي للمتن.')
        await refreshDashboardData()
      }
    })
  }

  const handleExportCoursesJSON = () => {
    const jsonStr = JSON.stringify(courses, null, 2)
    navigator.clipboard.writeText(jsonStr)
    alert('تم نسخ مصفوفة المتون كاملة (JSON) إلى الحافظة بنجاح!')
  }

  // حفظ الإعلان الإداري وبثه لجميع الطلاب فوراً
  const handleSaveBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveBroadcastAdminAction(broadcast)
      if (res.success && res.broadcast) {
        setBroadcast(res.broadcast)
        setBroadcastSavedNotice(true)
        setTimeout(() => setBroadcastSavedNotice(false), 3000)
      }
    })
  }

  const handleToggleBroadcastActive = () => {
    const nextState = !broadcast.active
    const updated = {
      ...broadcast,
      active: nextState,
      timestamp: new Date().toISOString(),
    }
    setBroadcast(updated)
    startTransition(async () => {
      await saveBroadcastAdminAction(updated)
    })
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return
    await deleteCommunityPostAdminAction(postId)
    setModerationPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const handleToggleBanUser = (userId: string) => {
    let nextBans: string[]
    if (bannedUserIds.includes(userId)) {
      nextBans = bannedUserIds.filter((id) => id !== userId)
    } else {
      nextBans = [...bannedUserIds, userId]
    }
    setBannedUserIds(nextBans)
    try {
      localStorage.setItem('sanad_banned_users', JSON.stringify(nextBans))
    } catch {}
  }

  // تصفية المتون
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.instructor?.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.author?.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(courseSearch.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || c.categorySlug === categoryFilter
    const matchesStage = stageFilter === 'all' || String(c.stage || 1) === stageFilter
    return matchesSearch && matchesCategory && matchesStage
  })

  // تصفية الفنون والتصنيفات الشرعية
  const filteredCategories = categories.filter((cat) => {
    const q = categorySearch.toLowerCase().trim()
    if (!q) return true
    return cat.title.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)
  })

  const activeStudentsCount = students.filter((s) => !s.isBanned).length
  const bannedStudentsCount = students.filter((s) => s.isBanned).length

  // تصفية الطلاب بالمعرف الأكاديمي والاسم والبريد والحالة
  const filteredStudents = students.filter((s) => {
    if (studentStatusFilter === 'active' && s.isBanned) return false
    if (studentStatusFilter === 'banned' && !s.isBanned) return false

    const query = studentSearch.toLowerCase().trim()
    if (!query) return true
    return (
      (s.scholarlyId && s.scholarlyId.toLowerCase().includes(query)) ||
      s.email.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      (Array.isArray(s.completedCourses) &&
        s.completedCourses.some((slug) => slug.toLowerCase().includes(query)))
    )
  })

  // نسخ المعرف الأكاديمي بنقرة واحدة
  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // فتح نافذة حظر الحساب الإداري
  const handleOpenBanModal = (st: StudentActivityRecord, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setBanModalStudent(st)
    setBanReasonInput('حظر إداري بقرار من المشرف العام')
  }

  // تأكيد حظر الحساب إدارياً
  const handleConfirmBan = () => {
    if (!banModalStudent) return
    setIsBanningPending(true)
    const targetEmail = banModalStudent.email
    const targetReason = banReasonInput.trim() || 'حظر إداري بقرار من المشرف العام'

    startTransition(async () => {
      try {
        const res = await toggleBanStudentAdminAction(targetEmail, true, targetReason)
        if (res.success && res.student) {
          setStudents((prev) =>
            prev.map((st) =>
              st.email === targetEmail
                ? {
                    ...st,
                    isBanned: true,
                    banReason: targetReason,
                    bannedAt: new Date().toISOString(),
                  }
                : st
            )
          )
          if (selectedStudentForDetail?.email === targetEmail) {
            setSelectedStudentForDetail((prev) =>
              prev
                ? {
                    ...prev,
                    isBanned: true,
                    banReason: targetReason,
                    bannedAt: new Date().toISOString(),
                  }
                : null
            )
          }
          setBanModalStudent(null)
        } else {
          alert(res.error || 'تعذر حظر الحساب')
        }
      } catch {
        alert('حدث خطأ أثناء حظر الحساب')
      } finally {
        setIsBanningPending(false)
      }
    })
  }

  // إلغاء حظر الحساب واستعادة نشاط الطالب
  const handleUnbanStudent = (st: StudentActivityRecord, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (
      !confirm(
        `هل أنت متأكد من فك الحظر عن حساب الطالب «${st.name}» (${st.scholarlyId || st.email}) واستعادة نشاطه كاملاً؟`
      )
    )
      return

    startTransition(async () => {
      try {
        const res = await toggleBanStudentAdminAction(st.email, false)
        if (res.success && res.student) {
          setStudents((prev) =>
            prev.map((item) =>
              item.email === st.email
                ? {
                    ...item,
                    isBanned: false,
                    banReason: undefined,
                    bannedAt: undefined,
                  }
                : item
            )
          )
          if (selectedStudentForDetail?.email === st.email) {
            setSelectedStudentForDetail((prev) =>
              prev
                ? {
                    ...prev,
                    isBanned: false,
                    banReason: undefined,
                    bannedAt: undefined,
                  }
                : null
            )
          }
        } else {
          alert(res.error || 'تعذر فك الحظر')
        }
      } catch {
        alert('حدث خطأ أثناء فك الحظر')
      }
    })
  }

  const formatStudyTime = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes <= 0) return '0 دقيقة'
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const mins = totalMinutes % 60
    if (days > 0) return `${days} يوم و ${hours} س و ${mins} د`
    if (hours === 0) return `${mins} دقيقة`
    if (mins === 0) return `${hours} ساعة`
    return `${hours} س و ${mins} د`
  }

  // شاشة التحقق الأولي
  if (isInitialChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500 text-sm font-bold">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
          <span>جاري التحقق من البروتوكول الأمني...</span>
        </div>
      </div>
    )
  }

  // 1. شاشة تسجيل دخول المشرف المحصنة خادمياً
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center justify-center px-4 py-12">
        <div className="relative w-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-2xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900 text-amber-300 shadow-md">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white">
              بوابة التحكم المشفرة || منصة سَنَد
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              بوابة إدارية محصنة ضد هجمات التخمين والاختراق • المهندس بهاء طارق
            </p>
          </div>

          {authErrorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">{authErrorMessage}</span>
                {lockoutMinutes && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    تم تفعيل الإغلاق الأمني التلقائي لمدة {lockoutMinutes} دقيقة لحماية السيرفر.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleServerLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>المفتاح الإداري الخادمي (Master Key)</span>
                <span className="text-[10px] text-stone-400 font-normal">محمي بـ HMAC-SHA256</span>
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcodeInput}
                  disabled={isPending || Boolean(lockoutMinutes)}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value)
                    setAuthErrorMessage(null)
                  }}
                  placeholder="أدخل المفتاح الإداري..."
                  required
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                >
                  {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || Boolean(lockoutMinutes)}
              className="w-full rounded-2xl bg-emerald-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-950 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>جاري التحقق الخادمي...</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>فتح بوابة التحكم والتحقق</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500 pt-4 border-t border-stone-100 dark:border-stone-800">
            <span>نظام الحماية: 3 محاولات كحد أقصى</span>
            <span>بوابة مشفرة ومموهة</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. اللوحة الإدارية المكتملة
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* الترويسة الرئيسية والإحصائيات الحية */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>بوابة الإشراف العام والتحكم المركزي</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
              إدارة منصة «سَنَد» ومتابعة الطلاب
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              متابعة الطلاب المسجلين بالبريد، إحصائيات المدارسة، وإدارة المقررات ({courses.length} متناً) • المهندس بهاء طارق
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshDashboardData}
              title="تحديث البيانات الفورية"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-700" />
              <span>تحديث حي</span>
            </button>

            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <span>معاينة كطالب</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={handleServerLogout}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 border border-rose-200 hover:bg-rose-100 transition cursor-pointer dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>قفل الجلسة</span>
            </button>
          </div>
        </div>

        {/* كروت الإحصائيات المركزية الأربعة */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 pt-6 border-t border-stone-100 dark:border-stone-800">
          <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 group relative">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[11px] font-bold">زوار المنصة</span>
              <Eye className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-stone-900 dark:text-white">
                {stats.totalVisitors.toLocaleString('ar-EG')}
              </div>
              <button
                type="button"
                onClick={handleResetVisitorCount}
                title="تصفير عداد الزيارات (زيارات المشرف مستثناة تلقائياً)"
                className="opacity-70 hover:opacity-100 transition-opacity text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900 cursor-pointer"
              >
                تصفير
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
              <span>إجمالي الزيارات</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">مستثنى زياراتك</span>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[11px] font-bold">الطلاب المسجلون</span>
              <GraduationCap className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {students.length.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] text-stone-400">حسابات بريد معتمدة</span>
          </div>

          <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[11px] font-bold">ساعات المدارسة</span>
              <Clock className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
              {formatStudyTime(stats.totalStudyMinutes)}
            </div>
            <span className="text-[10px] text-stone-400">إجمالي وقت الطلاب</span>
          </div>

          <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[11px] font-bold">المتون المكتملة</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 dark:text-white">
              {stats.totalCompletedCoursesCount.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] text-stone-400">متون تمت دراستها كلياً</span>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[11px] font-bold">فوائد الكشكول</span>
              <FileText className="h-4 w-4 text-amber-700" />
            </div>
            <div className="text-2xl font-black text-stone-900 dark:text-white">
              {stats.totalNotesCount.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] text-stone-400">فوائد مقيدة بالدفاتر</span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات الأربعة */}
      <div className="flex flex-wrap rounded-2xl border border-stone-200 bg-stone-100/70 p-1.5 text-xs sm:text-sm font-bold dark:border-stone-800 dark:bg-stone-800/70">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-emerald-700" />
          <span>سجل الطلاب والنشاط ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <BookOpen className="h-4 w-4 text-emerald-700" />
          <span>إدارة المتون والمقررات ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <Layers className="h-4 w-4 text-emerald-700" />
          <span>إدارة الفنون والتصنيفات ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('intelligence')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'intelligence'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>المستشار التأصيلي الذكي</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'moderation'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <Users className="h-4 w-4 text-amber-600" />
          <span>إشراف مجتمع المدارسة</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
          }`}
        >
          <Megaphone className="h-4 w-4 text-rose-600" />
          <span>البث الإداري والإعلانات</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* التبويب 1: سجل الطلاب والنشاط والتحليلات الشاملة */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* شريط البحث وتصفية الحسابات والنشاط */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ابحث بالمعرّف (مثل SND-1001) أو الاسم أو البريد..."
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-white"
                />
                <Search className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
              </div>

              {/* أزرار تصفية الحالة: الكل / النشطون / المحظورون */}
              <div className="inline-flex rounded-2xl border border-stone-200 bg-stone-100/70 p-1 dark:border-stone-800 dark:bg-stone-900/80">
                <button
                  type="button"
                  onClick={() => setStudentStatusFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    studentStatusFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-white'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  الكل ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentStatusFilter('active')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    studentStatusFilter === 'active'
                      ? 'bg-emerald-900 text-white shadow-2xs dark:bg-emerald-800'
                      : 'text-stone-500 hover:text-emerald-800 dark:text-stone-400'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>النشطون ({activeStudentsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentStatusFilter('banned')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    studentStatusFilter === 'banned'
                      ? 'bg-rose-900 text-white shadow-2xs dark:bg-rose-950'
                      : 'text-stone-500 hover:text-rose-800 dark:text-stone-400'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>المحظورون ({bannedStudentsCount})</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 font-bold shrink-0">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              <span>المطابق للتصفية: {filteredStudents.length} من أصل {students.length} طالب</span>
            </div>
          </div>

          {/* جدول سجل حسابات الطلاب وتفاصيل مدارستهم مع المعرف الأكاديمي والتحكم الإداري */}
          <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/70 dark:text-stone-400">
                  <tr>
                    <th className="p-4 font-bold">المعرّف الأكاديمي (ID)</th>
                    <th className="p-4 font-bold">الطالب والبريد (Gmail)</th>
                    <th className="p-4 font-bold">الحالة الإدارية</th>
                    <th className="p-4 font-bold">تاريخ الانضمام</th>
                    <th className="p-4 font-bold">آخر تواجد ونشاط</th>
                    <th className="p-4 font-bold">وقت المدارسة</th>
                    <th className="p-4 font-bold">المتون المكتملة</th>
                    <th className="p-4 font-bold">المجالس</th>
                    <th className="p-4 font-bold text-center">الإجراءات وتفاصيل المدارسة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-400 dark:text-stone-500">
                        {studentSearch || studentStatusFilter !== 'all'
                          ? 'لم يتم العثور على طالب يطابق معايير التصفية والبحث.'
                          : 'لا يوجد طلاب مسجلون بعد. عند تسجيل أول طالب بريده الإلكتروني سيظهر هنا فوراً بكامل تفاصيل جلساته.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className={`transition ${st.isBanned ? 'bg-rose-50/30 hover:bg-rose-50/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/20' : 'hover:bg-stone-50/60 dark:hover:bg-stone-800/40'}`}>
                        {/* 1. المعرف الأكاديمي الفريد */}
                        <td className="p-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(st.scholarlyId || st.id, e)}
                            title="انقر لنسخ المعرّف الأكاديمي"
                            className="group inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11px] font-black text-stone-800 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-950 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                          >
                            <Hash className="h-3 w-3 text-stone-400 group-hover:text-emerald-600" />
                            <span>{st.scholarlyId || `#${st.id.slice(-6)}`}</span>
                            {copiedId === (st.scholarlyId || st.id) ? (
                              <Check className="h-3 w-3 text-emerald-600 animate-in zoom-in" />
                            ) : (
                              <Copy className="h-3 w-3 text-stone-400 opacity-60 group-hover:opacity-100" />
                            )}
                          </button>
                        </td>

                        {/* 2. اسم الطالب والبريد الإلكتروني */}
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-black text-xs shadow-2xs ${
                              st.isBanned
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                                <span>{st.name}</span>
                                {st.isBanned ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
                                    محظور
                                  </span>
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" title="بريد إلكتروني مؤكد" />
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 text-stone-400" />
                                <span>{st.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. الحالة الإدارية */}
                        <td className="p-4 whitespace-nowrap">
                          {st.isBanned ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900">
                                <Ban className="h-3 w-3" />
                                <span>محظور إدارياً</span>
                              </span>
                              {st.banReason && (
                                <p className="text-[10px] text-rose-600/80 dark:text-rose-400 truncate max-w-[130px]" title={st.banReason}>
                                  {st.banReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>حساب نشط</span>
                            </span>
                          )}
                        </td>

                        {/* 4. تاريخ الانضمام */}
                        <td className="p-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                          {new Date(st.registeredAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* 5. آخر تواجد */}
                        <td className="p-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-stone-400" />
                            {new Date(st.lastActive).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* 6. وقت المدارسة */}
                        <td className="p-4 font-bold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                          {formatStudyTime(st.totalStudyMinutes)}
                        </td>

                        {/* 7. المتون المكتملة */}
                        <td className="p-4 whitespace-nowrap">
                          {st.completedCourses && st.completedCourses.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              {st.completedCourses.length} متون منجزة
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px]">قيد الدراسة</span>
                          )}
                        </td>

                        {/* 8. المجالس المستمع إليها */}
                        <td className="p-4 font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap">
                          {st.listenedSessions ? `${st.listenedSessions.length} مجلس` : '0 مجلس'}
                        </td>

                        {/* 9. الإجراءات الإدارية وتفاصيل المدارسة */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForDetail(st)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                            >
                              <History className="h-3.5 w-3.5 text-emerald-700" />
                              <span>سجل الجلسات ({st.listenedSessions?.length || 0})</span>
                            </button>

                            {st.isBanned ? (
                              <button
                                type="button"
                                onClick={(e) => handleUnbanStudent(st, e)}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900 transition cursor-pointer dark:bg-emerald-700"
                                title="فك الحظر واستعادة الحساب فوراً"
                              >
                                <Check className="h-3.5 w-3.5 text-amber-300" />
                                <span>فك الحظر</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleOpenBanModal(st, e)}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-300 transition cursor-pointer dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                                title="حظر حساب الطالب فوراً"
                              >
                                <Ban className="h-3.5 w-3.5 text-rose-600" />
                                <span>حظر</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* شريط الأحداث والنشاط المباشر */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  سجل الأحداث والنشاط المباشر على المنصة
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-bold">آخر 20 حركة تدريبية</span>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                لا توجد أحداث مسجلة بعد في السجل المباشر.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.slice(0, 15).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-2xl bg-stone-50 p-3 text-xs dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          ev.type === 'complete'
                            ? 'bg-emerald-500'
                            : ev.type === 'listen'
                            ? 'bg-amber-500'
                            : ev.type === 'note'
                            ? 'bg-indigo-500'
                            : 'bg-teal-500'
                        }`}
                      />
                      <div>
                        <span className="font-extrabold text-stone-900 dark:text-white ml-1">
                          {ev.studentName}
                        </span>
                        <span className="text-stone-600 dark:text-stone-300">{ev.description}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 shrink-0 mr-2">
                      {new Date(ev.timestamp).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 2: إدارة المتون والمقررات (78 متناً) */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="ابحث عن متن، شارح، أو معرف..."
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-white"
                />
                <Search className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <option value="all">كافة العلوم ({courses.length} متن)</option>
                {categories.map((cat) => {
                  const count = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
                  return (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.title} ({count} متن)
                    </option>
                  )
                })}
              </select>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as 'all' | '1' | '2' | '3')}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <option value="all">كافة المراحل (1، 2، 3)</option>
                <option value="1">المرحلة 1: تأسيس</option>
                <option value="2">المرحلة 2: بناء</option>
                <option value="3">المرحلة 3: تمكن</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddNewClick}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة متن جديد</span>
              </button>

              <button
                onClick={handleExportCoursesJSON}
                title="تصدير كود المتون كاملاً كملف JSON"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <Copy className="h-4 w-4 text-stone-500" />
                <span>تصدير JSON</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/70 dark:text-stone-400">
                  <tr>
                    <th className="p-4 font-bold">المتن والمؤلف</th>
                    <th className="p-4 font-bold">الفن الشرعي</th>
                    <th className="p-4 font-bold">المرحلة التأصيلية</th>
                    <th className="p-4 font-bold">الشارح المعتمد</th>
                    <th className="p-4 font-bold">عدد المجالس</th>
                    <th className="p-4 font-bold">يوتيوب (معرف/قائمة)</th>
                    <th className="p-4 font-bold">المرفقات</th>
                    <th className="p-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredCourses.map((course) => (
                    <tr key={course.slug} className="group hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                      <td className="p-4 font-bold text-stone-900 dark:text-white">
                        <div
                          onClick={() => handleEditClick(course)}
                          title="انقر لتعديل هذا المتن والمؤلف مباشرة"
                          className="font-extrabold hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{course.title}</span>
                          <Edit3 className="h-3 w-3 text-amber-500 opacity-60 group-hover:opacity-100 transition" />
                        </div>
                        {course.author && (
                          <div
                            onClick={() => handleEditClick(course)}
                            title="انقر لتعديل بيانات المؤلف"
                            className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold mt-0.5 hover:underline cursor-pointer"
                          >
                            المؤلف: {course.author}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-stone-400 mt-0.5">{course.slug}</div>

                        {/* أزرار الإجراءات السريعة المباشرة تحت اسم المتن */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleEditClick(course)}
                            title="تعديل المتن والمؤلف والفن والمرفقات"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-2 py-0.5 text-[10px] font-bold text-amber-950 transition cursor-pointer dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/60"
                          >
                            <Edit3 className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                            <span>تعديل المتن والمؤلف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEpisodesModal(course)}
                            title="إدارة وتفريع مجالس وفيديوهات المتن"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-bold text-emerald-950 transition cursor-pointer dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                          >
                            <ListOrdered className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                            <span>المجالس ({course.episodes?.length || 0})</span>
                          </button>

                          <div className="inline-flex items-center gap-0.5 rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            <button
                              type="button"
                              disabled={courses.findIndex((c) => c.slug === course.slug) === 0}
                              onClick={() => handleMoveCourse(course.slug, 'up')}
                              title="تقديم المتن (تحريك لأعلى في الفهرس والمسار)"
                              className="flex h-5 w-5 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={courses.findIndex((c) => c.slug === course.slug) === courses.length - 1}
                              onClick={() => handleMoveCourse(course.slug, 'down')}
                              title="تأخير المتن (تحريك لأسفل في الفهرس والمسار)"
                              className="flex h-5 w-5 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>

                          <Link
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            title="معاينة قاعة المتن كما يراها الطالب في المنصة"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-emerald-700 hover:underline dark:text-stone-400 dark:hover:text-emerald-400 transition"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span>معاينة القاعة</span>
                          </Link>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <select
                            value={course.categorySlug || ''}
                            onChange={(e) => handleQuickChangeCourseCategory(course.slug, e.target.value)}
                            title="تغيير الفن الشرعي لهذا المتن فوراً"
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-bold text-stone-800 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 cursor-pointer shadow-2xs hover:border-amber-400 transition"
                          >
                            {categories.map((cat) => {
                              const count = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
                              return (
                                <option key={cat.slug} value={cat.slug}>
                                  {cat.title} ({count} متن)
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {course.categorySlug}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${
                            course.stage === 1
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                              : course.stage === 3
                              ? 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800'
                          }`}
                        >
                          {course.stage === 1
                            ? 'مرحلة 1: تأسيس'
                            : course.stage === 3
                            ? 'مرحلة 3: تمكن'
                            : 'مرحلة 2: بناء'}
                        </span>
                      </td>
                      <td className="p-4 text-stone-600 dark:text-stone-300">
                        {course.instructor || '—'}
                      </td>
                      <td className="p-4 font-bold text-stone-800 dark:text-stone-200">
                        <div>{course.totalLessons || (course.videoList ? course.videoList.length : '—')} مجلس</div>
                        <button
                          type="button"
                          onClick={() => handleOpenEpisodesModal(course)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                          title="تفريعات المجالس وإضافة الروابط الفردية"
                        >
                          <ListOrdered className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                          <span>تفريعات الروابط ({course.episodes?.length || 0})</span>
                        </button>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="inline-block max-w-[140px] truncate" title={course.youtubeId}>
                          {course.youtubeId}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {course.pdfUrl ? (
                            <span className="flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold dark:bg-amber-950 dark:text-amber-300">
                              <FileDown className="h-3 w-3" />
                              PDF
                            </span>
                          ) : (
                            <span className="text-stone-300 text-[10px]">—</span>
                          )}
                          {course.audioUrl ? (
                            <span className="flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-300">
                              <Volume2 className="h-3 w-3" />
                              صوت
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex items-center gap-0.5 rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            <button
                              type="button"
                              disabled={courses.findIndex((c) => c.slug === course.slug) === 0}
                              onClick={() => handleMoveCourse(course.slug, 'up')}
                              title="تقديم المتن (تحريك لأعلى)"
                              className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={courses.findIndex((c) => c.slug === course.slug) === courses.length - 1}
                              onClick={() => handleMoveCourse(course.slug, 'down')}
                              title="تأخير المتن (تحريك لأسفل)"
                              className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleOpenEpisodesModal(course)}
                            title="إدارة وتفريع مجالس المتن وروابطها"
                            className="rounded-lg p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/60"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </button>

                          <Link
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            title="معاينة قاعة الدرس"
                            className="rounded-lg p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-stone-100 transition dark:hover:bg-stone-800 dark:hover:text-emerald-400"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>

                          <button
                            onClick={() => handleEditClick(course)}
                            title="تعديل المتن والمرفقات"
                            className="rounded-lg p-1.5 text-stone-400 hover:text-amber-800 hover:bg-stone-100 transition cursor-pointer dark:hover:bg-stone-800 dark:hover:text-amber-400"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCourse(course.slug)}
                            title="حذف المتن"
                            className="rounded-lg p-1.5 text-stone-400 hover:text-rose-700 hover:bg-stone-100 transition cursor-pointer dark:hover:bg-stone-800 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 3: إدارة الفنون والتصنيفات الشرعية */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* بطاقة التوجيه والتحكم */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4.5 text-xs text-emerald-950 leading-relaxed dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold mb-1.5 text-sm">
              <Layers className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400" />
              <span>الإدارة المركزية للفنون والتصنيفات الشرعية:</span>
            </div>
            <p className="text-stone-700 dark:text-stone-300">
              تتيح لك هذه اللوحة كصاحب للمنصة إضافة فنون شرعية جديدة، أو تعديل اسم ومعرّف أي فن قائم. فور حفظ تعديلك، يقوم النظام تلقائياً بتحديث كافة المتون التابعة لهذا الفن وتعميم الاسم الجديد فوراً في كافة أرجاء المنصة: الفوتر، بطاقات المتون، صفحة الخارطة، صفحة المقررات، وقاعات الدروس دون أي انقطاع.
            </p>
          </div>

          {/* شريط الإجراءات والبحث */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="ابحث في أسماء الفنون أو معرّفاتها (Slug)..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              />
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-700" />
                <span>إجمالي الفنون: {categories.length} فنون معتمدة</span>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                <span>إضافة فن شرعي جديد</span>
              </button>
            </div>
          </div>

          {/* جدول الفنون الشرعية وإحصائياتها */}
          <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/70 dark:text-stone-400">
                  <tr>
                    <th className="p-4 font-bold">#</th>
                    <th className="p-4 font-bold">اسم الفن الشرعي</th>
                    <th className="p-4 font-bold">المعرّف اللاتيني (Slug)</th>
                    <th className="p-4 font-bold">عدد المتون المندرجة تحته</th>
                    <th className="p-4 font-bold">عينة من المتون التابعة</th>
                    <th className="p-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-400 dark:text-stone-500">
                        لم يتم العثور على فن يطابق بحثك.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat, idx) => {
                      const relatedCourses = courses.filter(
                        (c) => c.categorySlug === cat.slug || c.category === cat.title
                      )
                      return (
                        <tr key={cat.slug} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                          <td className="p-4 font-mono font-bold text-stone-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-4">
                            <div className="font-extrabold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                              <span>{cat.title}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300">
                              {cat.slug}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <BookOpen className="h-3 w-3" />
                              <span>{relatedCourses.length} متناً</span>
                            </span>
                          </td>
                          <td className="p-4 max-w-xs">
                            {relatedCourses.length === 0 ? (
                              <span className="text-stone-400 text-[11px]">لا توجد متون مرتبطة بعد</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {relatedCourses.slice(0, 3).map((c) => (
                                  <span
                                    key={c.slug}
                                    className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-700 dark:text-stone-300 truncate max-w-[120px]"
                                    title={c.title}
                                  >
                                    {c.title}
                                  </span>
                                ))}
                                {relatedCourses.length > 3 && (
                                  <span className="text-[10px] font-bold text-stone-400 self-center">
                                    +{relatedCourses.length - 3} أخرى
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/courses?cat=${cat.slug}`}
                                target="_blank"
                                title="معاينة هذا الفن في فهرس المتون"
                                className="rounded-lg p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-stone-100 transition dark:hover:bg-stone-800 dark:hover:text-emerald-400"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                title="تعديل اسم ومعرّف الفن"
                                className="rounded-lg p-1.5 text-stone-400 hover:text-amber-800 hover:bg-stone-100 transition cursor-pointer dark:hover:bg-stone-800 dark:hover:text-amber-400"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                title="حذف الفن"
                                className="rounded-lg p-1.5 text-stone-400 hover:text-rose-700 hover:bg-stone-100 transition cursor-pointer dark:hover:bg-stone-800 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب: المستشار التأصيلي والتعرف الذكي على المتون والفنون الشرعية */}
      {/* ========================================================================= */}
      {activeTab === 'intelligence' && (
        <div className="space-y-8">
          {/* بطاقة التوجيه والتعريف بالنظام */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-linear-to-r from-amber-50 via-emerald-50/60 to-white p-6 shadow-sm dark:border-amber-800/80 dark:bg-stone-900 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-1 text-xs font-black text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>محرك الذكاء والاستنباط التأصيلي لمنصة سَنَد</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                  التعرف التلقائي على أوزان المتون والعلوم الشرعية ومراحلها
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-3xl leading-relaxed">
                  نظام ذكي متكامل مصمم خصيصاً لإدارة المنصة برؤية المهندس بهاء طارق؛ يقوم بفحص أي متن أو فن شرعي، وتحليل وزنه الأكاديمي، وتحديد المرحلة التأصيلية المستحقة (تأسيس، بناء، تمكن) مع تقديم مسوغات الاختيار وخارطة التدرج الموصى بها.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleAddNewClick()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
                >
                  <Plus className="h-4 w-4 text-amber-300" />
                  <span>إضافة متن جديد بالمعالج الذكي</span>
                </button>
              </div>
            </div>
          </div>

          {/* منصة الفحص والاختبار التفاعلية السريعة */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    مختبر الفحص والاستكشاف المباشر
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    اكتب اسم أي كتاب أو متن أو فن علمي لتقييم مرحلته فوراً
                  </p>
                </div>
              </div>

              {/* أزرار التبديل بين فحص متن أو فحص فن */}
              <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-100/80 p-1 text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
                <button
                  type="button"
                  onClick={() => setIntelligenceType('matn')}
                  className={`rounded-xl px-4 py-1.5 transition cursor-pointer ${
                    intelligenceType === 'matn'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  فحص متن / كتاب
                </button>
                <button
                  type="button"
                  onClick={() => setIntelligenceType('science')}
                  className={`rounded-xl px-4 py-1.5 transition cursor-pointer ${
                    intelligenceType === 'science'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  فحص فن / علم شرعي
                </button>
              </div>
            </div>

            {/* حقل البحث والاقتراحات السريعة */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={intelligenceQuery}
                  onChange={(e) => setIntelligenceQuery(e.target.value)}
                  placeholder={
                    intelligenceType === 'matn'
                      ? 'اكتب اسم المتن (مثال: سلم المنورق، جمع الجوامع، زاد المستقنع، الآجرومية، التدمرية...)'
                      : 'اكتب اسم الفن الشرعي (مثال: أصول الفقه، علم الفرائض والمواريث، الفقه المقارن، المنطق...)'
                  }
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/60 px-4 py-3.5 pr-11 text-sm font-bold text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <Sparkles className="absolute right-4 top-4 h-5 w-5 text-amber-500" />
              </div>

              {/* اقتراحات سريعة بنقرة زر */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-stone-400">نماذج سريعة للتجربة:</span>
                {intelligenceType === 'matn' ? (
                  <>
                    {[
                      'الآجرومية',
                      'زاد المستقنع',
                      'جمع الجوامع',
                      'المنظومة البيقونية',
                      'نخبة الفكر',
                      'ألفية ابن مالك',
                      'العقيدة التدمرية',
                      'الأصول الثلاثة',
                      'مراقي السعود',
                      'المغني لابن قدامة',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setIntelligenceQuery(example)}
                        className="rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      >
                        {example}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      'أصول الفقه',
                      'علم الفرائض والمواريث',
                      'الفقه المقارن والخلاف العالي',
                      'علم علل الحديث',
                      'القواعد الفقهية',
                      'المنطق وآداب البحث',
                      'علوم القرآن والتفسير',
                      'البلاغة والبيان',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setIntelligenceQuery(example)}
                        className="rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      >
                        {example}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* بطاقة النتيجة الحية المستنبطة ذكياً */}
            {intelligenceQuery.trim().length > 1 && (
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 animate-in fade-in duration-200">
                {intelligenceType === 'matn' ? (
                  (() => {
                    const analysis = analyzeMatnStage({ title: intelligenceQuery })
                    return (
                      <div
                        className={`rounded-3xl border p-6 space-y-4 ${
                          analysis.stage === 1
                            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40'
                            : analysis.stage === 2
                            ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40'
                            : 'border-purple-300 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-200/70 dark:border-stone-700/70">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                  analysis.isCanonicalMatch
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {analysis.isCanonicalMatch
                                  ? 'متن كلاسيكي معتمد 100%'
                                  : `استنباط ذكي بنسبة ${analysis.confidence}%`}
                              </span>
                              <span className="text-xs text-stone-500 dark:text-stone-400 font-bold">
                                الفن المرجح: {analysis.categoryTitle}
                              </span>
                            </div>
                            <h4 className="text-lg font-black text-stone-900 dark:text-white">
                              {analysis.canonicalTitle || intelligenceQuery}
                            </h4>
                          </div>

                          <div className="text-left sm:text-right">
                            <span
                              className={`inline-block text-sm font-black px-4 py-1.5 rounded-2xl shadow-xs text-white ${
                                analysis.stage === 1
                                  ? 'bg-emerald-800'
                                  : analysis.stage === 2
                                  ? 'bg-amber-700'
                                  : 'bg-purple-800'
                              }`}
                            >
                              {analysis.stageName}
                            </span>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                              {analysis.stageSubtitle}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="md:col-span-2 space-y-2">
                            <div>
                              <strong className="text-stone-900 dark:text-white font-extrabold block mb-1">
                                التعليل والوزن التأصيلي لاختيار هذه المرحلة:
                              </strong>
                              <p className="text-stone-700 dark:text-stone-300 leading-relaxed bg-white/70 dark:bg-stone-800/70 p-3.5 rounded-2xl border border-stone-200/50 dark:border-stone-700/50">
                                {analysis.rationale}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-4 text-[11px] text-stone-600 dark:text-stone-300 pt-1">
                              {analysis.classicalAuthor && (
                                <div>
                                  المؤلف المعتمد:{' '}
                                  <strong className="text-stone-900 dark:text-white">
                                    {analysis.classicalAuthor}
                                  </strong>
                                </div>
                              )}
                              {analysis.pedagogicalPrerequisites &&
                                analysis.pedagogicalPrerequisites.length > 0 && (
                                  <div>
                                    المتطلبات السابقة الموصى بها:{' '}
                                    <span className="font-bold text-amber-800 dark:text-amber-400">
                                      {analysis.pedagogicalPrerequisites.join('، ')}
                                    </span>
                                  </div>
                                )}
                              {analysis.suggestedNextCourses &&
                                analysis.suggestedNextCourses.length > 0 && (
                                  <div>
                                    المتون التالية المقترحة بعده:{' '}
                                    <span className="font-bold text-teal-800 dark:text-teal-400">
                                      {analysis.suggestedNextCourses.join('، ')}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="space-y-3 bg-white/80 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[11px] text-stone-400 font-bold block">
                                الفئة المستهدفة:
                              </span>
                              <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                                {analysis.targetAudience}
                              </p>
                              <span className="text-[11px] text-stone-400 font-bold block pt-2">
                                المعرف اللاتيني المقترح:
                              </span>
                              <code className="block font-mono text-[11px] bg-stone-100 dark:bg-stone-900 px-2 py-1 rounded-lg text-stone-700 dark:text-stone-300 font-bold">
                                {analysis.suggestedSlug}
                              </code>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCourse(null)
                                setFormData({
                                  title: analysis.canonicalTitle || intelligenceQuery,
                                  slug: analysis.suggestedSlug,
                                  category: analysis.categoryTitle,
                                  categorySlug: analysis.categorySlug,
                                  instructor: '',
                                  author: analysis.classicalAuthor || '',
                                  stage: analysis.stage,
                                  youtubeId: '',
                                  isPlaylist: true,
                                  reversePlaylist: false,
                                  totalLessons: 10,
                                  pdfUrl: '',
                                  audioUrl: '',
                                  description: analysis.rationale,
                                  prerequisites: analysis.pedagogicalPrerequisites || [],
                                  nextCourses: analysis.suggestedNextCourses || [],
                                  pedagogicalRole: analysis.rationale,
                                  episodes: [],
                                })
                                setIsModalOpen(true)
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-2 text-xs transition shadow-xs cursor-pointer dark:bg-emerald-800"
                            >
                              <Plus className="h-3.5 w-3.5 text-amber-300" />
                              <span>إدراج هذا المتن في المنصة (+)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  (() => {
                    const sci = analyzeScienceDiscipline(intelligenceQuery)
                    return (
                      <div
                        className={`rounded-3xl border p-6 space-y-4 ${
                          sci.primaryStage === 1
                            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40'
                            : sci.primaryStage === 2
                            ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40'
                            : 'border-purple-300 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-200/70 dark:border-stone-700/70">
                          <div>
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold block mb-1">
                              تحليل الفن الشرعي
                            </span>
                            <h4 className="text-lg font-black text-stone-900 dark:text-white">
                              «{sci.discipline}»
                            </h4>
                          </div>

                          <div className="text-left sm:text-right">
                            <span
                              className={`inline-block text-sm font-black px-4 py-1.5 rounded-2xl shadow-xs text-white ${
                                sci.primaryStage === 1
                                  ? 'bg-emerald-800'
                                  : sci.primaryStage === 2
                                  ? 'bg-amber-700'
                                  : 'bg-purple-800'
                              }`}
                            >
                              مرحلة البدء الموصى بها: {sci.stageName}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="md:col-span-2 space-y-3">
                            <div className="space-y-1">
                              <strong className="text-stone-900 dark:text-white font-extrabold block">
                                الدور التأصيلي للعلم:
                              </strong>
                              <p className="text-stone-700 dark:text-stone-300 leading-relaxed bg-white/70 dark:bg-stone-800/70 p-3 rounded-2xl border border-stone-200/50 dark:border-stone-700/50">
                                {sci.pedagogicalRole}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <strong className="text-stone-900 dark:text-white font-extrabold block">
                                مسار التدرج الموصى به:
                              </strong>
                              <p className="text-stone-700 dark:text-stone-300 leading-relaxed bg-white/70 dark:bg-stone-800/70 p-3 rounded-2xl border border-stone-200/50 dark:border-stone-700/50">
                                {sci.recommendedProgression}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 bg-white/80 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-[11px] text-stone-400 font-bold block">
                                عينة من متون هذا الفن بالمراحل:
                              </span>
                              <div className="space-y-1 text-[11px]">
                                <div>
                                  <strong className="text-emerald-800 dark:text-emerald-300">مرحلة 1:</strong>{' '}
                                  <span className="text-stone-600 dark:text-stone-300">
                                    {sci.classicalCanonicalTexts.stage1.join('، ')}
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-amber-800 dark:text-amber-300">مرحلة 2:</strong>{' '}
                                  <span className="text-stone-600 dark:text-stone-300">
                                    {sci.classicalCanonicalTexts.stage2.join('، ')}
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-purple-800 dark:text-purple-300">مرحلة 3:</strong>{' '}
                                  <span className="text-stone-600 dark:text-stone-300">
                                    {sci.classicalCanonicalTexts.stage3.join('، ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory({
                                  slug: sci.suggestedSlug,
                                  title: sci.discipline,
                                  isNew: true,
                                })
                                setCategoryFormData({
                                  slug: sci.suggestedSlug,
                                  title: sci.discipline,
                                })
                                setIsCategoryModalOpen(true)
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-2 text-xs transition shadow-xs cursor-pointer dark:bg-emerald-800"
                            >
                              <Plus className="h-3.5 w-3.5 text-amber-300" />
                              <span>إدراج هذا الفن في قائمة الفنون (+)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>

          {/* دليل معايير المراحل التأصيلية الثلاث المعتمدة في منصة سَنَد */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              <h3 className="text-lg font-black text-stone-900 dark:text-white">
                دليل معايير المراحل الثلاث المعتمد في منصة سَنَد
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* بطاقة المرحلة 1 */}
              <div className="rounded-3xl border border-emerald-200/90 bg-white p-5 shadow-xs dark:border-emerald-900/60 dark:bg-stone-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-800 text-white font-black text-xs">
                      1
                    </span>
                    <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                      المرحلة الأولى: تأسيس
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md">
                    تأصيل أولي
                  </span>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  تعتني بضبط المتون التمهيدية الموجزة المجردة عن الخلاف، وتقرير الواجب العيني على كل مكلف في العقيدة والعبادة واللسان.
                </p>

                <div className="space-y-1.5 text-xs pt-1">
                  <strong className="text-stone-900 dark:text-white font-bold block text-[11px]">
                    أبرز متون المرحلة المعتمدة:
                  </strong>
                  <ul className="list-disc list-inside space-y-0.5 text-stone-500 dark:text-stone-400 text-[11px]">
                    <li>الأصول الثلاثة والقواعد الأربع (العقيدة)</li>
                    <li>الأربعين النووية والمنظومة البيقونية (الحديث)</li>
                    <li>بداية المتفقه وأخصر المختصرات (الفقه)</li>
                    <li>متن الآجرومية في علم النحو (اللغة)</li>
                    <li>حلية طالب العلم وصحيح الآداب (السلوك)</li>
                  </ul>
                </div>
              </div>

              {/* بطاقة المرحلة 2 */}
              <div className="rounded-3xl border border-amber-200/90 bg-white p-5 shadow-xs dark:border-amber-900/60 dark:bg-stone-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-700 text-white font-black text-xs">
                      2
                    </span>
                    <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                      المرحلة الثانية: بناء
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-md">
                    ترسيخ منهجي
                  </span>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  تعتني بدراسة المتون المتوسطة المحررة المقرونة بالأدلة الشرعية، وتحرير الفروع الفقهية وضبط علوم الآلة وقواعد الاستنباط.
                </p>

                <div className="space-y-1.5 text-xs pt-1">
                  <strong className="text-stone-900 dark:text-white font-bold block text-[11px]">
                    أبرز متون المرحلة المعتمدة:
                  </strong>
                  <ul className="list-disc list-inside space-y-0.5 text-stone-500 dark:text-stone-400 text-[11px]">
                    <li>كتاب التوحيد والعقيدة الواسطية (العقيدة)</li>
                    <li>بلوغ المرام ونخبة الفكر وقصب السكر (الحديث)</li>
                    <li>زاد المستقنع ومنهاج السالكين (الفقه)</li>
                    <li>الأصول من علم الأصول والورقات (الأصول)</li>
                    <li>قطر الندى وشذا العرف في الصرف (اللغة)</li>
                  </ul>
                </div>
              </div>

              {/* بطاقة المرحلة 3 */}
              <div className="rounded-3xl border border-purple-200/90 bg-white p-5 shadow-xs dark:border-purple-900/60 dark:bg-stone-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-800 text-white font-black text-xs">
                      3
                    </span>
                    <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                      المرحلة الثالثة: تمكن
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-2 py-0.5 rounded-md">
                    رسوخ تخصصي
                  </span>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  تعتني باستيعاب الألفيات والموسوعات الكبرى، وفقه الخلاف العالي المقارن، وعلل الحديث، ومقاصد الشريعة، والترجيح الأصولي.
                </p>

                <div className="space-y-1.5 text-xs pt-1">
                  <strong className="text-stone-900 dark:text-white font-bold block text-[11px]">
                    أبرز متون المرحلة المعتمدة:
                  </strong>
                  <ul className="list-disc list-inside space-y-0.5 text-stone-500 dark:text-stone-400 text-[11px]">
                    <li>العقيدة الطحاوية والعقيدة التدمرية (العقيدة)</li>
                    <li>ألفية العراقي ونيل الأوطار وسبل السلام (الحديث)</li>
                    <li>المغني لابن قدامة ومسائل الجمهور (الفقه)</li>
                    <li>جمع الجوامع ومراقي السعود والموافقات (الأصول)</li>
                    <li>ألفية ابن مالك وشذور الذهب ومغني اللبيب (اللغة)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 4: إشراف مجتمع المدارسة */}
      {/* ========================================================================= */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900 leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>نظام الرقابة والتدقيق الأمني:</span>
            </div>
            تتيح هذه اللوحة كشف صاحب المنشور المجهول برقم معرّفه (User ID) وتاريخ النشر الفعلي لمنع أي إساءة، مع إمكانية حذف المنشور المخالف وحظر المستخدم فوراً.
          </div>

          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-base font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-700" />
              <span>المشاركات الخاضعة للرقابة والتدقيق</span>
            </h3>

            {moderationPosts.length === 0 ? (
              <div className="py-12 text-center text-stone-400 dark:text-stone-500 space-y-2">
                <Check className="h-8 w-8 mx-auto text-emerald-600" />
                <p className="font-bold text-stone-700 dark:text-stone-300">
                  لا توجد بلاغات أو منشورات مخالفة حالياً
                </p>
                <p className="text-xs">
                  مجتمع المدارسة نقي ومنضبط على سمت طلب العلم.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {moderationPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-white">
                          الاسم المعروض: {post.anonymous_alias}
                        </span>
                        <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                          معرّف الحساب: {post.user_id || 'غير مسجل (زائر)'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {new Date(post.created_at).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50 p-3 rounded-xl dark:bg-stone-800/60">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-stone-500">
                        التأييدات: {post.upvotes_count} • الفئة: {post.post_type}
                      </span>

                      <div className="flex items-center gap-2">
                        {post.user_id && (
                          <button
                            onClick={() => handleToggleBanUser(post.user_id!)}
                            className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                              bannedUserIds.includes(post.user_id)
                                ? 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
                                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
                            }`}
                          >
                            {bannedUserIds.includes(post.user_id) ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="rounded-xl bg-rose-700 px-3 py-1 text-xs font-bold text-white hover:bg-rose-800 transition cursor-pointer"
                        >
                          حذف المنشور فوراً
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 4: البث الإداري والإعلانات للطلاب */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-rose-700 dark:text-rose-400" />
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  إرسال إعلان عام للطلاب
                </h3>
              </div>

              <button
                type="button"
                onClick={handleToggleBroadcastActive}
                className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  broadcast.active
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {broadcast.active ? 'الإعلان نشط (معروض)' : 'الإعلان معطّل'}
              </button>
            </div>

            {broadcastSavedNotice && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                <span>تم حفظ وتحديث الإعلان العام بنجاح! سيظهر لجميع الطلاب.</span>
              </div>
            )}

            <form onSubmit={handleSaveBroadcast} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  صفة أو اسم المرسل
                </label>
                <input
                  type="text"
                  value={broadcast.sender}
                  onChange={(e) => setBroadcast({ ...broadcast, sender: e.target.value })}
                  placeholder="المهندس بهاء طارق || إدارة منصة سَنَد"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  نص الإعلان أو التنبيه العلمي
                </label>
                <textarea
                  rows={3}
                  value={broadcast.message}
                  onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                  placeholder="اكتب التنبيه أو التوجيه هنا..."
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  النص التوجيهي أو الحث
                </label>
                <input
                  type="text"
                  value={broadcast.subtext}
                  onChange={(e) => setBroadcast({ ...broadcast, subtext: e.target.value })}
                  placeholder="مثال: واصلوا مدارستكم وفقكم الله وبارك في همتكم."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-950 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>حفظ وبث الإعلان للطلاب</span>
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>معاينة حية للإعلان (كما يراه الطالب في أسفل الشاشة):</span>
            </h4>

            <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900/95">
              <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-amber-600 via-emerald-600 to-amber-700" />

              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 animate-pulse">
                  <Megaphone className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-black text-stone-900 dark:text-white">
                  إعلان إداري: {broadcast.sender || 'إدارة منصة سَنَد'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold leading-relaxed text-stone-800 dark:text-stone-200">
                  {broadcast.message || 'سيظهر نص الإعلان هنا فور كتابته في النموذج وحفظه.'}
                </p>
                <p className="text-[11px] font-medium text-emerald-900 dark:text-emerald-400">
                  {broadcast.subtext || 'التوجيه الملحق بالإعلان.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل سجل المدارسة للطالب المحدد مع المعرف الأكاديمي والتحكم الإداري */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-8">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black text-sm shadow-xs ${
                  selectedStudentForDetail.isBanned
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {selectedStudentForDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-stone-900 dark:text-white">
                      {selectedStudentForDetail.name}
                    </h3>

                    {/* المعرف الأكاديمي مع زر النسخ */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(selectedStudentForDetail.scholarlyId || selectedStudentForDetail.id, e)}
                      title="انقر لنسخ المعرّف الأكاديمي"
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] font-black text-stone-800 hover:border-emerald-600 hover:bg-emerald-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      <Hash className="h-3 w-3 text-stone-400" />
                      <span>{selectedStudentForDetail.scholarlyId || `#${selectedStudentForDetail.id.slice(-6)}`}</span>
                      {copiedId === (selectedStudentForDetail.scholarlyId || selectedStudentForDetail.id) ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-stone-400" />
                      )}
                    </button>

                    {/* شارة الحالة */}
                    {selectedStudentForDetail.isBanned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900">
                        <Ban className="h-3 w-3" />
                        <span>محظور إدارياً</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        <Check className="h-3 w-3" />
                        <span>حساب نشط</span>
                      </span>
                    )}
                  </div>

                  <p className="font-mono text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3 text-stone-400" />
                    <span>{selectedStudentForDetail.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* تنبيه إذا كان الحساب محظوراً */}
            {selectedStudentForDetail.isBanned && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
                <Ban className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">هذا الحساب محظور حالياً بقرار من إدارة المنصة:</div>
                  <p className="text-[11px] text-rose-800/90 dark:text-rose-300/90">
                    سبب الحظر: {selectedStudentForDetail.banReason || 'حظر إداري'}
                  </p>
                  {selectedStudentForDetail.bannedAt && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400">
                      تاريخ وتوقيت الحظر: {new Date(selectedStudentForDetail.bannedAt).toLocaleString('ar-EG')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 p-3 bg-stone-50 rounded-2xl dark:bg-stone-800/60 text-center">
              <div>
                <span className="text-[10px] text-stone-400">إجمالي وقت المدارسة</span>
                <div className="font-black text-sm text-emerald-800 dark:text-emerald-400">
                  {formatStudyTime(selectedStudentForDetail.totalStudyMinutes)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-stone-400">المتون المكتملة</span>
                <div className="font-black text-sm text-stone-900 dark:text-white">
                  {selectedStudentForDetail.completedCourses?.length || 0} متون
                </div>
              </div>
              <div>
                <span className="text-[10px] text-stone-400">فوائد الكشكول</span>
                <div className="font-black text-sm text-amber-700 dark:text-amber-400">
                  {selectedStudentForDetail.notesCount || 0} فائدة
                </div>
              </div>
            </div>

            {/* تفاصيل جلسات الاستماع */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-emerald-700" />
                <span>المجالس المستمع إليها ومواعيدها:</span>
              </h4>

              {(!selectedStudentForDetail.listenedSessions || selectedStudentForDetail.listenedSessions.length === 0) ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  لم يسجل هذا الطالب جلسات استماع للمجالس بعد.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {selectedStudentForDetail.listenedSessions.map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] dark:bg-emerald-950 dark:text-emerald-300">
                          {session.episodeNum}
                        </span>
                        <div>
                          <span className="font-bold text-stone-900 dark:text-white">
                            {session.courseTitle}
                          </span>
                          <span className="text-[11px] text-stone-400 mr-1.5">
                            المجلس رقم {session.episodeNum}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(session.timestamp).toLocaleString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* أزرار التحكم في أسفل نافذة الطالب */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <div>
                {selectedStudentForDetail.isBanned ? (
                  <button
                    type="button"
                    onClick={() => handleUnbanStudent(selectedStudentForDetail)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900 transition cursor-pointer dark:bg-emerald-700"
                  >
                    <Check className="h-4 w-4 text-amber-300" />
                    <span>فك الحظر واستعادة الحساب الآن</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenBanModal(selectedStudentForDetail)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition cursor-pointer dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <Ban className="h-4 w-4 text-rose-600" />
                    <span>حظر هذا الحساب إدارياً</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="rounded-xl bg-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-300 transition cursor-pointer dark:bg-stone-700 dark:text-stone-200"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد حظر الحساب مع سبب الحظر المخصص */}
      {banModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-300 bg-white p-6 shadow-2xl dark:border-rose-900 dark:bg-stone-900 my-8">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-rose-600 via-amber-500 to-rose-700" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-rose-300">
                    حظر حساب طالب إدارياً
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    إجراء إداري فوري من المشرف العام لمنصة سَنَد
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isBanningPending}
                onClick={() => setBanModalStudent(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* بطاقة بيانات الطالب المعني بالحظر */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 space-y-2 text-xs dark:border-stone-800 dark:bg-stone-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-bold">اسم الطالب:</span>
                  <span className="font-black text-stone-900 dark:text-white">{banModalStudent.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-bold">المعرّف الأكاديمي:</span>
                  <span className="font-mono font-black text-emerald-800 dark:text-emerald-400">
                    {banModalStudent.scholarlyId || `#${banModalStudent.id.slice(-6)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-bold">البريد الإلكتروني:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">{banModalStudent.email}</span>
                </div>
              </div>

              {/* سبب الحظر الإداري */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  سبب الحظر الإداري (يظهر للطالب عند محاولة تسجيل الدخول):
                </label>
                <textarea
                  rows={2}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="اكتب سبب الحظر الإداري هنا..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs font-medium text-stone-900 focus:border-rose-700 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              {/* إشعار أثر الحظر */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-[11px] text-amber-900 leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="font-black block mb-0.5">⚠️ أثر تفعيل الحظر:</span>
                سيتم فوراً إنهاء جلسة هذا الطالب ومنعه من الدخول للمنصة، وإخفاؤه تماماً من لوحة الصدارة وميدان التنافس، ومنع أي تفاعل في مجلس المذاكرة. ويمكنك فك الحظر في أي وقت بنقرة واحدة.
              </div>

              {/* أزرار الحظر والإلغاء */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  disabled={isBanningPending}
                  onClick={() => setBanModalStudent(null)}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isBanningPending}
                  onClick={handleConfirmBan}
                  className="rounded-xl bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-800 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isBanningPending ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>جاري الحظر...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      <span>تأكيد الحظر الفوري</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة / تعديل متن */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-8">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {editingCourse ? `تعديل متن: ${editingCourse.title}` : 'إضافة متن تأسيسي جديد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    عنوان المتن *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value
                      setFormData((prev) => {
                        const next = { ...prev, title: newTitle }
                        if (!editingCourse && (!prev.slug || prev.slug.startsWith('matn-'))) {
                          next.slug = generateSmartSlug(newTitle)
                        }
                        return next
                      })
                    }}
                    placeholder="مثال: سلم المنورق في علم المنطق، زاد المستقنع، الآجرومية..."
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    المعرف اللاتيني (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingCourse)}
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="مثال: sullam-al-munawraq"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs font-mono text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>
              </div>

              {/* بطاقة التوجيه والذكاء التأصيلي التلقائي للمتن */}
              {(() => {
                if (!formData.title || formData.title.trim().length < 2) return null
                const analysis = analyzeMatnStage({
                  title: formData.title,
                  categorySlug: formData.categorySlug,
                  author: formData.author,
                  description: formData.description,
                })

                const isStageMatching = formData.stage === analysis.stage
                const isCategoryMatching = formData.categorySlug === analysis.categorySlug

                return (
                  <div
                    className={`rounded-2xl border p-4 transition-all shadow-xs ${
                      analysis.stage === 1
                        ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40'
                        : analysis.stage === 2
                        ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40'
                        : 'border-purple-300 bg-purple-50/80 dark:border-purple-800 dark:bg-purple-950/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-stone-200/60 dark:border-stone-700/60">
                      <div className="flex items-center gap-2">
                        <Sparkles
                          className={`h-4.5 w-4.5 shrink-0 ${
                            analysis.stage === 1
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : analysis.stage === 2
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-purple-700 dark:text-purple-400'
                          }`}
                        />
                        <span className="font-black text-xs text-stone-900 dark:text-white">
                          الاستكشاف والذكاء التأصيلي لمنصة سَنَد:
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            analysis.isCanonicalMatch
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-200'
                          }`}
                        >
                          {analysis.isCanonicalMatch ? 'تطابق معتمد 100%' : `استنباط ذكي ${analysis.confidence}%`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl shadow-2xs ${
                            analysis.stage === 1
                              ? 'bg-emerald-800 text-white'
                              : analysis.stage === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-purple-800 text-white'
                          }`}
                        >
                          {analysis.stageName}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-2 text-xs">
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                        {analysis.rationale}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-600 dark:text-stone-400">
                        <span>
                          الفن الشرعي المقترح:{' '}
                          <strong className="text-stone-900 dark:text-white font-bold">
                            {analysis.categoryTitle}
                          </strong>
                        </span>
                        {analysis.classicalAuthor && !formData.author && (
                          <span>
                            المؤلف المعتمد:{' '}
                            <strong className="text-stone-900 dark:text-white font-bold">
                              {analysis.classicalAuthor}
                            </strong>
                          </span>
                        )}
                        {analysis.pedagogicalPrerequisites && analysis.pedagogicalPrerequisites.length > 0 && (
                          <span>
                            المتطلبات السابقة الموصى بها:{' '}
                            <span className="font-bold text-amber-800 dark:text-amber-400">
                              {analysis.pedagogicalPrerequisites.join('، ')}
                            </span>
                          </span>
                        )}
                        {analysis.suggestedNextCourses && analysis.suggestedNextCourses.length > 0 && (
                          <span>
                            المتون التالية المقترحة:{' '}
                            <span className="font-bold text-teal-800 dark:text-teal-400">
                              {analysis.suggestedNextCourses.join('، ')}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/50 dark:border-stone-700/50">
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                          <span>
                            المحدد بالنموذج حالياً:{' '}
                            <strong className="text-stone-800 dark:text-stone-200">
                              المرحلة {formData.stage || 1}
                            </strong>
                          </span>
                          {isStageMatching && isCategoryMatching ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                              <Check className="h-3 w-3" /> مطابق للتوصية الذكية
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                              (يختلف عن المقترح: مرحلة {analysis.stage})
                            </span>
                          )}
                        </div>

                        {(!isStageMatching || !isCategoryMatching || (!formData.author && analysis.classicalAuthor) || !formData.prerequisites?.length) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                stage: analysis.stage,
                                categorySlug: analysis.categorySlug,
                                category: analysis.categoryTitle,
                                author: prev.author || analysis.classicalAuthor || prev.author,
                                slug:
                                  !prev.slug || prev.slug.startsWith('matn-')
                                    ? analysis.suggestedSlug
                                    : prev.slug,
                                prerequisites: analysis.pedagogicalPrerequisites?.length ? analysis.pedagogicalPrerequisites : (prev.prerequisites || []),
                                nextCourses: analysis.suggestedNextCourses?.length ? analysis.suggestedNextCourses : (prev.nextCourses || []),
                                pedagogicalRole: analysis.rationale || prev.pedagogicalRole,
                              }))
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 text-amber-300 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            <span>
                              اعتماد التوجيه الذكي والمتطلبات تلقائياً (مرحلة {analysis.stage} + فن «{analysis.categoryTitle}»)
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      الفن الشرعي *
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>إضافة فن جديد</span>
                    </button>
                  </div>
                  <select
                    value={formData.categorySlug}
                    onChange={(e) => {
                      const selectedSlug = e.target.value
                      const selected = categories.find((c) => c.slug === selectedSlug)
                      setFormData({
                        ...formData,
                        categorySlug: selectedSlug,
                        category: selected ? selected.title : formData.category,
                      })
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs font-bold text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  >
                    {categories.map((cat) => {
                      const count = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
                      return (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.title} ({count} متن)
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>المرحلة التعليمية في المسار التأصيلي *</span>
                    {formData.title && (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        المقترحة ذكياً: مرحلة{' '}
                        {
                          analyzeMatnStage({
                            title: formData.title,
                            categorySlug: formData.categorySlug,
                          }).stage
                        }
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.stage || 1}
                    onChange={(e) => setFormData({ ...formData, stage: Number(e.target.value) as 1 | 2 | 3 })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs font-bold text-emerald-900 dark:border-stone-700 dark:bg-stone-800 dark:text-emerald-300"
                  >
                    <option value={1}>المرحلة 1: تأسيس وتأصيل أولي</option>
                    <option value={2}>المرحلة 2: بناء وترسيخ منهجي</option>
                    <option value={3}>المرحلة 3: تمكن ورسوخ تخصصي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    مؤلف أو ناظم المتن الأصلي
                  </label>
                  <input
                    type="text"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="مثال: الإمام النووي رحمه الله"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    الشارح المعتمد للمقرر
                  </label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="مثال: الشيخ محمد بن صالح العثيمين"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>
              </div>

              {/* قسم التدرج المنهجي والمتطلبات السابقة والمتون التالية */}
              {(() => {
                const autoMeta = formData.title ? analyzeMatnStage({
                  title: formData.title,
                  categorySlug: formData.categorySlug,
                  author: formData.author,
                  description: formData.description,
                }) : null

                return (
                  <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-800/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        <span>التدرج المنهجي والمتطلبات السابقة (لترتيب الأولويات ومنع التشتت)</span>
                      </label>
                      {autoMeta && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              prerequisites: autoMeta.pedagogicalPrerequisites || [],
                              nextCourses: autoMeta.suggestedNextCourses || [],
                              pedagogicalRole: autoMeta.rationale || prev.pedagogicalRole,
                            }))
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>تطبيق التوصيات الذكية</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* حقل المتطلبات السابقة */}
                      <div className="space-y-1.5 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                        <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                          المتطلبات السابقة الموصى بها:
                        </label>
                        <div className="flex flex-wrap gap-1 min-h-6">
                          {(formData.prerequisites && formData.prerequisites.length > 0) ? (
                            formData.prerequisites.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300"
                              >
                                <span>«{p}»</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      prerequisites: (prev.prerequisites || []).filter((_, i) => i !== idx),
                                    }))
                                  }}
                                  className="text-amber-700 hover:text-rose-600 font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">
                              لا توجد متطلبات سابقة (متن تأسيسي مدخلي)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="أضف متطلباً سابقاً..."
                            id="new-prereq-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const input = e.currentTarget
                                const val = input.value.trim()
                                if (val && !(formData.prerequisites || []).includes(val)) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    prerequisites: [...(prev.prerequisites || []), val],
                                  }))
                                  input.value = ''
                                }
                              }
                            }}
                            className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('new-prereq-input') as HTMLInputElement
                              if (input && input.value.trim()) {
                                const val = input.value.trim()
                                if (!(formData.prerequisites || []).includes(val)) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    prerequisites: [...(prev.prerequisites || []), val],
                                  }))
                                  input.value = ''
                                }
                              }
                            }}
                            className="rounded-lg bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 cursor-pointer"
                          >
                            + إضافة
                          </button>
                        </div>

                        {/* مقترحات ذكية سريعة من الذكاء الاصطناعي */}
                        {autoMeta?.pedagogicalPrerequisites && autoMeta.pedagogicalPrerequisites.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                            <span className="text-stone-400">مقترح:</span>
                            {autoMeta.pedagogicalPrerequisites.map((sug, sIdx) => {
                              const alreadyIn = (formData.prerequisites || []).includes(sug)
                              if (alreadyIn) return null
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      prerequisites: [...(prev.prerequisites || []), sug],
                                    }))
                                  }}
                                  className="rounded bg-amber-100 hover:bg-amber-200 text-amber-900 px-1.5 py-0.5 font-bold cursor-pointer dark:bg-amber-950 dark:text-amber-300"
                                >
                                  + {sug}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* حقل المتون التالية المقترحة */}
                      <div className="space-y-1.5 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                        <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                          المتون التالية المقترحة بعد هذا المتن:
                        </label>
                        <div className="flex flex-wrap gap-1 min-h-6">
                          {(formData.nextCourses && formData.nextCourses.length > 0) ? (
                            formData.nextCourses.map((n, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-300 px-2 py-0.5 text-[10px] font-bold text-teal-900 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300"
                              >
                                <span>«{n}»</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      nextCourses: (prev.nextCourses || []).filter((_, i) => i !== idx),
                                    }))
                                  }}
                                  className="text-teal-700 hover:text-rose-600 font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">
                              مرحلة تمكن نهائية أو غير محدد بعد
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="أضف متناً تالياً..."
                            id="new-next-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const input = e.currentTarget
                                const val = input.value.trim()
                                if (val && !(formData.nextCourses || []).includes(val)) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    nextCourses: [...(prev.nextCourses || []), val],
                                  }))
                                  input.value = ''
                                }
                              }
                            }}
                            className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('new-next-input') as HTMLInputElement
                              if (input && input.value.trim()) {
                                const val = input.value.trim()
                                if (!(formData.nextCourses || []).includes(val)) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    nextCourses: [...(prev.nextCourses || []), val],
                                  }))
                                  input.value = ''
                                }
                              }
                            }}
                            className="rounded-lg bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 cursor-pointer"
                          >
                            + إضافة
                          </button>
                        </div>

                        {/* مقترحات المتون التالية من الذكاء الاصطناعي */}
                        {autoMeta?.suggestedNextCourses && autoMeta.suggestedNextCourses.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                            <span className="text-stone-400">مقترح:</span>
                            {autoMeta.suggestedNextCourses.map((sug, sIdx) => {
                              const alreadyIn = (formData.nextCourses || []).includes(sug)
                              if (alreadyIn) return null
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      nextCourses: [...(prev.nextCourses || []), sug],
                                    }))
                                  }}
                                  className="rounded bg-teal-100 hover:bg-teal-200 text-teal-900 px-1.5 py-0.5 font-bold cursor-pointer dark:bg-teal-950 dark:text-teal-300"
                                >
                                  + {sug}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* قسم فيديو المتن: رفع من اللابتوب أو رابط يوتيوب */}
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <span>فيديو المتن والشرح التعليمي *</span>
                  </label>

                  {/* تبديل طريقة إدراج الفيديو */}
                  <div className="flex items-center gap-1 rounded-xl bg-stone-200/80 p-0.5 text-[11px] font-bold dark:bg-stone-700">
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('upload')}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        videoInputMode === 'upload'
                          ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-800 dark:text-emerald-300'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
                      }`}
                    >
                      💻 رفع فيديو من اللابتوب
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('youtube')}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        videoInputMode === 'youtube'
                          ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-800 dark:text-emerald-300'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
                      }`}
                    >
                      🔴 رابط يوتيوب أو قائمة
                    </button>
                  </div>
                </div>

                {videoInputMode === 'upload' ? (
                  <div className="space-y-2">
                    {/* منطقة رفع ملف الفيديو من اللابتوب */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/40 p-4 text-center hover:bg-emerald-50/70 transition dark:border-emerald-800/80 dark:bg-emerald-950/20">
                      <input
                        type="file"
                        ref={videoFileInputRef}
                        accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.wmv,.flv,.m4v,.ts,.3gp,.ogv,.ogg,.mpg,.mpeg,*"
                        onChange={handleVideoFileUpload}
                        disabled={isUploadingVideo}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {isUploadingVideo ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            {isUploadingVideo
                              ? 'جاري رفع ملف الفيديو وحفظه في خوادم سَنَد (قد يستغرق لحظات حسب الحجم)...'
                              : 'انقر لاختيار ملف الفيديو من اللابتوب (MP4, WebM) أو اسحبه هنا'}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            يتم بث الفيديو مباشرة للطلاب بدون إعلانات وبدون أي قيود حظر
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* إشعار النجاح */}
                    {videoUploadSuccess && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-100/80 p-2.5 text-xs font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span>{videoUploadSuccess}</span>
                      </div>
                    )}

                    {/* إشعار الخطأ */}
                    {videoUploadError && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-100/80 p-2.5 text-xs font-bold text-rose-950 dark:bg-rose-950/60 dark:text-rose-300">
                        <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />
                        <span>{videoUploadError}</span>
                      </div>
                    )}

                    {/* إذا كان هناك فيديو مرفوع حالياً */}
                    {formData.videoUrl && (
                      <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100 dark:border-stone-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <Video className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate text-stone-700 dark:text-stone-300">
                              {formData.videoUrl}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, videoUrl: '' })}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition dark:bg-rose-950/50 dark:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>إزالة الفيديو</span>
                          </button>
                        </div>

                        {/* عارض تجريبي للفيديو المرفوع داخل لوحة التحكم */}
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-48 mx-auto">
                          <video
                            src={formData.videoUrl?.trim().replace(/[\/\\]+$/, '')}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      معرف يوتيوب (ID أو قائمة Playlist) *
                    </label>
                    <input
                      type="text"
                      value={formData.youtubeId}
                      onChange={(e) => {
                        const val = e.target.value.trim()
                        let cleanId = val
                        if (val.includes('list=')) {
                          cleanId = val.split('list=')[1].split('&')[0]
                        } else if (val.includes('v=')) {
                          cleanId = val.split('v=')[1].split('&')[0]
                        }
                        setFormData({
                          ...formData,
                          youtubeId: cleanId,
                          isPlaylist: cleanId.startsWith('PL'),
                        })
                      }}
                      placeholder="PL... أو معرف الفيديو"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-mono text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-700/60">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      عدد المجالس / الحلقات
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={formData.totalLessons || 1}
                      onChange={(e) => setFormData({ ...formData, totalLessons: Number(e.target.value) })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white p-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700">
                    <input
                      type="checkbox"
                      id="reversePlaylist"
                      checked={Boolean(formData.reversePlaylist)}
                      onChange={(e) => setFormData({ ...formData, reversePlaylist: e.target.checked })}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-800 focus:ring-emerald-800 dark:border-stone-700 dark:bg-stone-800 cursor-pointer"
                    />
                    <label htmlFor="reversePlaylist" className="text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
                      عكس ترتيب المجالس (من الأحدث للأقدم)
                    </label>
                  </div>
                </div>
              </div>

              {/* قسم ملف الـ PDF: رفع من اللابتوب أو رابط خارجي */}
              <div className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <FileDown className="h-4 w-4 text-amber-600" />
                    <span>ملف الكتاب / المتن (PDF)</span>
                    <span className="text-[10px] font-normal text-stone-500">(متاح للقراءة والتحميل للطالب)</span>
                  </label>

                  {/* تبديل طريقة الإدخال: رفع من اللابتوب أو رابط مباشر */}
                  <div className="flex items-center gap-1 rounded-xl bg-stone-200/80 p-0.5 text-[11px] font-bold dark:bg-stone-700">
                    <button
                      type="button"
                      onClick={() => setPdfInputMode('upload')}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        pdfInputMode === 'upload'
                          ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-800 dark:text-emerald-300'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
                      }`}
                    >
                      💻 رفع من اللابتوب
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfInputMode('url')}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        pdfInputMode === 'url'
                          ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-800 dark:text-emerald-300'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
                      }`}
                    >
                      🔗 رابط خارجي
                    </button>
                  </div>
                </div>

                {pdfInputMode === 'upload' ? (
                  <div className="space-y-2">
                    {/* منطقة رفع الملف من اللابتوب */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 text-center hover:bg-amber-50/70 transition dark:border-amber-800/80 dark:bg-amber-950/20">
                      <input
                        type="file"
                        ref={pdfFileInputRef}
                        accept=".pdf,application/pdf"
                        onChange={handlePdfFileUpload}
                        disabled={isUploadingPdf}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          {isUploadingPdf ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            {isUploadingPdf
                              ? 'جاري رفع ومعالجة ملف الـ PDF وحفظه في خوادم سَنَد...'
                              : 'انقر لاختيار ملف الـ PDF من اللابتوب أو اسحبه هنا'}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            يتم تخزين الملف في المنصة تلقائياً وإتاحته للطلاب للقراءة داخل عارض سَنَد المدمج والتحميل المباشر
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* إشعار النجاح */}
                    {pdfUploadSuccess && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-100/80 p-2.5 text-xs font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span>{pdfUploadSuccess}</span>
                      </div>
                    )}

                    {/* إشعار الخطأ */}
                    {pdfUploadError && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-100/80 p-2.5 text-xs font-bold text-rose-950 dark:bg-rose-950/60 dark:text-rose-300">
                        <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />
                        <span>{pdfUploadError}</span>
                      </div>
                    )}

                    {/* إذا كان هناك ملف مرفوع أو رابط حالي */}
                    {formData.pdfUrl && (
                      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-2.5 dark:border-stone-700 dark:bg-stone-800 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span className="font-mono text-[11px] truncate text-stone-700 dark:text-stone-300">
                            {formData.pdfUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={formData.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200 transition dark:bg-stone-700 dark:text-stone-200 cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>معاينة</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, pdfUrl: '' })}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition dark:bg-rose-950/50 dark:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>إزالة</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={formData.pdfUrl || ''}
                      onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                      placeholder="https://archive.org/.../book.pdf"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      يمكنك وضع رابط مباشر لملف PDF من موقع خارجي مثل Archive.org أو المكتبة الشاملة.
                    </p>
                  </div>
                )}
              </div>

              {/* رابط التسجيل الصوتي MP3 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>رابط التسجيل الصوتي MP3 (اختياري)</span>
                </label>
                <input
                  type="url"
                  value={formData.audioUrl || ''}
                  onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                  placeholder="https://.../audio.mp3"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  نبذة تعريفية بالمتن
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="موضوع المتن وأهميته وموقعه من التأصيل..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>
              {editingCourse && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-white">
                        تفريعات وروابط مجالس هذا المتن ({formData.episodes?.length || 0} مجالس مفرّعة)
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        يمكنك إضافة وتعديل رابط يوتيوب وصوت مستقل لكل مجلس على حدة
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      handleOpenEpisodesModal(editingCourse)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <span>فتح نافذة تفريعات المجالس ↗</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
                >
                  حفظ المتن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تفريع مجالس المتن وإضافة الروابط الفردية */}
      {editingEpisodesCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-8">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <ListOrdered className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    تفريعات وروابط مجالس متن: «{editingEpisodesCourse.title}»
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    أضف عنواناً مخصصاً ورابط يوتيوب أو صوتاً مباشراً لكل مجلس على حدة ليظهر لطالب العلم
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingEpisodesCourse(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* شريط الأدوات السريعة */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 rounded-2xl dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700">
              <div className="flex flex-wrap items-center gap-2">
                {/* زر رفع مجلد كامل من اللابتوب */}
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  title="رفع مجلد كامل من اللابتوب لفرز وترتيب الفيديوهات تلقائياً بالتسلسل الطبيعي"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-950 hover:bg-amber-100 transition cursor-pointer dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs"
                >
                  <FolderUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>📁 رفع مجلد فيديوهات كامل (Folder)</span>
                </button>

                {/* زر اختيار عدة ملفات معاً */}
                <button
                  type="button"
                  onClick={() => multipleVideosInputRef.current?.click()}
                  title="تحديد عدة ملفات فيديو دفعة واحدة وفرزها تلقائياً"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  <Files className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>📹 اختيار عدة فيديوهات معاً</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEpisodeItem}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-300" />
                  <span>إضافة مجلس (+)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoFillEpisodes}
                  title="توليد مجالس بناء على العدد المحدد في المتن"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>توليد تلقائي ({editingEpisodesCourse.totalLessons || 10})</span>
                </button>

                {/* أزرار الترتيب السريع للمجالس */}
                {courseEpisodesList.length > 1 && (
                  <div className="flex items-center gap-1.5 border-r border-stone-200 pr-2 mr-1 dark:border-stone-700">
                    <button
                      type="button"
                      onClick={handleSortEpisodesNaturally}
                      title="ترتيب المجالس تلقائياً بالتسلسل الطبيعي الصحيح (1، 2، 3...) حسب العنوان"
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 shadow-2xs"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>ترتيب ذكي (1←N)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReverseEpisodesOrder}
                      title="عكس ترتيب المجالس بالكامل (من الأخير إلى الأول أو العكس)"
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 shadow-2xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>عكس الترتيب</span>
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={folderInputRef}
                  // @ts-expect-error webkitdirectory is standard in all modern browsers
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) handleIncomingVideoFiles(files)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={multipleVideosInputRef}
                  multiple
                  accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.wmv,.flv,.m4v,.ts,.3gp,.ogv,.ogg,.mpg,.mpeg,*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) handleIncomingVideoFiles(files)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                {episodesSavedSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تم الحفظ والتحديث بنجاح!</span>
                  </span>
                )}

                <button
                  type="button"
                  disabled={isSavingEpisodes || batchProgress?.isUploading}
                  onClick={handleSaveEpisodes}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-emerald-800 to-emerald-950 px-4 py-2 text-xs font-black text-white shadow-md hover:from-emerald-700 hover:to-emerald-900 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingEpisodes ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-amber-300" />
                      <span>حفظ مجالس المتن ({courseEpisodesList.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* شريط حالة وتقدم رفع المجلد كاملاً */}
            {batchProgress && (
              <div className="mt-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/50 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      {batchProgress.isUploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent dark:border-amber-200" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-stone-900 dark:text-white">
                        {batchProgress.isUploading
                          ? `جاري رفع وترتيب مجلد الفيديوهات (${batchProgress.current} من ${batchProgress.total})...`
                          : `اكتمل رفع وترتيب ${batchProgress.successCount} مجالس بنجاح!`}
                      </h4>
                      {batchProgress.isUploading && batchProgress.currentFileName && (
                        <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 truncate max-w-md">
                          الملف النشط: {batchProgress.currentFileName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-300">
                      {batchProgress.percent}%
                    </span>
                    {batchProgress.isUploading ? (
                      <button
                        type="button"
                        onClick={handleCancelBatchUpload}
                        className="rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer dark:bg-rose-950 dark:text-rose-300"
                      >
                        إلغاء الرفع
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBatchProgress(null)}
                        className="rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 px-2 py-1 text-[11px] font-bold transition cursor-pointer dark:bg-stone-800 dark:text-stone-300"
                      >
                        إغلاق الإشعار ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* شريط التحميل */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 via-emerald-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${batchProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* منطقة سحب وإفلات وقائمة المجالس المضافة */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingFolder(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingFolder(false)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingFolder(false)
                if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                  const files = await extractFilesFromDataTransfer(e.dataTransfer.items)
                  if (files.length > 0) handleIncomingVideoFiles(files)
                } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleIncomingVideoFiles(Array.from(e.dataTransfer.files))
                }
              }}
              className={`relative mt-4 max-h-[50vh] overflow-y-auto space-y-3 pr-1 transition-all rounded-2xl ${
                isDraggingFolder
                  ? 'ring-4 ring-amber-400 ring-offset-2 bg-amber-50/60 dark:bg-amber-950/30'
                  : ''
              }`}
            >
              {isDraggingFolder && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-amber-50/95 backdrop-blur-xs border-2 border-dashed border-amber-500 p-6 text-center text-amber-950 dark:bg-stone-900/95 dark:text-amber-200">
                  <FolderUp className="h-14 w-14 text-amber-600 animate-bounce mb-2" />
                  <h4 className="text-base font-black">أفلت مجلد الفيديوهات هنا!</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    سيتولى سَنَد قراءة الفيديوهات وفرزها طبيعياً وتوليد مجالس المتن بالتسلسل الصحيح
                  </p>
                </div>
              )}

              {courseEpisodesList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-3xl dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <FolderUp className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-black text-stone-900 dark:text-white">
                      لم يتم تفريع أي مجالس بعد لهذا المتن
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      وفر وقتك ومجهودك! يمكنك الآن رفع فولدر كامل من لابتوبك وسيقوم سَنَد بترتيب كافة الفيديوهات تسلسلياً (المجلس 1، 2، 3...) وإنشائها فوراً.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
                    >
                      <FolderUp className="h-4 w-4" />
                      <span>📁 اختيار مجلد كامل من اللابتوب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => multipleVideosInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      <Files className="h-4 w-4 text-emerald-600" />
                      <span>📹 أو اختيار عدة ملفات معاً</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoFillEpisodes}
                      className="inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                    >
                      <span>توليد مجالس فارغة فقط</span>
                    </button>
                  </div>
                </div>
              ) : (
                courseEpisodesList.map((ep, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 shadow-xs dark:border-stone-800 dark:bg-stone-950/70 space-y-3.5"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/60 dark:border-stone-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-900 text-amber-300 font-black text-xs">
                          {ep.episodeNum}
                        </span>
                        <span className="text-xs font-bold text-stone-900 dark:text-white">
                          المجلس رقم {ep.episodeNum}
                        </span>
                        {batchProgress?.isUploading && batchProgress.current === ep.episodeNum && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                            <span>جاري رفع الفيديو الآن... ⏳</span>
                          </span>
                        )}
                        {ep.videoUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <Check className="h-3 w-3" />
                            <span>فيديو سَنَد المباشر</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* أزرار تقديم وتأخير المجلس (Move Up / Down) */}
                        <div className="flex items-center gap-0.5 rounded-xl bg-white p-0.5 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xs">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveEpisode(idx, 'up')}
                            title="تحريك المجلس لأعلى (تبكير ترتيبه)"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-emerald-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-stone-600 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === courseEpisodesList.length - 1}
                            onClick={() => handleMoveEpisode(idx, 'down')}
                            title="تحريك المجلس لأسفل (تأخير ترتيبه)"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-emerald-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-stone-600 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* قائمة نقل المجلس لموضع محدد مباشرة */}
                        {courseEpisodesList.length > 2 && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                            <span className="hidden sm:inline">نقل لـ:</span>
                            <select
                              value={ep.episodeNum}
                              onChange={(e) => handleMoveEpisodeToPosition(idx, Number(e.target.value))}
                              title="نقل هذا المجلس لموضع محدد مباشرة"
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-800 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 cursor-pointer shadow-2xs"
                            >
                              {Array.from({ length: courseEpisodesList.length }).map((_, pIdx) => (
                                <option key={pIdx + 1} value={pIdx + 1}>
                                  موضع {pIdx + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {ep.youtubeUrl && (
                          <a
                            href={ep.youtubeUrl.startsWith('http') ? ep.youtubeUrl : `https://www.youtube.com/watch?v=${ep.youtubeUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="hidden sm:inline">معاينة</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveEpisodeItem(idx)}
                          title="حذف هذا المجلس"
                          className="rounded-lg p-1 text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                          عنوان المجلس / الدرس
                        </label>
                        <input
                          type="text"
                          value={ep.title || ''}
                          onChange={(e) => handleUpdateEpisodeField(idx, 'title', e.target.value)}
                          placeholder="عنوان المجلس أو الدرس كما هو على الفيديو (بدون دلالات جودة)..."
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700/80 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                            فيديو المجلس (يوتيوب أو ملف مرفوع)
                          </label>
                          <label className="inline-flex items-center gap-1 cursor-pointer rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100 transition dark:bg-emerald-950 dark:text-emerald-300">
                            <Upload className="h-3 w-3" />
                            <span>{uploadingEpisodeIndex === idx ? 'جاري الرفع...' : '💻 رفع فيديو من اللابتوب'}</span>
                            <input
                              type="file"
                              accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.wmv,.flv,.m4v,.ts,.3gp,.ogv,.ogg,.mpg,.mpeg,*"
                              disabled={uploadingEpisodeIndex === idx}
                              onChange={(e) => handleEpisodeVideoFileUpload(e, idx)}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={ep.youtubeUrl || ep.videoUrl || ''}
                            onChange={(e) => handleUpdateEpisodeField(idx, 'youtubeUrl', e.target.value)}
                            placeholder="https://... أو معرف يوتيوب أو مسار فيديو سَنَد"
                            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 pr-8 text-xs font-mono text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700/80 dark:bg-stone-900 dark:text-stone-100"
                          />
                          <Video className="absolute right-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                          رابط ملف صوتي مخصص MP3 (اختياري)
                        </label>
                        <input
                          type="url"
                          value={ep.audioUrl || ''}
                          onChange={(e) => handleUpdateEpisodeField(idx, 'audioUrl', e.target.value)}
                          placeholder="https://.../lesson1.mp3"
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700/80 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                          وصف مختصر أو نقاط المجلس (اختياري)
                        </label>
                        <input
                          type="text"
                          value={ep.description || ''}
                          onChange={(e) => handleUpdateEpisodeField(idx, 'description', e.target.value)}
                          placeholder="أهم المسائل المبحوثة في هذا الدرس..."
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-emerald-800 focus:outline-hidden dark:border-stone-700/80 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs text-stone-400">
                إجمالي المجالس المفرعة: <strong>{courseEpisodesList.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEpisodesCourse(null)}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  disabled={isSavingEpisodes}
                  onClick={handleSaveEpisodes}
                  className="rounded-xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer disabled:opacity-50"
                >
                  حفظ وتأكيد التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد ومعاينة رفع وترتيب مجلد الفيديوهات */}
      {batchPreviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-8 space-y-4">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-amber-500 via-emerald-600 to-amber-600" />

            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <FolderUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    تأكيد رفع وترتيب مجلد الفيديوهات ({batchPreviewModal.items.length} ملفات)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    تم فرز الفيديوهات وترتيبها تلقائياً بالتسلسل الطبيعي الصحيح (1، 2، 3...).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBatchPreviewModal(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* خيارات الاستبدال أو الإلحاق إن كانت هناك مجالس قائمة */}
            {courseEpisodesList.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-stone-700 dark:bg-stone-800/60 space-y-2">
                <p className="font-bold text-stone-800 dark:text-stone-200">
                  توجد حالياً ({courseEpisodesList.length}) مجالس سابقة في هذا المتن، كيف ترغب في تطبيق الفيديوهات الجديدة؟
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700 dark:text-stone-300">
                    <input
                      type="radio"
                      name="batchMode"
                      checked={batchPreviewModal.mode === 'replace'}
                      onChange={() => setBatchPreviewModal({ ...batchPreviewModal, mode: 'replace' })}
                      className="text-emerald-800 focus:ring-emerald-800"
                    />
                    <span>استبدال كافة المجالس الحالية بهذه الفيديوهات ({batchPreviewModal.items.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700 dark:text-stone-300">
                    <input
                      type="radio"
                      name="batchMode"
                      checked={batchPreviewModal.mode === 'append'}
                      onChange={() => setBatchPreviewModal({ ...batchPreviewModal, mode: 'append' })}
                      className="text-emerald-800 focus:ring-emerald-800"
                    />
                    <span>إلحاق الفيديوهات بعد المجالس القائمة (تبدأ من المجلس {courseEpisodesList.length + 1})</span>
                  </label>
                </div>
              </div>
            )}

            {/* قائمة الفيديوهات المعاينة بالترتيب */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
                <span>المجالس المرتبة تسلسلياً:</span>
                <span>
                  إجمالي الحجم:{' '}
                  {(
                    batchPreviewModal.items.reduce((acc, i) => acc + i.file.size, 0) /
                    (1024 * 1024)
                  ).toFixed(1)}{' '}
                  ميجابايت
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-stone-200 bg-stone-50/50 p-2.5 dark:border-stone-800 dark:bg-stone-950/50 pr-1">
                {batchPreviewModal.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-2.5 text-xs shadow-2xs dark:bg-stone-900 border border-stone-100 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-950 text-amber-300 font-black text-[11px]">
                        {batchPreviewModal.mode === 'append' ? courseEpisodesList.length + idx + 1 : idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-stone-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] font-mono text-stone-400 truncate">
                          {item.file.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5 border border-stone-200 dark:border-stone-700">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBatchItem(idx, 'up')}
                          title="تحريك الملف لأعلى (تبكير ترتيبه)"
                          className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === batchPreviewModal.items.length - 1}
                          onClick={() => handleMoveBatchItem(idx, 'down')}
                          title="تحريك الملف لأسفل (تأخير ترتيبه)"
                          className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-white hover:text-emerald-900 disabled:opacity-20 transition cursor-pointer dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {item.sizeFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setBatchPreviewModal(null)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleStartBatchUpload}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 via-amber-600 to-emerald-700 px-6 py-2.5 text-xs font-black text-stone-950 hover:from-amber-400 hover:to-emerald-600 transition shadow-md cursor-pointer"
              >
                <FolderUp className="h-4 w-4" />
                <span>🚀 ابدأ الرفع التلقائي وترتيب المجالس فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة / تعديل فن شرعي */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-8">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {editingCategory?.isNew ? 'إضافة فن شرعي جديد' : `تعديل فن: ${editingCategory?.oldTitle || editingCategory?.title}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                }}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  اسم الفن الشرعي بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    setCategoryFormData((prev) => {
                      const next = { ...prev, title: newTitle }
                      if (editingCategory?.isNew && (!prev.slug || prev.slug.startsWith('science-') || prev.slug.length === 0)) {
                        const smart = analyzeScienceDiscipline(newTitle)
                        next.slug = smart.suggestedSlug
                      }
                      return next
                    })
                  }}
                  placeholder="مثال: أصول الفقه، علم الفرائض والمواريث، الفقه المقارن، المنطق..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs font-bold text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              {/* بطاقة التوجيه والذكاء التأصيلي للفن الشرعي */}
              {categoryFormData.title && categoryFormData.title.trim().length > 1 && (() => {
                const sci = analyzeScienceDiscipline(categoryFormData.title)
                return (
                  <div
                    className={`rounded-2xl border p-3.5 space-y-2 text-xs transition-all shadow-xs ${
                      sci.primaryStage === 1
                        ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40'
                        : sci.primaryStage === 2
                        ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40'
                        : 'border-purple-300 bg-purple-50/80 dark:border-purple-800 dark:bg-purple-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-700/60">
                      <div className="flex items-center gap-1.5 font-black text-stone-900 dark:text-white">
                        <Sparkles
                          className={`h-4 w-4 ${
                            sci.primaryStage === 1
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : sci.primaryStage === 2
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-purple-700 dark:text-purple-400'
                          }`}
                        />
                        <span>التحليل التأصيلي لهذا الفن الشرعي:</span>
                      </div>

                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs ${
                          sci.primaryStage === 1
                            ? 'bg-emerald-800 text-white'
                            : sci.primaryStage === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-purple-800 text-white'
                        }`}
                      >
                        مرحلة البدء الموصى بها: {sci.stageName}
                      </span>
                    </div>

                    <div className="space-y-1.5 leading-relaxed">
                      <p className="text-stone-700 dark:text-stone-300">
                        <strong className="text-stone-900 dark:text-white">الدور التأصيلي:</strong>{' '}
                        {sci.pedagogicalRole}
                      </p>
                      <p className="text-stone-600 dark:text-stone-400">
                        <strong className="text-stone-900 dark:text-white">مسار التدرج:</strong>{' '}
                        {sci.recommendedProgression}
                      </p>
                    </div>

                    {sci.classicalCanonicalTexts.stage1.length > 0 && (
                      <div className="pt-2 border-t border-stone-200/50 dark:border-stone-700/50 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="text-stone-500 dark:text-stone-400">
                          معرّف لاتيني مقترح:{' '}
                          <code className="font-mono font-bold text-stone-800 dark:text-stone-200 bg-white/70 dark:bg-stone-800 px-1.5 py-0.5 rounded-md">
                            {sci.suggestedSlug}
                          </code>
                        </span>
                        {categoryFormData.slug !== sci.suggestedSlug && (
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryFormData((prev) => ({
                                ...prev,
                                slug: sci.suggestedSlug,
                              }))
                            }
                            className="font-bold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 hover:underline cursor-pointer"
                          >
                            تطبيق المعرف المقترح ↵
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>المعرف اللاتيني (Slug) *</span>
                  <span className="text-[10px] text-stone-400 font-normal">يُستخدم في الروابط والتصنيفات</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.slug}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="مثال: aqeedah أو tafsir"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs font-mono text-stone-900 focus:border-emerald-800 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              {!editingCategory?.isNew && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-[11px] text-amber-900 leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span>تحديث تلقائي شامل:</span>
                  </div>
                  عند حفظ التعديل، سيقوم السيرفر فوراً بتحديث كافة المتون المرتبطة بهذا الفن وتغيير اسم تصنيفها للاسم الجديد، وتعميم ذلك على الفوتر وكافة صفحات المنصة.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setEditingCategory(null)
                  }}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="rounded-xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer disabled:opacity-50 dark:bg-emerald-800"
                >
                  {isSavingCategory ? 'جاري الحفظ والتعميم...' : 'حفظ الفن الشرعي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
