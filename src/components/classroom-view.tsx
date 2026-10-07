'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Bot,
  FileText,
  Plus,
  CheckCircle,
  Circle,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  User,
  ListVideo,
  Video,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileDown,
  Volume2,
  Tv,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Moon,
  Sun,
  Headphones,
  Search,
  Globe,
  Sliders,
  Radio,
  CheckSquare,
  ShieldCheck,
  Flame,
  Compass,
  Trophy,
  WifiOff,
  DownloadCloud,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowUpRight,
  ArrowLeft,
  GitBranch,
  HelpCircle,
} from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'
import { resolveCourseProgression } from '@/lib/curriculum-intelligence'
import ScholarlyStationsModal from '@/components/scholarly-stations-modal'
import VerifiedDigitalIjaza from '@/components/verified-digital-ijaza'
import CourseQuizModal from '@/components/course-quiz-modal'
import { issueCourseCertificateAction } from '@/app/actions/certificate-actions'
import { VerifiedCertificate } from '@/lib/certificate-service'
import SanadPdfReaderModal from '@/components/sanad-pdf-reader-modal'
import SanadVideoPlayer from '@/components/sanad-video-player'
import SpacedRepetitionTab from '@/components/spaced-repetition-tab'
import VerifiedSourcesTab from '@/components/verified-sources-tab'
import MatnQuickBriefModal from '@/components/matn-quick-brief-modal'
import {
  toggleCourseCompletion,
  addCourseNote,
  deleteCourseNote,
  recordEpisodeListeningAction,
  recordStudyHeartbeatAction,
  toggleEpisodeCompletionAction
} from '@/app/courses/[slug]/actions'

export interface NoteItem {
  id: string
  title?: string
  content: string
  tag: string
  created_at: string
}

interface ClassroomViewProps {
  course: MatnCourse
  relatedCourses?: MatnCourse[]
  allCourses?: MatnCourse[]
  completedCourseSlugs?: string[]
  initialNotes?: NoteItem[]
  initialIsCompleted?: boolean
  initialCompletedEpisodes?: number[]
  initialEpisodeIndex?: number
  isLoggedIn?: boolean
}

export default function ClassroomView({
  course,
  relatedCourses = [],
  allCourses = [],
  completedCourseSlugs = [],
  initialNotes = [],
  initialIsCompleted = false,
  initialCompletedEpisodes = [],
  initialEpisodeIndex = 0,
  isLoggedIn = false,
}: ClassroomViewProps) {
  const [currentCourse, setCurrentCourse] = useState<MatnCourse>(course)
  const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'spaced' | 'sources'>('notes')
  const [isQuickBriefOpen, setIsQuickBriefOpen] = useState(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(initialIsCompleted)
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [noteContent, setNoteContent] = useState('')
  const [noteTag, setNoteTag] = useState<'فائدة' | 'قاعدة' | 'مسألة' | 'استشكال'>('فائدة')
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false)
  const [showCelebrationToast, setShowCelebrationToast] = useState<boolean>(false)
  // نظام الإجازات والشهادات الرقمية الموثقة (Verified Digital Ijaza)
  const [isDirectIjazaOpen, setIsDirectIjazaOpen] = useState(false)
  const [directIjazaCert, setDirectIjazaCert] = useState<VerifiedCertificate | null>(null)
  const [isIssuingDirectIjaza, setIsIssuingDirectIjaza] = useState(false)

  // مسار التدرج المنهجي والمتطلبات السابقة
  const progression = resolveCourseProgression(currentCourse, allCourses)
  const hasPrerequisites = Boolean(progression.prerequisites && progression.prerequisites.length > 0)
  const uncompletedPrerequisites = hasPrerequisites
    ? progression.prerequisites.filter((p) => !p.slug || !completedCourseSlugs.includes(p.slug))
    : []
  const hasUncompletedPrereqs = uncompletedPrerequisites.length > 0
  const allPrereqsDone = hasPrerequisites && uncompletedPrerequisites.length === 0
  const [isProgressionOpen, setIsProgressionOpen] = useState(true)
  const [isQuizOpen, setIsQuizOpen] = useState(false)

  // فتح وإصدار الإجازة الموثقة مباشرة أو فحص استحقاقها عبر اختبار الضبط (80%)
  const handleOpenDirectIjaza = async () => {
    if (directIjazaCert) {
      setIsDirectIjazaOpen(true)
      return
    }
    // فتح اختبار الضبط أولاً للتحقق العلمي قبل منح الإجازة
    setIsQuizOpen(true)
  }

  // 1. أنماط المشغل الحديثة للمنصات التعليمية: cinema (المشغل المدمج للقاعة) أو audio (المشغل الصوتي عالي التركيز)
  const [playerMode, setPlayerMode] = useState<'cinema' | 'audio'>('cinema')
  const [preferredVideoSource, setPreferredVideoSource] = useState<'direct' | 'youtube'>('direct')
  const [isTheaterExpanded, setIsTheaterExpanded] = useState(false) // وضع توسيع المسرح العريض (Full Width)
  const [autoAdvanceNext, setAutoAdvanceNext] = useState(true) // الانتقال التلقائي للمجلس التالي
  const [filterEpisodeQuery, setFilterEpisodeQuery] = useState('') // البحث في مجالس السلسلة
  const [mountedOrigin, setMountedOrigin] = useState('') // نطاق المصدر للتحقق من أمان التضمين

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setMountedOrigin(window.location.origin)
    }
  }, [])

  // عداد مدارسة الدرس الحالي الحقيقي بالثواني
  const [lessonStudySeconds, setLessonStudySeconds] = useState(0)

  // مزامنة المتن مباشرة مع بيانات الخادم المعتمدة
  useEffect(() => {
    setCurrentCourse(course)
  }, [course])

  // حالة الحفظ التلقائي (Auto-save)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // حافظ موضع المشاهدة ورقم المجلس الحالي
  const [savedPosition, setSavedPosition] = useState<number | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(
    initialEpisodeIndex >= 0 ? initialEpisodeIndex : 0
  )
  const [isPdfReaderOpen, setIsPdfReaderOpen] = useState(false)

  // تتبع إنجاز الحلقات الفردية داخل السلسلة
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<number>>(
    new Set(initialCompletedEpisodes || [])
  )

  // نبض المدارسة التلقائي اللحظي: يحسب وقت بقاء الطالب ويزيد سجله الخادمي كل 60 ثانية
  useEffect(() => {
    const secTimer = setInterval(() => {
      setLessonStudySeconds((prev) => prev + 1)
    }, 1000)

    const heartbeatTimer = setInterval(async () => {
      if (isLoggedIn) {
        try {
          await recordStudyHeartbeatAction(course.slug, currentEpisodeIndex + 1, 1)
        } catch {}
      }
    }, 60000)

    return () => {
      clearInterval(secTimer)
      clearInterval(heartbeatTimer)
    }
  }, [course.slug, currentEpisodeIndex, isLoggedIn])

  // محادثة "صاحبك في الطلب"
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text: `يا أهلاً بيك يا بطل في مدارسة «${currentCourse.title}»! أنا صاحبك في الطلب ورفيق مذاكرتك هنا.. لو فيه أي لفظ في الشرح مش واضح، أو مسألة كلكعت معاك، اسألني فوراً وماتقلقش، هنبسطها سوا!`,
    },
  ])
  const [questionInput, setQuestionInput] = useState('')
  const [isAskingAI, setIsAskingAI] = useState(false)

  // تحميل التقدم وموضع المشاهدة عند البدء
  useEffect(() => {
    try {
      const storedCompleted = localStorage.getItem('sanad_completed_courses')
      if (storedCompleted) {
        const list: string[] = JSON.parse(storedCompleted)
        if (list.includes(currentCourse.slug)) {
          setIsCompleted(true)
        }
      }

      const storedPos = localStorage.getItem(`sanad_pos_${currentCourse.slug}`)
      if (storedPos && Number(storedPos) > 30) {
        setSavedPosition(Number(storedPos))
        setShowResumePrompt(true)
      }

      const storedEpisodes = localStorage.getItem(`sanad_episodes_${currentCourse.slug}`)
      if (storedEpisodes) {
        const parsed: number[] = JSON.parse(storedEpisodes)
        setCompletedEpisodes((prev) => new Set([...Array.from(prev), ...parsed]))
      }

      const storedNotes = localStorage.getItem(`sanad_notes_${currentCourse.slug}`)
      if (storedNotes) {
        const localNotes: NoteItem[] = JSON.parse(storedNotes)
        setNotes((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const newUnique = localNotes.filter((n) => !existingIds.has(n.id))
          return [...prev, ...newUnique]
        })
      }
    } catch {
      // LocalStorage fallback
    }
  }, [currentCourse.slug])

  const [isReversedOrder, setIsReversedOrder] = useState<boolean>(currentCourse.reversePlaylist || false)
  const [playlistVideos, setPlaylistVideos] = useState<Array<{ id: string; title: string }>>([])
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null)

  // تنظيف المعرف واستخراج المعرف الصافي سواء كان رابطاً أو ID
  const cleanId = (currentCourse.youtubeId || '').trim()
  let extractedListId = ''
  let extractedVideoId = ''

  if (cleanId.includes('list=')) {
    const m = cleanId.match(/list=([a-zA-Z0-9_-]+)/)
    if (m) extractedListId = m[1]
  }
  if (cleanId.includes('youtu.be/')) {
    const m = cleanId.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (m) extractedVideoId = m[1]
  } else if (cleanId.includes('v=')) {
    const m = cleanId.match(/v=([a-zA-Z0-9_-]+)/)
    if (m) extractedVideoId = m[1]
  }

  if (!extractedListId && (cleanId.startsWith('PL') || currentCourse.isPlaylist)) {
    extractedListId = cleanId.split('&')[0].split('?')[0]
  }
  if (!extractedVideoId && !extractedListId) {
    extractedVideoId = cleanId.split('&')[0].split('?')[0]
  }

  // جلب الفيديوهات الفعلية لقائمة التشغيل ديناميكياً لتشغيل كل مجلس برابطه المستقل وتفادي تشغيل الفيديو الأول دائماً
  useEffect(() => {
    if (!extractedListId) return
    let isCancelled = false

    fetch(`/api/youtube-playlist?list=${encodeURIComponent(extractedListId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && Array.isArray(data.videos) && data.videos.length > 0) {
          setPlaylistVideos(data.videos)
        }
      })
      .catch((err) => {
        console.warn('⚠️ [YouTube Playlist Auto-resolve Notice]:', err)
      })

    return () => {
      isCancelled = true
    }
  }, [extractedListId])

  // فحص ما إذا كان المجلس الحالي أو المتن يعتمد على فيديو مرفوع مباشرة بأي صيغة متاحة
  const isDirectVideoUrl = (url?: string) => {
    if (!url) return false
    const u = url.trim()
    return (
      u.startsWith('/api/video/') ||
      u.startsWith('/uploads/videos/') ||
      u.includes('/api/video/') ||
      /\.(mp4|m4v|webm|mov|mkv|avi|wmv|flv|ts|3gp|ogv|ogg|mpg|mpeg|m2ts|mts|vob|divx|f4v|asf)(\?.*)?$/i.test(u)
    )
  }

  const isPlaylist = Boolean(extractedListId)
  const explicitEpisodesCount = currentCourse.episodes?.length || 0
  const totalLessonsCount = explicitEpisodesCount > 0
    ? explicitEpisodesCount
    : (currentCourse.videoList && currentCourse.videoList.length > 0)
    ? currentCourse.videoList.length
    : (playlistVideos && playlistVideos.length > 0)
    ? playlistVideos.length
    : (currentCourse.totalLessons && currentCourse.totalLessons > 0)
    ? currentCourse.totalLessons
    : isPlaylist
    ? 18
    : 1

  const effectiveEpisodeIndex = isReversedOrder
    ? Math.max(0, totalLessonsCount - 1 - currentEpisodeIndex)
    : currentEpisodeIndex

  // إرسال أمر playVideoAt المباشر إلى مشغل YouTube داخل الـ iframe
  useEffect(() => {
    if (!youtubeIframeRef.current || !youtubeIframeRef.current.contentWindow) return
    const targetIdx = effectiveEpisodeIndex
    const timer = setTimeout(() => {
      try {
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideoAt',
            args: [targetIdx],
          }),
          '*'
        )
      } catch {}
    }, 400)
    return () => clearTimeout(timer)
  }, [effectiveEpisodeIndex])

  // استخراج معرّف يوتيوب النظيف من رابط كامل أو معرّف مخصص
  const extractCustomVideoId = (input?: string) => {
    if (!input || isDirectVideoUrl(input)) return ''
    const trimmed = input.trim()
    if (trimmed.includes('youtu.be/')) {
      const m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
    }
    if (trimmed.includes('watch?v=')) {
      const m = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
    }
    if (trimmed.includes('embed/')) {
      const m = trimmed.match(/embed\/([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
    }
    if (trimmed.includes('live/')) {
      const m = trimmed.match(/live\/([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
    }
    if (trimmed.includes('shorts/')) {
      const m = trimmed.match(/shorts\/([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
    }
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) return ''
    return trimmed.split('&')[0].split('?')[0].replace(/[^a-zA-Z0-9_-]/g, '')
  }

  // البحث عن بيانات المجلس المخصص المفرّع في لوحة الإدارة
  const currentEpisodeData =
    currentCourse.episodes?.find((ep) => ep.episodeNum === currentEpisodeIndex + 1) ||
    currentCourse.episodes?.[currentEpisodeIndex]

  const customEpVideoRaw = currentEpisodeData?.youtubeUrl || currentEpisodeData?.youtubeId || currentEpisodeData?.videoUrl
  const customEpVideoId = extractCustomVideoId(customEpVideoRaw)

  // نطاق البث النشط: نستخدم youtube-nocookie.com لضمان التوافق مع كافة المتصفحات دون قيود الكوكيز
  const embedBaseDomain = 'https://www.youtube-nocookie.com'

  let embedUrl = ''
  let directYouTubeUrl = ''
  let playlistYouTubeUrl = ''

  const resolvedPlaylistVideo = playlistVideos[effectiveEpisodeIndex]

  if (customEpVideoId) {
    embedUrl = `${embedBaseDomain}/embed/${customEpVideoId}?rel=0&modestbranding=1&playsinline=1`
    directYouTubeUrl = customEpVideoRaw?.startsWith('http')
      ? customEpVideoRaw
      : `https://www.youtube.com/watch?v=${customEpVideoId}`
    if (extractedListId) {
      playlistYouTubeUrl = `https://www.youtube.com/playlist?list=${extractedListId}`
    }
  } else if (currentCourse.videoList && currentCourse.videoList.length > 0) {
    const videoId = currentCourse.videoList[effectiveEpisodeIndex] || currentCourse.videoList[0]
    embedUrl = `${embedBaseDomain}/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
    directYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  } else if (resolvedPlaylistVideo?.id) {
    // تشغيل الفيديو الفعلي الحقيقي لهذا المجلس داخل قائمة التشغيل
    const vId = resolvedPlaylistVideo.id
    embedUrl = `${embedBaseDomain}/embed/${vId}?list=${extractedListId}&index=${effectiveEpisodeIndex + 1}&rel=0&modestbranding=1&playsinline=1`
    directYouTubeUrl = `https://www.youtube.com/watch?v=${vId}&list=${extractedListId}&index=${effectiveEpisodeIndex + 1}`
    playlistYouTubeUrl = `https://www.youtube.com/playlist?list=${extractedListId}`
  } else if (isPlaylist) {
    embedUrl = `${embedBaseDomain}/embed/videoseries?list=${extractedListId}&index=${effectiveEpisodeIndex}&rel=0&modestbranding=1&playsinline=1`
    directYouTubeUrl = `https://www.youtube.com/watch?list=${extractedListId}&index=${effectiveEpisodeIndex + 1}`
    playlistYouTubeUrl = `https://www.youtube.com/playlist?list=${extractedListId}`
  } else {
    embedUrl = `${embedBaseDomain}/embed/${extractedVideoId}?rel=0&modestbranding=1&playsinline=1`
    directYouTubeUrl = `https://www.youtube.com/watch?v=${extractedVideoId}`
  }

  const rawVideoUrl =
    currentEpisodeData?.videoUrl ||
    (isDirectVideoUrl(currentEpisodeData?.youtubeUrl) ? currentEpisodeData?.youtubeUrl : undefined) ||
    currentCourse.videoUrl ||
    (isDirectVideoUrl(currentCourse.youtubeId) ? currentCourse.youtubeId : undefined)

  const isDirectUploadedVideo = Boolean(rawVideoUrl)


  // ===================== المشغل الصوتي المتقدم (HTML5 Audio) =====================
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioSpeed, setAudioSpeed] = useState<number>(1)
  const [audioVolume, setAudioVolume] = useState<number>(1)
  const [isAudioMuted, setIsAudioMuted] = useState(false)

  const activeAudioSource = currentEpisodeData?.audioUrl || currentCourse.audioUrl || ''

  const togglePlayAudio = () => {
    if (!audioRef.current) return
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true)
        if (isLoggedIn) {
          recordEpisodeListeningAction(course.slug, currentEpisodeIndex + 1).catch(() => {})
        }
      }).catch(() => {
        setIsPlayingAudio(false)
      })
    }
  }

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setAudioDuration(audioRef.current.duration)
      }
    }
  }

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime
      setAudioCurrentTime(targetTime)
    }
  }

  const handleSkipAudio = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + seconds))
    }
  }

  const handleSpeedChange = (speed: number) => {
    setAudioSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setAudioVolume(val)
    setIsAudioMuted(val === 0)
    if (audioRef.current) {
      audioRef.current.volume = val
      audioRef.current.muted = val === 0
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isAudioMuted
      setIsAudioMuted(nextMute)
      audioRef.current.muted = nextMute
    }
  }

  const formatAudioTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // دالة الحفظ التلقائي للفوائد
  const performSave = useCallback(
    async (text: string, tag: 'فائدة' | 'قاعدة' | 'مسألة' | 'استشكال') => {
      if (!text.trim()) return

      setSaveStatus('saving')
      const newNote: NoteItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title: `${tag}: فائدة في المجلس ${currentEpisodeIndex + 1}`,
        content: text.trim(),
        tag: tag,
        created_at: new Date().toISOString(),
      }

      try {
        const localKey = `sanad_notes_${course.slug}`
        const existing = localStorage.getItem(localKey)
        const currentNotes: NoteItem[] = existing ? JSON.parse(existing) : []
        localStorage.setItem(localKey, JSON.stringify([newNote, ...currentNotes]))
      } catch {
        // Fallback
      }

      setNotes((prev) => [newNote, ...prev])
      setNoteContent('')

      if (isLoggedIn) {
        await addCourseNote(course.slug, text.trim(), tag)
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    },
    [course.slug, currentEpisodeIndex, isLoggedIn]
  )

  const handleNoteTextChange = (val: string) => {
    setNoteContent(val)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    if (val.trim().length > 10) {
      autoSaveTimerRef.current = setTimeout(() => {
        performSave(val, noteTag)
      }, 1500)
    }
  }

  const handleToggleCompletion = async () => {
    const nextState = !isCompleted
    setIsCompleted(nextState)

    try {
      const stored = localStorage.getItem('sanad_completed_courses')
      const currentList: string[] = stored ? JSON.parse(stored) : []
      let updatedList: string[]
      if (nextState) {
        updatedList = Array.from(new Set([...currentList, course.slug]))
      } else {
        updatedList = currentList.filter((s) => s !== course.slug)
      }
      localStorage.setItem('sanad_completed_courses', JSON.stringify(updatedList))
    } catch {
      // Fallback
    }

    if (nextState) {
      setShowCelebrationToast(true)
      setTimeout(() => setShowCelebrationToast(false), 8000)
    }

    await toggleCourseCompletion(course.slug, nextState)
  }

  const toggleEpisodeCompletion = async (epNum: number) => {
    const isCurrentlyDone = completedEpisodes.has(epNum)
    const nextState = !isCurrentlyDone

    setCompletedEpisodes((prev) => {
      const next = new Set(prev)
      if (nextState) {
        next.add(epNum)
      } else {
        next.delete(epNum)
      }

      try {
        localStorage.setItem(`sanad_episodes_${course.slug}`, JSON.stringify(Array.from(next)))
      } catch {}

      // إذا أتم الطالب كافة المجالس، يتم وسم المتن كمنجز تلقائياً وتفعيل الشهادة
      if (next.size >= totalLessonsCount && totalLessonsCount > 0) {
        setIsCompleted(true)
        setShowCelebrationToast(true)
        setTimeout(() => setShowCelebrationToast(false), 8000)
        try {
          const stored = localStorage.getItem('sanad_completed_courses')
          const currentList: string[] = stored ? JSON.parse(stored) : []
          localStorage.setItem('sanad_completed_courses', JSON.stringify(Array.from(new Set([...currentList, course.slug]))))
        } catch {}
        if (isLoggedIn) {
          toggleCourseCompletion(course.slug, true).catch(() => {})
        }
      }

      return next
    })

    if (isLoggedIn) {
      await toggleEpisodeCompletionAction(course.slug, epNum, nextState)
    }

    // الانتقال التلقائي للمجلس التالي عند الانتهاء إن كان مفصلاً ومفعلاً
    if (nextState && autoAdvanceNext && currentEpisodeIndex < totalLessonsCount - 1) {
      setTimeout(() => {
        setCurrentEpisodeIndex((prev) => Math.min(totalLessonsCount - 1, prev + 1))
      }, 700)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId))
    try {
      const localKey = `sanad_notes_${course.slug}`
      const existing = localStorage.getItem(localKey)
      if (existing) {
        const currentNotes: NoteItem[] = JSON.parse(existing)
        localStorage.setItem(localKey, JSON.stringify(currentNotes.filter((n) => n.id !== noteId)))
      }
    } catch {
      // Fallback
    }

    if (isLoggedIn) {
      await deleteCourseNote(noteId, course.slug)
    }
  }

  const handleCopyNote = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedNoteId(id)
    setTimeout(() => setCopiedNoteId(null), 2000)
  }

  const handleAskAI = async (questionText?: string) => {
    const q = (questionText || questionInput).trim()
    if (!q || isAskingAI) return

    if (!questionText) {
      setQuestionInput('')
    }

    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setIsAskingAI(true)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          courseTitle: currentCourse.title,
          categoryTitle: currentCourse.category,
          instructor: currentCourse.instructor,
          episodeTitle: currentEpisodeData?.title || `المجلس ${currentEpisodeIndex + 1}`,
          history: messages.slice(-6),
        }),
      })

      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'ai', text: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'معلش يا بطل، حصل عطل سريع في الشبكة، اسألني تاني كده بعد ثواني!' },
      ])
    } finally {
      setIsAskingAI(false)
    }
  }

  const tagColors: Record<string, string> = {
    قاعدة: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
    مسألة: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
    فائدة: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700',
    استشكال: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700',
  }

  const filteredEpisodes = Array.from({ length: totalLessonsCount }).map((_, idx) => {
    const epNum = idx + 1
    const epItem = currentCourse.episodes?.find((e) => e.episodeNum === epNum) || currentCourse.episodes?.[idx]
    const title = epItem?.title?.trim() || playlistVideos[idx]?.title || `المجلس ${epNum}`
    const description = epItem?.description || ''
    return { idx, epNum, epItem, title, description }
  }).filter((item) => {
    if (!filterEpisodeQuery.trim()) return true
    const q = filterEpisodeQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || String(item.epNum).includes(q) || item.description.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">

      {/* تنبيه الطالب الزائر لربط الكشكول */}
      {!isLoggedIn && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white/90 p-3.5 text-xs text-stone-600 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 dark:text-stone-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              أنت الآن في مجلس المدارسة كطالب زائر. تُحفظ فوائدك وموضع مشاهدتك في متصفحك مؤقتاً.
            </span>
          </div>
          <Link
            href="/login"
            className="text-emerald-800 font-bold hover:underline shrink-0 dark:text-emerald-400"
          >
            تسجيل الدخول لربط الكشكول سحابياً وحفظ إنجازك ←
          </Link>
        </div>
      )}

      {/* 1. الترويسة وأزرار التنقل والإنجاز وأدوات القاعة التعليمية */}
      <div className="flex flex-col gap-4 border-b border-stone-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400">
            <Link
              href="/courses"
              className="hover:text-emerald-900 flex items-center gap-1 transition dark:hover:text-emerald-400"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>فهرس المتون</span>
            </Link>
            <span>/</span>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {currentCourse.category}
            </span>
          </div>

          <h1 className="flex flex-wrap items-baseline gap-2.5 text-2xl font-black text-stone-900 sm:text-3xl dark:text-white leading-snug">
            <span>«{currentCourse.title}»</span>
            {currentCourse.instructor && (
              <span className="rounded-xl bg-emerald-50 px-3 py-1 text-sm sm:text-base font-extrabold text-emerald-900 border border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                الشارح: {currentCourse.instructor}
              </span>
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5 font-bold">
              {isPlaylist ? (
                <>
                  <ListVideo className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>سلسلة علمية متكاملة ({totalLessonsCount} مجلساً)</span>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>مجلس علمي كامل</span>
                </>
              )}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{completedEpisodes.size} مجالس منجزة من {totalLessonsCount}</span>
            </span>
          </div>
        </div>

        {/* زر الإجازة والشهادة الموثقة + زر المراجعة السريعة والخلاصة */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQuickBriefOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 px-3.5 py-2 text-xs font-black text-amber-950 hover:bg-amber-100 hover:border-amber-400 transition cursor-pointer dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
            title="عرض أهم مسائل ومقاصد المتن وطريقة ضبطه الموصى بها"
          >
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>خلاصة ومراجعة سريعة ⚡</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuizOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300/80 bg-emerald-50/80 px-3.5 py-2 text-xs font-black text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400 transition cursor-pointer dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
            title="اختبار ضبط مسائل المتن واستحقاق الإجازة الموثقة (نسبة الاجتياز 80%)"
          >
            <HelpCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>اختبار الضبط 📝</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDirectIjaza}
            disabled={isIssuingDirectIjaza}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-3.5 py-2 text-xs font-black text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            title="طلب إجازة قراءة وضبط موثقة برمز QR وكود تجزئة مشفر باسم المنصة"
          >
            <Award className="h-4 w-4" />
            <span>{isIssuingDirectIjaza ? 'جارٍ إصدار الإجازة...' : (isCompleted ? 'إجازة المتن الموثقة 📜' : 'طلب إجازة المتن 📜')}</span>
          </button>
        </div>
      </div>

      {/* تنبيه استئناف موضع المشاهدة */}
      {showResumePrompt && savedPosition && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-xs font-bold text-amber-950 shadow-2xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>
              أهلاً بعودتك يا بطل! توقفت سابقاً عند الدقيقة {Math.floor(savedPosition / 60)}:{String(savedPosition % 60).padStart(2, '0')}. هل تحب المتابعة؟
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResumePrompt(false)}
              className="rounded-xl bg-amber-900 px-3 py-1 text-white hover:bg-amber-950 transition cursor-pointer"
            >
              استئناف
            </button>
            <button
              onClick={() => {
                setShowResumePrompt(false)
                localStorage.removeItem(`sanad_pos_${course.slug}`)
              }}
              className="rounded-xl border border-amber-300 bg-white px-2.5 py-1 text-amber-900 hover:bg-amber-50 transition cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
            >
              من الأول
            </button>
          </div>
        </div>
      )}

      {/* 2. مسار التدرج المنهجي والمتطلبات السابقة للمتن (Methodological Progression & Prerequisites) */}
      <div className={`overflow-hidden rounded-3xl border transition-all duration-300 ${
        hasUncompletedPrereqs
          ? 'border-amber-300/90 bg-linear-to-b from-amber-50/70 via-white to-amber-50/40 dark:border-amber-900/80 dark:from-amber-950/40 dark:via-stone-900 dark:to-stone-900 shadow-sm'
          : 'border-stone-200/90 bg-linear-to-b from-[#fbf9f4] via-white to-stone-50/40 dark:border-stone-800 dark:from-stone-900/90 dark:via-stone-900 dark:to-stone-900 shadow-xs'
      }`}>
        {/* الترويسة القابلة للطي والتوسيع */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-stone-200/60 dark:border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              hasUncompletedPrereqs
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  مسار التدرج المنهجي والمتطلبات السابقة
                </h3>
                <span className={`rounded-xl px-2.5 py-0.5 text-[11px] font-bold border ${
                  progression.stage === 1
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                    : progression.stage === 2
                    ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800'
                }`}>
                  {progression.stageName}
                </span>
                {hasUncompletedPrereqs && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 animate-pulse">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    <span>يُنصح بضبط المتطلب السابق أولاً</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                توجيه منهجي لترتيب الأولويات وضبط التسلسل العلمي دون تشتت في فن {currentCourse.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              href={`/roadmap?category=${currentCourse.categorySlug || 'hadith'}`}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-emerald-700 hover:text-emerald-900 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-emerald-400"
            >
              <span>خارطة الفن الكاملة</span>
              <ArrowLeft className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setIsProgressionOpen(!isProgressionOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              title={isProgressionOpen ? 'طي مسار التدرج' : 'إظهار مسار التدرج'}
            >
              {isProgressionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* محتوى المسار المتسلسل */}
        {isProgressionOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* تنبيه إرشادي إن وُجد متطلب سابق لم يُنجز */}
            {hasUncompletedPrereqs && (
              <div className="rounded-2xl border border-amber-300/80 bg-amber-100/60 p-3.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    تنبيه منهجي لطالب العلم:
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-300">
                    بناءً على السلم التأصيلي المعتمد، يُستحسن أن تضبط متن{' '}
                    <strong>«{uncompletedPrerequisites.map((p) => p.title).join('، ')}»</strong>{' '}
                    قبل الشروع في مدارسة هذا المتن؛ لترسيخ الأصول وفهم دقائق مسائله دون عناء أو تشتت.
                  </p>
                </div>
              </div>
            )}

            {/* بطاقات المسار الثلاث: المتطلب السابق -> المتن الحالي -> المتن التالي */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. المتطلب السابق */}
              <div className="rounded-2xl border p-4 bg-white/80 dark:bg-stone-900/80 border-stone-200/90 dark:border-stone-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-400">1. نقطة الانطلاق والمتطلب:</span>
                    {hasPrerequisites ? (
                      allPrereqsDone ? (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle className="h-3.5 w-3.5" /> تم الضبط ✓
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          يُنصح بضبطه أولاً
                        </span>
                      )
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        نقطة بداية
                      </span>
                    )}
                  </div>

                  {hasPrerequisites ? (
                    <div className="space-y-2 pt-1">
                      {progression.prerequisites.map((prereq, idx) => {
                        const isDone = prereq.slug && completedCourseSlugs.includes(prereq.slug)
                        return (
                          <div key={idx} className="rounded-xl border border-stone-100 dark:border-stone-800 p-2.5 bg-stone-50/70 dark:bg-stone-800/50 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-black text-stone-900 dark:text-white leading-snug">
                                «{prereq.title}»
                              </h4>
                              {isDone ? (
                                <span className="rounded-md bg-emerald-100 text-emerald-900 px-1.5 py-0.5 text-[9px] font-bold dark:bg-emerald-950 dark:text-emerald-300">
                                  منجز ✓
                                </span>
                              ) : (
                                <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-bold dark:bg-amber-950 dark:text-amber-300">
                                  مطلوب
                                </span>
                              )}
                            </div>
                            {prereq.isAvailableOnPlatform && prereq.slug ? (
                              <Link
                                href={`/courses/${prereq.slug}`}
                                className={`inline-flex items-center gap-1 text-[11px] font-bold transition ${
                                  isDone
                                    ? 'text-stone-500 hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300'
                                    : 'text-amber-800 hover:text-amber-950 underline font-black dark:text-amber-400'
                                }`}
                              >
                                <span>{isDone ? 'مراجعة المتن ↗' : 'الانتقال لمدارسة المتن أولاً ←'}</span>
                              </Link>
                            ) : (
                              <span className="text-[10px] text-stone-400">
                                متن معتمد خارج المنصة
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-2 space-y-1">
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>متن تأسيسي مدخلي</span>
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                        هذا المتن هو عتبة البداية المعتمدة في هذا الفن، ولا يتطلب مدارسة سابقة. ابدأ مستعيناً بالله!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. المتن الحالي قيد المدارسة */}
              <div className="rounded-2xl border-2 border-emerald-600/80 bg-linear-to-b from-emerald-50/60 to-white dark:from-emerald-950/40 dark:to-stone-900 p-4 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                    <span className="flex items-center gap-1 font-mono font-black">
                      <span>2. موقعك الآن:</span>
                    </span>
                    <span className="rounded-md bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-black">
                      {isCompleted ? 'تم ضبطه ✓' : 'قيد المدارسة'}
                    </span>
                  </div>

                  <div className="pt-1">
                    <h4 className="text-sm font-black text-stone-900 dark:text-white leading-snug">
                      «{currentCourse.title}»
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed">
                      {currentCourse.pedagogicalRole || currentCourse.description || 'متن معتمد في السلم التأصيلي.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-[11px]">
                  <span className="text-stone-500 dark:text-stone-400 truncate max-w-[150px]">
                    {currentCourse.instructor ? `الشارح: ${currentCourse.instructor}` : currentCourse.category}
                  </span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    المرحلة {progression.stage}
                  </span>
                </div>
              </div>

              {/* 3. المتن التالي المقترح بعد هذا المتن */}
              <div className="rounded-2xl border p-4 bg-white/80 dark:bg-stone-900/80 border-stone-200/90 dark:border-stone-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-400">3. المتن التالي في السلم:</span>
                    <span className="text-teal-700 dark:text-teal-400 font-bold">
                      الترقية القادمة
                    </span>
                  </div>

                  {progression.nextCourses && progression.nextCourses.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {progression.nextCourses.map((nextCourse, idx) => (
                        <div key={idx} className="rounded-xl border border-stone-100 dark:border-stone-800 p-2.5 bg-stone-50/70 dark:bg-stone-800/50 space-y-1.5">
                          <h4 className="text-xs font-black text-stone-900 dark:text-white leading-snug">
                            «{nextCourse.title}»
                          </h4>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                            خطوتك المنهجية التالية بعد استكمال وضبط هذا المتن
                          </p>
                          {nextCourse.isAvailableOnPlatform && nextCourse.slug ? (
                            <Link
                              href={`/courses/${nextCourse.slug}`}
                              className="inline-flex items-center gap-1 text-[11px] font-black text-teal-800 hover:text-teal-950 transition dark:text-teal-400"
                            >
                              <span>معاينة المتن التالي ←</span>
                            </Link>
                          ) : (
                            <span className="text-[10px] text-stone-400">
                              متن تخصصي معتمد
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 space-y-1">
                      <p className="text-xs font-black text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>رتبة التمكن والرسوخ</span>
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                        هذا المتن من أمهات المتون الموسوعية في هذا الفن؛ بإتقانه تستكمل الركائز التخصصية العالية.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. منطقة العرض المتجاوبة الكبرى (مشغل الفيديو السينمائي + لوحة الأدوات والكشكول) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* الحاوية الرئيسية للمشغل التعليمي (تتوسع إلى 12 عمود في نمط المسرح) */}
        <div className={`space-y-4 transition-all duration-300 ${isTheaterExpanded ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
          {/* ===================== شريط التحكم الأنيق الموحد للمجلس ===================== */}
          <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 border-r-4 border-r-emerald-700 dark:border-r-emerald-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* عنوان المجلس وأزرار التنقل السريع */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentEpisodeIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentEpisodeIndex === 0}
                    title="المجلس السابق"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-950 disabled:opacity-30 disabled:cursor-not-allowed transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentEpisodeIndex((prev) => Math.min(totalLessonsCount - 1, prev + 1))}
                    disabled={currentEpisodeIndex >= totalLessonsCount - 1}
                    title="المجلس التالي"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-950 disabled:opacity-30 disabled:cursor-not-allowed transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
                      {currentEpisodeData?.title || `المجلس ${currentEpisodeIndex + 1}`}
                    </span>
                    <span className="rounded-lg bg-emerald-100/90 px-2 py-0.5 text-[11px] font-mono font-black text-emerald-950 border border-emerald-300/60 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                      {currentEpisodeIndex + 1} / {totalLessonsCount}
                    </span>
                    {currentEpisodeData?.duration && (
                      <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        ⏱ {currentEpisodeData.duration}
                      </span>
                    )}
                  </div>
                  {currentEpisodeData?.description && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 font-medium">
                      {currentEpisodeData.description}
                    </p>
                  )}
                </div>
              </div>

              {/* أدوات المدارسة: المؤقت، الإنجاز، المشغل الصوتي */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* مؤشر وقت الحضور */}
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber-300/70 bg-amber-50/90 px-2.5 py-1.5 text-[11px] font-black text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="font-mono">{Math.floor(lessonStudySeconds / 60)}:{String(lessonStudySeconds % 60).padStart(2, '0')}</span>
                  <span className="text-[10px]">د</span>
                </span>

                {/* زر إنجاز المجلس */}
                <button
                  type="button"
                  onClick={() => toggleEpisodeCompletion(currentEpisodeIndex + 1)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
                    completedEpisodes.has(currentEpisodeIndex + 1)
                      ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
                      : 'border border-stone-300 bg-white text-stone-700 hover:border-emerald-700 hover:text-emerald-900 hover:bg-emerald-50/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                  }`}
                >
                  {completedEpisodes.has(currentEpisodeIndex + 1) ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-amber-300" />
                      <span>تم الضبط ✓</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5 text-stone-400" />
                      <span>تحديد كمنجز</span>
                    </>
                  )}
                </button>

                {/* زر التبديل بين بث سَنَد وبث YouTube لو كلاهما متاح */}
                {isDirectUploadedVideo && embedUrl && (customEpVideoId || extractedListId || extractedVideoId) && (
                  <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white p-0.5 dark:border-stone-800 dark:bg-stone-900">
                    <button
                      type="button"
                      onClick={() => setPreferredVideoSource('direct')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        preferredVideoSource === 'direct'
                          ? 'bg-emerald-900 text-white dark:bg-emerald-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                      }`}
                    >
                      <Video className="h-3 w-3" />
                      <span>فيديو سَنَد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredVideoSource('youtube')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        preferredVideoSource === 'youtube'
                          ? 'bg-red-900 text-white dark:bg-red-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                      }`}
                    >
                      <Play className="h-3 w-3 fill-current text-red-400" />
                      <span>YouTube</span>
                    </button>
                  </div>
                )}

                {/* زر المشغل الصوتي إذا وُجد */}
                {activeAudioSource && (
                  <button
                    type="button"
                    onClick={() => setPlayerMode(playerMode === 'audio' ? 'cinema' : 'audio')}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      playerMode === 'audio'
                        ? 'border-emerald-700 bg-emerald-900 text-white dark:bg-emerald-800'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden md:inline">صوتي</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ===================== الحاوية البصرية لمشغل الفيديو ===================== */}
          {playerMode === 'cinema' && (
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-stone-900/10 dark:shadow-stone-950/70 border border-stone-200/60 dark:border-stone-800">
              {isDirectUploadedVideo && rawVideoUrl && preferredVideoSource !== 'youtube' ? (
                <SanadVideoPlayer
                  key={`${rawVideoUrl}-${currentEpisodeIndex}`}
                  src={rawVideoUrl}
                  title={currentEpisodeData?.title || `المجلس ${currentEpisodeIndex + 1}`}
                  subtitle={`«${currentCourse.title}» • ${currentCourse.instructor || 'الشارح المعتمد'}`}
                  currentEpisodeIndex={currentEpisodeIndex}
                  totalLessonsCount={totalLessonsCount}
                  isCompleted={completedEpisodes.has(currentEpisodeIndex + 1)}
                  autoAdvanceNext={autoAdvanceNext}
                  fallbackYoutubeUrl={embedUrl && (customEpVideoId || extractedListId || extractedVideoId) ? embedUrl : undefined}
                  audioUrl={activeAudioSource || undefined}
                  onSwitchToYoutube={
                    embedUrl && (customEpVideoId || extractedListId || extractedVideoId)
                      ? () => setPreferredVideoSource('youtube')
                      : undefined
                  }
                  onSwitchToAudio={activeAudioSource ? () => setPlayerMode('audio') : undefined}
                  onToggleComplete={toggleEpisodeCompletion}
                  onNextEpisode={
                    currentEpisodeIndex < totalLessonsCount - 1
                      ? () => setCurrentEpisodeIndex((prev) => Math.min(totalLessonsCount - 1, prev + 1))
                      : undefined
                  }
                  onPrevEpisode={
                    currentEpisodeIndex > 0
                      ? () => setCurrentEpisodeIndex((prev) => Math.max(0, prev - 1))
                      : undefined
                  }
                  onVideoEnded={() => {
                    toggleEpisodeCompletion(currentEpisodeIndex + 1)
                  }}
                  isTheaterExpanded={isTheaterExpanded}
                  onToggleTheaterExpanded={() => setIsTheaterExpanded(!isTheaterExpanded)}
                />
              ) : embedUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-stone-800 bg-stone-950 shadow-2xl shadow-stone-950/40 flex flex-col">
                  {/* شريط توضيح البث الاحتياطي مع زر العودة لمشغل سَنَد لو كان هناك فيديو مباشر */}
                  {isDirectUploadedVideo && rawVideoUrl && (
                    <div className="flex items-center justify-between bg-stone-900/95 border-b border-stone-800 px-4 py-2 text-xs z-10">
                      <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        أنت تشاهد حالياً عبر البث الاحتياطي على YouTube
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreferredVideoSource('direct')}
                        className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 px-3 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Video className="h-3 w-3" />
                        العودة لمشغل سَنَد المباشر
                      </button>
                    </div>
                  )}
                  <iframe
                    ref={youtubeIframeRef}
                    key={`${embedUrl}-${currentEpisodeIndex}-${isReversedOrder}`}
                    src={embedUrl}
                    title={currentEpisodeData?.title || resolvedPlaylistVideo?.title || course.title}
                    className="h-full w-full border-0 flex-1"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  {/* شريط الإسناد ورابط الفتح المباشر عند تعذر تشغيل أي iframe في بعض المتصفحات أو الحجب */}
                  <div className="flex items-center justify-between bg-stone-900/95 px-4 py-2 text-xs border-t border-stone-800 text-stone-300 shrink-0">
                    <span className="text-[11px] text-stone-400 truncate max-w-[200px]">
                      {currentEpisodeData?.title || `المجلس ${currentEpisodeIndex + 1}`}
                    </span>
                    {(directYouTubeUrl || playlistYouTubeUrl) && (
                      <a
                        href={directYouTubeUrl || playlistYouTubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>فتح المقطع على YouTube مباشرة ↗</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video w-full flex flex-col items-center justify-center rounded-3xl border border-stone-800 bg-stone-950 p-6 text-center text-stone-400 space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 border border-stone-800 text-amber-400">
                    <Video className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-stone-200 text-sm">
                      لم يتم إرفاق ملف فيديو لهذا المجلس بعد
                    </p>
                    <p className="text-xs text-stone-500">
                      يمكنك كطالب متابعة الصوتيات أو التدوين، ويمكن للمشرف رفع فيديو هذا المجلس من لوحة التحكم
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* ===================== المشغل الصوتي عالي التركيز (MP3 Audio Player) ===================== */}
          {playerMode === 'audio' && (
            <div className="rounded-3xl border border-emerald-900/30 bg-linear-to-b from-stone-900 via-emerald-950/80 to-stone-950 p-6 sm:p-8 text-white shadow-2xl space-y-6">
              {activeAudioSource ? (
                <audio
                  ref={audioRef}
                  src={activeAudioSource}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioTimeUpdate}
                  onEnded={() => {
                    setIsPlayingAudio(false)
                    toggleEpisodeCompletion(currentEpisodeIndex + 1)
                  }}
                />
              ) : null}

              {/* بطاقة معلومات الصوتية */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-800 pb-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${isPlayingAudio ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-lg shadow-amber-400/20 animate-pulse' : 'border-stone-700 bg-stone-800 text-stone-400'}`}>
                    <Headphones className="h-8 w-8" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      المشغل الصوتي عالي التركيز (MP3)
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                      {currentEpisodeData?.title || `المجلس ${currentEpisodeIndex + 1}: ${currentCourse.title}`}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      الشارح: {currentCourse.instructor || 'الشيخ'} • جودة نقية بدون استهلاك بيانات الفيديو
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPlayerMode('cinema')}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-800/80 px-3 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-700 transition"
                >
                  <Video className="h-3.5 w-3.5 text-emerald-400" />
                  <span>تبديل لمشغل الفيديو</span>
                </button>
              </div>

              {/* شريط التقدم والوقت */}
              {activeAudioSource ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      value={audioCurrentTime}
                      onChange={handleAudioSeek}
                      className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-amber-400 transition"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-400">
                    <span className="text-emerald-400">{formatAudioTime(audioCurrentTime)}</span>
                    <span>{formatAudioTime(audioDuration)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                  <p className="leading-relaxed">
                    💡 <strong>تنبيه صوتي:</strong> لم يتم إرفاق رابط MP3 مباشر لهذا المجلس بعد من لوحة الإدارة. يمكنك متابعة المجلس بالصوت والصورة عبر مشغل الفيديو المباشر.
                  </p>
                </div>
              )}

              {/* أزرار التحكم بالصوت والسرعة والتقديم */}
              {activeAudioSource && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  {/* أزرار التقديم والتأخير والتشغيل */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSkipAudio(-15)}
                      title="رجوع 15 ثانية"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-700 bg-stone-800/90 text-stone-300 hover:bg-stone-700 transition cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      title={isPlayingAudio ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
                      className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500 text-stone-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30 cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5 fill-current" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkipAudio(15)}
                      title="تقديم 15 ثانية"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-700 bg-stone-800/90 text-stone-300 hover:bg-stone-700 transition cursor-pointer"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </div>

                  {/* سرعات التشغيل */}
                  <div className="flex items-center gap-1 bg-stone-800/90 p-1 rounded-2xl border border-stone-700 text-xs font-bold">
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSpeedChange(s)}
                        className={`rounded-xl px-2.5 py-1 transition cursor-pointer ${
                          audioSpeed === s
                            ? 'bg-amber-400 text-stone-950 font-black'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* التحكم بالصوت وكتمه */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-stone-400 hover:text-white transition"
                    >
                      {isAudioMuted || audioVolume === 0 ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isAudioMuted ? 0 : audioVolume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== درج السلسلة التفاعلي الكامل لجميع المجالس (Interactive Episode Drawer) ===================== */}
          {totalLessonsCount > 1 && (
            <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/95 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ListVideo className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  <h4 className="text-sm font-black text-stone-900 dark:text-white">
                    فهرس مجالس السلسلة ({totalLessonsCount} مجلساً):
                  </h4>

                  <button
                    type="button"
                    onClick={() => setIsReversedOrder(!isReversedOrder)}
                    title="عكس ترتيب قائمة التشغيل إذا كانت مرفوعة من المجلس الأخير للأول"
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer ${
                      isReversedOrder
                        ? 'border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200'
                        : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <span>{isReversedOrder ? 'ترتيب معكوس (N ← 1)' : 'ترتيب تصاعدي (1 → N)'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-stone-500 dark:text-stone-400">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={autoAdvanceNext}
                      onChange={(e) => setAutoAdvanceNext(e.target.checked)}
                      className="rounded accent-emerald-700"
                    />
                    <span>انتقال تلقائي للمجلس التالي</span>
                  </label>
                  <span>•</span>
                  <span>المجلس الحالي: <strong>{currentEpisodeIndex + 1}</strong> من {totalLessonsCount}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    {completedEpisodes.size} منجزة
                  </span>
                </div>
              </div>

              {/* حقل البحث السريع في مجالس السلسلة */}
              {totalLessonsCount > 8 && (
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={filterEpisodeQuery}
                    onChange={(e) => setFilterEpisodeQuery(e.target.value)}
                    placeholder="ابحث برقم المجلس أو اسم الباب أو المسألة..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 pr-9 pl-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-emerald-800 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200"
                  />
                  {filterEpisodeQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterEpisodeQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 hover:text-stone-700"
                    >
                      مسح
                    </button>
                  )}
                </div>
              )}

              {/* أزرار الحلقات المرقمة والمطورة بالكامل لجميع مجالس السلسلة */}
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredEpisodes.map(({ idx, epNum, epItem, title }) => {
                  const isEpDone = completedEpisodes.has(epNum)
                  const isCurrent = currentEpisodeIndex === idx
                  const hasCustomBranch = Boolean(epItem?.videoUrl || epItem?.youtubeUrl || epItem?.youtubeId)
                  const hasAudio = Boolean(epItem?.audioUrl)

                  return (
                    <button
                      key={epNum}
                      type="button"
                      onClick={() => setCurrentEpisodeIndex(idx)}
                      title={epItem?.description || title}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer max-w-full ${
                        isCurrent
                          ? 'border-emerald-700 bg-linear-to-r from-emerald-50 to-amber-50/40 text-emerald-950 dark:from-emerald-950/80 dark:to-stone-900 dark:text-emerald-200 dark:border-emerald-500 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-stone-50 hover:text-emerald-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/80'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black ${
                        isCurrent
                          ? 'bg-emerald-900 text-amber-300 dark:bg-emerald-700 dark:text-amber-200'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                      }`}>
                        {epNum}
                      </span>

                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleEpisodeCompletion(epNum)
                        }}
                        title={isEpDone ? 'مجلس منجز ✓' : 'تحديد كمنجز'}
                        className="hover:scale-125 transition shrink-0"
                      >
                        {isEpDone ? (
                          <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-stone-300 dark:text-stone-600" />
                        )}
                      </span>
                      <span className="truncate max-w-[200px]">{title}</span>
                      {hasCustomBranch && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="فيديو سَنَد مباشر" />
                      )}
                      {hasAudio && (
                        <span title="تتوفر صوتية MP3">
                          <Headphones className="h-3 w-3 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* أزرار التنقل السريع بين المجالس */}
              <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs font-bold dark:border-stone-800">
                <button
                  type="button"
                  disabled={currentEpisodeIndex === 0}
                  onClick={() => {
                    const prev = Math.max(0, currentEpisodeIndex - 1)
                    setCurrentEpisodeIndex(prev)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-stone-700 hover:border-emerald-800 hover:text-emerald-900 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>المجلس السابق ({currentEpisodeIndex > 0 ? currentEpisodeIndex : ''})</span>
                </button>

                <div className="text-[11px] text-stone-400 hidden sm:block">
                  استخدم الأسهم أو انقر على رقم المجلس للانتقال المباشر
                </div>

                <button
                  type="button"
                  disabled={currentEpisodeIndex >= totalLessonsCount - 1}
                  onClick={() => {
                    const next = Math.min(totalLessonsCount - 1, currentEpisodeIndex + 1)
                    setCurrentEpisodeIndex(next)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-stone-700 hover:border-emerald-800 hover:text-emerald-900 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  <span>المجلس التالي ({currentEpisodeIndex + 2})</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* نبذة عن المتن وروابط المرفقات والملخص إن وجدت */}
          <div className="rounded-3xl border border-stone-200/90 bg-white/90 p-5 text-xs text-stone-600 leading-relaxed shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 dark:text-stone-300 space-y-3">
            <p className="font-medium text-stone-700 dark:text-stone-200">
              <strong className="text-stone-900 dark:text-white ml-1 font-bold">عن المتن والشرح:</strong>
              {currentCourse.description}
            </p>

            {/* مرفقات الدرس والملخصات */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              {currentCourse.pdfUrl && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* زر قراءة وتصفح الكتاب مباشرة في المنصة */}
                  <button
                    type="button"
                    onClick={() => setIsPdfReaderOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer dark:bg-emerald-800 dark:hover:bg-emerald-700"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                    <span>تصفح وقراءة الكتاب في المنصة 📖</span>
                  </button>

                  {/* زر تحميل الكتاب على الجهاز */}
                  <a
                    href={
                      currentCourse.pdfUrl.startsWith('/api/pdf/')
                        ? `${currentCourse.pdfUrl}${currentCourse.pdfUrl.includes('?') ? '&' : '?'}download=1`
                        : currentCourse.pdfUrl
                    }
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-300/80 hover:bg-amber-100 transition shadow-2xs dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>تحميل الكتاب على جهازك 📥</span>
                  </a>
                </div>
              )}
              {(currentEpisodeData?.audioUrl || currentCourse.audioUrl) && (
                <button
                  type="button"
                  onClick={() => setPlayerMode('audio')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100 transition dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  <Headphones className="h-3.5 w-3.5 text-emerald-600" />
                  <span>الاستماع للصوتية بالمشغل الصوتي (MP3)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* لوحة الأدوات والكشكول: كشكول الفوائد + صاحبك في الطلب (تتسع أو تلتصق بجانب المشغل) */}
        <div className={`flex flex-col rounded-3xl border border-stone-200/90 bg-white/95 shadow-sm overflow-hidden h-[680px] dark:border-stone-800 dark:bg-stone-900/95 transition-all duration-300 ${isTheaterExpanded ? 'lg:col-span-12' : 'lg:col-span-4'}`}>
          {/* شريط تبويبات الأدوات */}
          <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50/70 p-1 text-[11px] font-bold dark:border-stone-800 dark:bg-stone-800/60 gap-1">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center justify-center gap-1 rounded-xl py-2 transition-all cursor-pointer truncate ${
                activeTab === 'notes'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
              title="كشكول الفوائد"
            >
              <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="truncate">الفوائد ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center justify-center gap-1 rounded-xl py-2 transition-all cursor-pointer truncate ${
                activeTab === 'ai'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
              title="صاحبك في الطلب"
            >
              <Bot className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400 shrink-0" />
              <span className="truncate">المساعد</span>
            </button>

            <button
              onClick={() => setActiveTab('spaced')}
              className={`flex items-center justify-center gap-1 rounded-xl py-2 transition-all cursor-pointer truncate ${
                activeTab === 'spaced'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
              title="تعاهد المحفوظ والمراجعة المتباعدة"
            >
              <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="truncate">التعاهد ⏳</span>
            </button>

            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center justify-center gap-1 rounded-xl py-2 transition-all cursor-pointer truncate ${
                activeTab === 'sources'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
              title="التوثيق العلمي وتخريج المصادر"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">المصادر 📜</span>
            </button>
          </div>

          {/* محتوى التبويب المختار */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* التبويب 1: كشكول الطالب مع الحفظ التلقائي ووضوح الألوان */}
            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden space-y-4">
                <div className="space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200">
                      قيّد فائدة للمجلس {currentEpisodeIndex + 1}:
                    </span>
                    <div className="flex items-center gap-1">
                      {(['فائدة', 'قاعدة', 'مسألة', 'استشكال'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNoteTag(t)}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                            noteTag === t
                              ? tagColors[t]
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={noteContent}
                      onChange={(e) => handleNoteTextChange(e.target.value)}
                      placeholder="اكتب الفائدة المقيدة هنا.. (تُحفظ تلقائياً في حسابك سحابياً)..."
                      rows={3}
                      className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-800 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-50 dark:placeholder-stone-400 dark:focus:bg-stone-900 dark:focus:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-medium">
                      {saveStatus === 'saving' && (
                        <span className="text-amber-600 animate-pulse flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>جارٍ الحفظ...</span>
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                          <span>{isLoggedIn ? 'تم الحفظ سحابياً في حسابك ✓' : 'تم الحفظ في متصفحك ✓'}</span>
                        </span>
                      )}
                      {saveStatus === 'idle' && (
                        <span>
                          {isLoggedIn ? 'الحفظ السحابي الدائم مفعل' : 'تُحفظ في المتصفح تلقائياً'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => performSave(noteContent, noteTag)}
                      disabled={!noteContent.trim() || saveStatus === 'saving'}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-950 disabled:opacity-50 transition cursor-pointer dark:bg-emerald-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>حفظ الفائدة</span>
                    </button>
                  </div>
                </div>

                {/* قائمة الفوائد بأعلى وضوح لوني */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-stone-100 dark:divide-stone-800">
                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 dark:text-stone-500">
                      <FileText className="mx-auto h-8 w-8 stroke-1 text-stone-300 dark:text-stone-600" />
                      <p className="mt-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                        كشكولك خالٍ في هذا المتن
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500">
                        قيّد فوائد الشرح لتراجعها لاحقاً وتطبعها ككتيب ورقي
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="pt-2.5 group first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                              tagColors[note.tag] || 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {note.tag}
                          </span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleCopyNote(note.content, note.id)}
                              title="نسخ"
                              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md"
                            >
                              {copiedNoteId === note.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              title="حذف"
                              className="p-1 text-stone-400 hover:text-rose-700 rounded-md"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-stone-800 dark:text-stone-100 leading-relaxed font-medium whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* التبويب 2: «صاحبك في الطلب» التفاعلي بالذكاء الاصطناعي */}
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden space-y-3">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        m.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-emerald-900 text-white rounded-bl-xs dark:bg-emerald-800'
                            : 'bg-stone-100 text-stone-800 border border-stone-200/80 rounded-br-xs dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {isAskingAI && (
                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 py-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                      <span>صاحبك في الطلب بيفكك المسألة ويشرحهالك...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'فهمني المتن ده بيتكلم عن إيه ببساطة',
                    'لخصلي أهم مسألة في هذا المجلس',
                    'إيه الكلمات الصعبة اللي محتاج أفهمها؟',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleAskAI(chip)}
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-600 hover:border-emerald-800 hover:text-emerald-900 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAskAI()
                  }}
                  className="flex items-end gap-2 pt-1"
                >
                  <textarea
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAskAI()
                      }
                    }}
                    placeholder="اسأل صاحبك في الطلب عن أي مسألة في هذا المجلس... (بدون حد أقصى)"
                    rows={2}
                    className="flex-1 rounded-2xl border border-stone-200 bg-[#fbf9f4] px-3.5 py-2.5 text-xs text-stone-900 resize-none focus:border-emerald-800 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-50 dark:placeholder-stone-400 dark:focus:bg-stone-900 dark:focus:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isAskingAI || !questionInput.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-900 text-white hover:bg-emerald-950 disabled:opacity-50 transition cursor-pointer dark:bg-emerald-800 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* التبويب 3: تعاهد المحفوظ والمراجعة المتباعدة */}
            {activeTab === 'spaced' && (
              <SpacedRepetitionTab
                course={currentCourse}
                currentEpisodeIndex={currentEpisodeIndex}
              />
            )}

            {/* التبويب 4: التوثيق العلمي وتخريج المصادر المعتمدة */}
            {activeTab === 'sources' && (
              <VerifiedSourcesTab course={currentCourse} />
            )}
          </div>
        </div>
      </div>

      {/* إشعار التهنئة المبهج فور إتمام المتن */}
      {showCelebrationToast && (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col sm:flex-row items-center gap-3.5 rounded-3xl bg-linear-to-r from-emerald-950 via-stone-900 to-amber-950 p-4 sm:px-6 sm:py-4 text-white shadow-2xl border-2 border-amber-400 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl shadow-md">
            🎉
          </div>
          <div className="space-y-0.5 text-center sm:text-right">
            <h4 className="text-sm font-black text-amber-300">
              مبارك! أتممت بحمد الله ضبط متن «{course.title}»
            </h4>
            <p className="text-xs text-emerald-100">
              تم تسجيل إنجازك في السند وترقيتك في سلم المحطات والشارات!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCelebrationToast(false)
              setIsCertModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-stone-950 hover:bg-amber-300 transition cursor-pointer shadow-sm"
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>عرض شهادة الإتقان 📜</span>
          </button>
        </div>
      )}

      {/* نافذة المحطات والشارات وشهادة الإتقان */}
      <ScholarlyStationsModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        completedCourses={[course]}
        totalCoursesCount={12}
      />

      {/* نافذة الإجازة الموثقة المباشرة برمز QR وكود التجزئة المشفر */}
      {isDirectIjazaOpen && directIjazaCert && (
        <VerifiedDigitalIjaza
          certificate={directIjazaCert}
          isOpen={isDirectIjazaOpen}
          onClose={() => setIsDirectIjazaOpen(false)}
        />
      )}

      {/* عارض ملف الـ PDF المدمج للقراءة وتصفح المتن داخل المنصة */}
      {currentCourse.pdfUrl && (
        <SanadPdfReaderModal
          isOpen={isPdfReaderOpen}
          onClose={() => setIsPdfReaderOpen(false)}
          pdfUrl={currentCourse.pdfUrl}
          title={currentCourse.title}
          author={currentCourse.author}
        />
      )}

      {/* نافذة اختبار التحقق والضبط المنهجي (حد الاجتياز 80%) */}
      <CourseQuizModal
        course={currentCourse}
        studentName="طالب العلم"
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onCertificationIssued={(cert) => {
          setDirectIjazaCert(cert)
          try {
            const localCerts = localStorage.getItem('sanad_my_certificates')
            const certsList = localCerts ? JSON.parse(localCerts) : []
            if (!certsList.some((c: any) => c.id === cert.id)) {
              localStorage.setItem('sanad_my_certificates', JSON.stringify([cert, ...certsList]))
            }
          } catch {}
        }}
      />

      {/* نافذة المراجعة السريعة وأهم مسائل المتن */}
      <MatnQuickBriefModal
        course={currentCourse}
        isOpen={isQuickBriefOpen}
        onClose={() => setIsQuickBriefOpen(false)}
      />
    </div>
  )
}
