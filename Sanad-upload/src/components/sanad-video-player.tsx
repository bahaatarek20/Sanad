'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  Clock,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Repeat,
  Camera,
  Keyboard,
  Zap,
  Check,
  X,
  Timer,
  Bookmark,
  BookmarkPlus,
  Eye,
  Rocket,
  Trash2,
  ExternalLink,
  Headphones,
  AlertTriangle,
} from 'lucide-react'

interface BookmarkItem {
  id: string
  time: number
  label: string
}

interface SanadVideoPlayerProps {
  src: string
  title: string
  subtitle?: string
  currentEpisodeIndex: number
  totalLessonsCount: number
  isCompleted?: boolean
  autoAdvanceNext?: boolean
  onToggleComplete?: (epNum: number) => void
  onNextEpisode?: () => void
  onPrevEpisode?: () => void
  onVideoEnded?: () => void
  isTheaterExpanded?: boolean
  onToggleTheaterExpanded?: () => void
  fallbackYoutubeUrl?: string
  audioUrl?: string
  onSwitchToYoutube?: () => void
  onSwitchToAudio?: () => void
}

export default function SanadVideoPlayer({
  src,
  title,
  subtitle,
  currentEpisodeIndex,
  totalLessonsCount,
  autoAdvanceNext = true,
  onToggleComplete,
  onNextEpisode,
  onPrevEpisode,
  onVideoEnded,
  isTheaterExpanded = false,
  onToggleTheaterExpanded,
  fallbackYoutubeUrl,
  audioUrl,
  onSwitchToYoutube,
  onSwitchToAudio,
}: SanadVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)

  // Web Audio API لتضخيم الصوت الرقمي وتحسين مخارج حروف الشيخ (100% -> 150% -> 200%)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [audioBoost, setAudioBoost] = useState<number>(1) // 1x, 1.5x, 2x

  // سرعة التشغيل حتى 3x
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)
  const [isPiPActive, setIsPiPActive] = useState(false)
  const [isLooping, setIsLooping] = useState(false)

  // النوافذ المنبثقة والقوائم
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [showBookmarksModal, setShowBookmarksModal] = useState(false)
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)
  const [snapshotToast, setSnapshotToast] = useState(false)

  // العلامات المرجعية والوقفات العلمية
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])

  // نمط تعزيز وضوح السبورة والمخطوطة
  const [visualClarityMode, setVisualClarityMode] = useState<'normal' | 'clarity' | 'reading'>('normal')

  // وميض النقر المزدوج (Double-tap Ripple)
  const [rippleSide, setRippleSide] = useState<'left' | 'right' | null>(null)
  const [centerIconState, setCenterIconState] = useState<'play' | 'pause' | 'skip-fwd' | 'skip-back' | 'speed' | 'boost' | null>(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)

  const pendingSeekTimeRef = useRef<number | null>(null)
  const [hasPlaybackError, setHasPlaybackError] = useState(false)
  const [playbackErrorMessage, setPlaybackErrorMessage] = useState<string | null>(null)
  const [autoFallbackCountdown, setAutoFallbackCountdown] = useState<number | null>(null)

  const cleanSrc = (src || '').replace(/^[\/\\]+|[\/\\]+$/g, '').trim()

  useEffect(() => {
    if (hasPlaybackError && (onSwitchToYoutube || fallbackYoutubeUrl)) {
      setAutoFallbackCountdown(3)
      const interval = setInterval(() => {
        setAutoFallbackCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            if (onSwitchToYoutube) {
              onSwitchToYoutube()
            }
            return null
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setAutoFallbackCountdown(null)
    }
  }, [hasPlaybackError, onSwitchToYoutube, fallbackYoutubeUrl])

  // قفل وحماية عمليات القفز بالماوس لمنع إطلاق حدث انتهاء المقطع العرضي (Seek Guard)
  const isSeekingRef = useRef<boolean>(false)
  const lastSeekTimeRef = useRef<number>(0)
  const seekTargetTimeRef = useRef<number | null>(null)
  const seekClearTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDragEndTimeRef = useRef<number>(0)

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // قائمة سرعات التشغيل الموسعة بالكامل حتى 3.5x
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5]
  const quickSpeedPresets = [1, 1.25, 1.5, 1.75, 2, 2.5, 3]

  // تهيئة سرعة التشغيل ومستوى الصوت عند تحميل الفيديو أو تغييره
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
      videoRef.current.loop = isLooping
    }
  }, [src, playbackSpeed, volume, isMuted, isLooping])

  // استعادة موضع المشاهدة والعلامات المرجعية المحفوظة لهذا الفيديو بأمان بعد تحميل الميتاداتا
  useEffect(() => {
    setHasPlaybackError(false)
    setPlaybackErrorMessage(null)

    try {
      const savedKey = `sanad_vid_pos_${encodeURIComponent(src)}`
      const pos = localStorage.getItem(savedKey)
      if (pos && Number(pos) > 10) {
        pendingSeekTimeRef.current = Number(pos)
      } else {
        pendingSeekTimeRef.current = null
      }
    } catch {
      pendingSeekTimeRef.current = null
    }

    try {
      const bmKey = `sanad_bookmarks_${encodeURIComponent(src)}`
      const savedBm = localStorage.getItem(bmKey)
      if (savedBm) {
        setBookmarks(JSON.parse(savedBm))
      } else {
        setBookmarks([])
      }
    } catch {
      setBookmarks([])
    }
  }, [src])

  // حفظ موضع المشاهدة دورياً
  useEffect(() => {
    if (currentTime > 5 && src) {
      try {
        const savedKey = `sanad_vid_pos_${encodeURIComponent(src)}`
        // إذا شارف الفيديو على الانتهاء نحذف الموضع المحفوظ لكي يبدأ المجلس من بدايته عند العودة
        if (duration > 0 && currentTime >= duration - 4) {
          localStorage.removeItem(savedKey)
        } else {
          localStorage.setItem(savedKey, Math.floor(currentTime).toString())
        }
      } catch {}
    }
  }, [currentTime, src, duration])

  // مؤقت النوم والمدارسة (Sleep / Study Timer)
  useEffect(() => {
    if (sleepTimerRemaining === null) return
    if (sleepTimerRemaining <= 0) {
      if (videoRef.current) {
        videoRef.current.pause()
        setIsPlaying(false)
      }
      setSleepTimerMinutes(null)
      setSleepTimerRemaining(null)
      showFeedback('انتهى مؤقت المدارسة وتم إيقاف التشغيل ⏱')
      return
    }

    const t = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(t)
  }, [sleepTimerRemaining])

  // إدارة إخفاء وإظهار أشرطة التحكم تلقائياً
  const resetControlsTimeout = useCallback(() => {
    setIsControlsVisible(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false)
        setShowSpeedMenu(false)
        setShowTimerMenu(false)
      }, 2800)
    }
  }, [isPlaying])

  const handleMouseMove = () => {
    resetControlsTimeout()
  }

  const showCenterAnimation = (type: 'play' | 'pause' | 'skip-fwd' | 'skip-back' | 'speed' | 'boost', text?: string) => {
    setCenterIconState(type)
    if (text) setFeedbackText(text)
    setTimeout(() => {
      setCenterIconState(null)
      setFeedbackText(null)
    }, 650)
  }

  const showFeedback = (text: string) => {
    setFeedbackText(text)
    setTimeout(() => {
      setFeedbackText(null)
    }, 1600)
  }

  // تشغيل / إيقاف مؤقت
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          showCenterAnimation('play')
          resetControlsTimeout()
        })
        .catch(() => {})
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
      showCenterAnimation('pause')
      setIsControlsVisible(true)
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [resetControlsTimeout])

  // تقديم وتأخير 10 ثوانٍ
  const skipTime = useCallback(
    (seconds: number) => {
      if (!videoRef.current) return
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
      showCenterAnimation(seconds > 0 ? 'skip-fwd' : 'skip-back')
      resetControlsTimeout()
    },
    [duration, resetControlsTimeout]
  )

  // النقر الذكي: نقر مفرد للتشغيل، ونقر مزدوج على الجوانب للتقديم/التأخير
  const handleVideoAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now()
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickRatio = clickX / width

    if (now - lastClickTimeRef.current < 320) {
      // نقر مزدوج
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }

      if (clickRatio < 0.35) {
        // تأخير 10 ثوانٍ
        skipTime(-10)
        setRippleSide('left')
        setTimeout(() => setRippleSide(null), 550)
      } else if (clickRatio > 0.65) {
        // تقديم 10 ثوانٍ
        skipTime(10)
        setRippleSide('right')
        setTimeout(() => setRippleSide(null), 550)
      } else {
        // بالوسط: تبديل ملء الشاشة
        toggleFullscreen()
      }
    } else {
      // نقر مفرد عادي
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay()
      }, 240)
    }
    lastClickTimeRef.current = now
  }

  // تحديث وقت الفيديو وشريط التخزين المؤقت
  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)

    if (videoRef.current.buffered.length > 0 && videoRef.current.duration) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
      setBufferedPercent((bufferedEnd / videoRef.current.duration) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0
      setDuration(dur)
      setHasPlaybackError(false)

      if (pendingSeekTimeRef.current && pendingSeekTimeRef.current > 10 && dur > 15) {
        const target = Math.min(pendingSeekTimeRef.current, Math.max(0, dur - 5))
        if (target > 0 && isFinite(target)) {
          try {
            videoRef.current.currentTime = target
          } catch {}
        }
      }
      pendingSeekTimeRef.current = null
    }
  }

  // تنفيذ القفز بدقة عالية وحماية حالة المشغل
  const performSeek = useCallback(
    (targetTime: number) => {
      if (!videoRef.current || !isFinite(targetTime) || targetTime < 0) return

      const realDuration = videoRef.current.duration || duration || 0
      const maxAvailable = realDuration > 0 ? Math.max(0, realDuration - 0.5) : targetTime
      const clampedTime = Math.max(0, Math.min(maxAvailable, targetTime))

      isSeekingRef.current = true
      lastSeekTimeRef.current = Date.now()
      seekTargetTimeRef.current = clampedTime

      if (seekClearTimeoutRef.current) {
        clearTimeout(seekClearTimeoutRef.current)
      }

      try {
        videoRef.current.currentTime = clampedTime
      } catch (err) {
        console.error('Error applying currentTime:', err)
      }

      setCurrentTime(clampedTime)
      resetControlsTimeout()

      // حماية ممتدة لمدة 3.5 ثوانٍ لمنع انتهاء المقطع خطأ أثناء جلب أجزاء الفيديو
      seekClearTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false
      }, 3500)
    },
    [duration, resetControlsTimeout]
  )

  // معالجة النقر والسحب على شريط التقدم بالماوس لاختيار أي دقيقة بحرية كاملة
  const calculateSeekTime = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current) return null
      const realDur = videoRef.current?.duration || duration
      if (!realDur || !isFinite(realDur) || realDur <= 0) return null
      const rect = progressBarRef.current.getBoundingClientRect()
      if (rect.width <= 0) return null
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left))
      const percent = Math.max(0, Math.min(0.995, clickX / rect.width))
      const targetTime = percent * realDur
      return Math.max(0, Math.min(Math.max(0, realDur - 0.5), targetTime))
    },
    [duration]
  )

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    // إذا كان الماوس في حالة سحب للتو فلا نكرر القفز
    if (Date.now() - lastDragEndTimeRef.current < 250) return

    const newTime = calculateSeekTime(e.clientX)
    if (newTime !== null) {
      performSeek(newTime)
    }
  }

  const isDraggingProgressRef = useRef(false)

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isDraggingProgressRef.current = true
    const newTime = calculateSeekTime(e.clientX)
    if (newTime !== null) {
      performSeek(newTime)
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingProgressRef.current) return
      const dragTime = calculateSeekTime(moveEvent.clientX)
      if (dragTime !== null && isFinite(dragTime)) {
        setCurrentTime(dragTime)
        if (videoRef.current) {
          try {
            videoRef.current.currentTime = dragTime
          } catch {}
        }
      }
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      isDraggingProgressRef.current = false
      lastDragEndTimeRef.current = Date.now()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      const finalTime = calculateSeekTime(upEvent.clientX)
      if (finalTime !== null) {
        performSeek(finalTime)
      }
      resetControlsTimeout()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || !isFinite(duration) || duration <= 0) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    setHoverTime(percent * duration)
    setHoverPosition(clickX)
  }

  const handleProgressBarLeave = () => {
    setHoverTime(null)
    setHoverPosition(null)
  }

  // التحكم بالصوت وكتمه
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol)
    setIsMuted(newVol === 0)
    if (videoRef.current) {
      videoRef.current.volume = newVol
      videoRef.current.muted = newVol === 0
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    setIsMuted(next)
    videoRef.current.muted = next
    if (!next && volume === 0) {
      handleVolumeChange(0.5)
    }
  }

  // تضخيم الصوت الرقمي وتحسين مخارج حروف الشيخ (Boost: 100% -> 150% -> 200%)
  const handleToggleAudioBoost = () => {
    const nextBoost = audioBoost === 1 ? 1.5 : audioBoost === 1.5 ? 2 : 1
    setAudioBoost(nextBoost)

    try {
      if (!audioContextRef.current && videoRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()
        const source = ctx.createMediaElementSource(videoRef.current)
        const gain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        // تعزيز ترددات الصوت البشري ونبرة الشارح (1.8kHz - 3kHz)
        filter.type = 'peaking'
        filter.frequency.value = 2200
        filter.gain.value = 3
        filter.Q.value = 1.2

        source.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        audioContextRef.current = ctx
        gainNodeRef.current = gain
        filterNodeRef.current = filter
        sourceNodeRef.current = source
      }

      if (gainNodeRef.current && audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
        }
        gainNodeRef.current.gain.value = nextBoost
      }
      showCenterAnimation('boost', `مضخم الصوت الرقمي: ${Math.round(nextBoost * 100)}% 🔊`)
    } catch {
      showCenterAnimation('boost', `مضخم الصوت الرقمي: ${Math.round(nextBoost * 100)}% 🔊`)
    }
  }

  // سرعة التشغيل الموسعة حتى 3x وما بعدها مع إمكانية التحديد المباشر أو الزيادة/النقصان بـ 0.1x
  const handleSpeedSelect = (speed: number) => {
    const clamped = Math.max(0.25, Math.min(3.5, Number(speed.toFixed(2))))
    setPlaybackSpeed(clamped)
    if (videoRef.current) {
      videoRef.current.playbackRate = clamped
    }
    setShowSpeedMenu(false)
    showCenterAnimation('speed', clamped >= 2.5 ? `سرعة فائقة: ${clamped}x 🚀` : `السرعة: ${clamped}x`)
    resetControlsTimeout()
  }

  // زيادة أو إنقاص السرعة تدريجياً بمقدار 0.1x عند الضغط على + أو -
  const adjustSpeedDelta = (delta: number) => {
    const current = Number(playbackSpeed.toFixed(1))
    const next = Number((current + delta).toFixed(1))
    const clamped = Math.max(0.25, Math.min(3.5, next))
    setPlaybackSpeed(clamped)
    if (videoRef.current) {
      videoRef.current.playbackRate = clamped
    }
    showCenterAnimation('speed', clamped >= 2.5 ? `سرعة فائقة: ${clamped}x 🚀` : `السرعة: ${clamped}x`)
    resetControlsTimeout()
  }

  // وضع صورة داخل صورة (PiP)
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPiPActive(false)
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture()
        setIsPiPActive(true)
      }
    } catch (err) {
      console.error('Error toggling PiP:', err)
    }
  }

  // تكرار المجلس (Loop)
  const toggleLoop = () => {
    const next = !isLooping
    setIsLooping(next)
    if (videoRef.current) {
      videoRef.current.loop = next
    }
    showFeedback(next ? 'تم تفعيل تكرار المجلس للمراجعة 🔁' : 'تم إلغاء التكرار')
  }

  // أخذ لقطة شاشة من الشرح للكشكول (Capture Snapshot)
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return
    try {
      const v = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth || 1280
      canvas.height = v.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `sanad-${title.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}-${Math.floor(currentTime)}s.jpg`
        a.click()
        setSnapshotToast(true)
        setTimeout(() => setSnapshotToast(false), 3000)
      }
    } catch {
      showFeedback('تعذر حفظ اللقطة تلقائياً')
    }
  }

  // إضافة علامة مرجعية / وقفة علمية عند اللحظة الحالية
  const handleAddBookmark = () => {
    if (!videoRef.current || duration <= 0) return
    const sec = Math.floor(videoRef.current.currentTime)
    if (bookmarks.some((b) => Math.abs(b.time - sec) < 2)) {
      showFeedback('يوجد وقفة مرجعية مسجلة في هذا الموضع بالفعل 🔖')
      return
    }

    const newBm: BookmarkItem = {
      id: String(Date.now()),
      time: sec,
      label: `وقفة علمية عند ${formatTime(sec)}`,
    }
    const updated = [...bookmarks, newBm].sort((a, b) => a.time - b.time)
    setBookmarks(updated)
    try {
      localStorage.setItem(`sanad_bookmarks_${encodeURIComponent(src)}`, JSON.stringify(updated))
    } catch {}
    showFeedback(`تم حفظ الوقفة عند ${formatTime(sec)} 🔖`)
  }

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id)
    setBookmarks(updated)
    try {
      localStorage.setItem(`sanad_bookmarks_${encodeURIComponent(src)}`, JSON.stringify(updated))
    } catch {}
    showFeedback('تم حذف الوقفة')
  }

  // تبديل نمط وضوح السبورة والمخطوطة
  const toggleVisualClarity = () => {
    const next =
      visualClarityMode === 'normal'
        ? 'clarity'
        : visualClarityMode === 'clarity'
        ? 'reading'
        : 'normal'
    setVisualClarityMode(next)
    showFeedback(
      next === 'clarity'
        ? 'وضع وضوح السبورة والمخطوطات (تباين عالٍ) 🌟'
        : next === 'reading'
        ? 'وضع القراءة الليلية الهادئة (حماية العين) 🌙'
        : 'إعادة الألوان القياسية'
    )
  }

  const getVideoFilterStyle = () => {
    switch (visualClarityMode) {
      case 'clarity':
        return 'contrast(120%) brightness(108%) saturate(108%)'
      case 'reading':
        return 'brightness(95%) sepia(20%) contrast(105%)'
      default:
        return 'none'
    }
  }

  // ملء الشاشة الكامل
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // اختصارات لوحة المفاتيح التفاعلية الذكية
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable'))
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // القفز بالنسبة المئوية عبر الأرقام 0-9
      if (/^[0-9]$/.test(key) && duration > 0 && videoRef.current) {
        e.preventDefault()
        const targetSec = (Number(key) / 10) * duration
        videoRef.current.currentTime = targetSec
        setCurrentTime(targetSec)
        showFeedback(`انتقال إلى ${Number(key) * 10}%`)
        return
      }

      switch (key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'arrowright':
        case 'l':
          e.preventDefault()
          skipTime(10)
          break
        case 'arrowleft':
        case 'j':
          e.preventDefault()
          skipTime(-10)
          break
        case 'arrowup':
          e.preventDefault()
          handleVolumeChange(Math.min(1, volume + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          handleVolumeChange(Math.max(0, volume - 0.1))
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'r':
          e.preventDefault()
          toggleLoop()
          break
        case 's':
          e.preventDefault()
          handleCaptureSnapshot()
          break
        case 'b':
          e.preventDefault()
          handleAddBookmark()
          break
        case 'c':
          e.preventDefault()
          toggleVisualClarity()
          break
        case '+':
        case '=':
        case ']':
        case '>':
          e.preventDefault()
          adjustSpeedDelta(0.1)
          break
        case '-':
        case '_':
        case '[':
        case '<':
          e.preventDefault()
          adjustSpeedDelta(-0.1)
          break
        case '?':
          e.preventDefault()
          setShowShortcutsModal((prev) => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, skipTime, volume, toggleFullscreen, duration, playbackSpeed, isLooping, bookmarks, visualClarityMode])

  // تنسيق الوقت بالأرقام الأنيقة (ساعة:دقيقة:ثانية)
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00'
    const totalSeconds = Math.floor(secs)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setIsControlsVisible(false)
          setShowSpeedMenu(false)
          setShowTimerMenu(false)
        }
      }}
      className={`group relative aspect-video w-full overflow-hidden rounded-3xl bg-stone-950 select-none shadow-2xl transition-all ${
        isFullscreen
          ? 'rounded-none h-screen w-screen border-0'
          : 'border border-stone-800/90 dark:border-stone-800'
      }`}
    >
      {/* منطقة الفيديو التفاعلية مع النقر المزدوج وفلتر الوضوح */}
      <div
        onClick={handleVideoAreaClick}
        className="relative h-full w-full cursor-pointer flex items-center justify-center bg-black"
      >
        <video
          ref={videoRef}
          src={cleanSrc}
          playsInline
          preload="auto"
          style={{ filter: getVideoFilterStyle() }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={() => {
            setHasPlaybackError(false)
            setPlaybackErrorMessage(null)
            setAutoFallbackCountdown(null)
          }}
          onError={() => {
            setHasPlaybackError(true)
            const err = videoRef.current?.error
            if (onSwitchToYoutube || fallbackYoutubeUrl) {
              setPlaybackErrorMessage('الملف غير مكتمل أو ترميزه غير مدعوم في المتصفح. يتوفر بث YouTube المباشر لهذا المجلس.')
            } else if (err?.code === 4) {
              setPlaybackErrorMessage('الملف غير مكتمل أو صيغته وترميزه غير مدعومين في المتصفح. قد يكون حجمه تجاوز حد الرفع القديم.')
            } else {
              setPlaybackErrorMessage('تعذر تشغيل هذا المقطع مباشرة في المتصفح.')
            }
          }}
          onSeeking={() => {
            isSeekingRef.current = true
            lastSeekTimeRef.current = Date.now()
          }}
          onSeeked={() => {
            if (seekClearTimeoutRef.current) clearTimeout(seekClearTimeoutRef.current)
            seekClearTimeoutRef.current = setTimeout(() => {
              isSeekingRef.current = false
            }, 1800)
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            if (isLooping) {
              if (videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play().catch(() => {})
              }
              return
            }

            // حماية فائقة 1: منع تخطي المقطع إذا كان المستخدم قد نقر أو قفز بالماوس للتو
            const timeSinceSeek = Date.now() - lastSeekTimeRef.current
            if (isSeekingRef.current || timeSinceSeek < 3500) {
              console.warn('SanadVideoPlayer: onEnded suppressed due to seeking', {
                timeSinceSeek,
                seekTarget: seekTargetTimeRef.current,
                duration,
              })

              // إذا انتهى المقطع لأن الملف مقتطع في الخادم قبل هذه الدقيقة
              if (
                seekTargetTimeRef.current !== null &&
                duration > 0 &&
                seekTargetTimeRef.current < duration - 5
              ) {
                showFeedback('تنبيه: لا تتوفر بيانات في المقطع بعد هذا الموضع')
                if (videoRef.current) {
                  videoRef.current.pause()
                }
              }
              return
            }

            // حماية فائقة 2: التحقق الصارم من وصول المقطع لنهايته الحقيقية الطبيعية
            const realDuration = videoRef.current?.duration || duration
            if (!videoRef.current || realDuration <= 0) return

            const isTrulyAtEnd = Math.abs(videoRef.current.currentTime - realDuration) <= 2.5
            if (!isTrulyAtEnd) {
              console.warn('SanadVideoPlayer: onEnded ignored because currentTime is not at duration end')
              return
            }

            if (onVideoEnded) onVideoEnded()
            if (onToggleComplete) onToggleComplete(currentEpisodeIndex + 1)
            if (autoAdvanceNext && onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1) {
              setTimeout(onNextEpisode, 600)
            }
          }}
          className="h-full w-full object-contain pointer-events-none transition-[filter] duration-300"
        />

        {/* واجهة استدراك الخطأ الذكية والشاملة لمنع تعطل المنصة نهائياً */}
        {hasPlaybackError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-stone-950/95 p-6 text-center backdrop-blur-md animate-in fade-in duration-300"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Tv className="h-7 w-7 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-1.5">
              مشكلة في فك ترميز ملف الفيديو
            </h3>
            <p className="max-w-md text-xs text-stone-300 mb-3 leading-relaxed">
              {playbackErrorMessage || 'قد يكون هذا الملف قُطع أثناء الرفع أو أن صيغته غير متوافقة مع متصفحك.'}
            </p>

            {autoFallbackCountdown !== null && onSwitchToYoutube && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-rose-950/80 border border-rose-500/50 px-3.5 py-1.5 text-xs font-bold text-rose-200">
                <Play className="h-3.5 w-3.5 fill-current text-rose-400 animate-spin" />
                <span>جاري نقلك تلقائياً لبث YouTube البديل خلال ({autoFallbackCountdown}) ثوانٍ...</span>
                <button
                  type="button"
                  onClick={() => setAutoFallbackCountdown(null)}
                  className="mr-1 text-[10px] text-stone-400 hover:text-white underline cursor-pointer"
                >
                  إلغاء النقل التلقائي
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg">
              {onSwitchToYoutube && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoFallbackCountdown(null)
                    onSwitchToYoutube()
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xl transition cursor-pointer hover:scale-105"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>⚡ تشغيل فوري عبر بث YouTube المباشر</span>
                </button>
              )}

              {onSwitchToAudio && audioUrl && (
                <button
                  type="button"
                  onClick={onSwitchToAudio}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/50 px-4 py-2 text-xs font-bold text-emerald-200 transition cursor-pointer"
                >
                  <Headphones className="h-4 w-4 text-emerald-400" />
                  <span>الاستماع للصوتية (MP3) 🎧</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  window.open(cleanSrc, '_blank')
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-700 bg-stone-900 hover:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-200 transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                <span>فتح المقطع في تبويب مستقل للمتصفح ↗️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasPlaybackError(false)
                  setAutoFallbackCountdown(null)
                  pendingSeekTimeRef.current = null
                  try {
                    localStorage.removeItem(`sanad_vid_pos_${encodeURIComponent(src)}`)
                  } catch {}
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0
                    videoRef.current.load()
                    videoRef.current.play().catch(() => {})
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-700 bg-stone-900/90 hover:bg-stone-800 px-3.5 py-2 text-xs font-bold text-stone-300 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة المحاولة 🔄</span>
              </button>

              <a
                href={cleanSrc}
                download
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-800 bg-stone-950 hover:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition"
              >
                <span>تحميل المقطع على جهازك 📥</span>
              </a>
            </div>
          </div>
        )}

        {/* تأثيرات وميض النقر المزدوج (Ripple Seek Effects) */}
        {rippleSide === 'left' && (
          <div className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-center bg-white/10 backdrop-blur-xs rounded-r-full pointer-events-none animate-in fade-in zoom-in-75 duration-200">
            <div className="flex flex-col items-center gap-1 text-white font-black text-sm drop-shadow-lg">
              <RotateCcw className="h-8 w-8 animate-spin" />
              <span>10- ثوانٍ</span>
            </div>
          </div>
        )}

        {rippleSide === 'right' && (
          <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-center bg-white/10 backdrop-blur-xs rounded-l-full pointer-events-none animate-in fade-in zoom-in-75 duration-200">
            <div className="flex flex-col items-center gap-1 text-white font-black text-sm drop-shadow-lg">
              <RotateCw className="h-8 w-8 animate-spin" />
              <span>10+ ثوانٍ</span>
            </div>
          </div>
        )}
      </div>

      {/* الرسوم المتحركة في وسط الشاشة عند التفاعل (Play/Pause/Speed/Boost) */}
      {(centerIconState || feedbackText) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-black/80 backdrop-blur-md px-6 py-4 text-white border border-amber-400/50 shadow-2xl">
            {centerIconState === 'play' && <Play className="h-10 w-10 fill-current text-amber-300 translate-x-0.5" />}
            {centerIconState === 'pause' && <Pause className="h-10 w-10 fill-current text-amber-300" />}
            {centerIconState === 'skip-fwd' && <RotateCw className="h-10 w-10 text-amber-300" />}
            {centerIconState === 'skip-back' && <RotateCcw className="h-10 w-10 text-amber-300" />}
            {centerIconState === 'speed' && <Zap className="h-10 w-10 text-amber-300" />}
            {centerIconState === 'boost' && <Volume2 className="h-10 w-10 text-emerald-400" />}
            {feedbackText && (
              <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wide text-center">
                {feedbackText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* تنبيه أخذ لقطة الشاشة */}
      {snapshotToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-emerald-900/95 border border-emerald-400/60 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4 text-amber-300" />
          <span>تم التقاط الشاشة وحفظها للكشكول بنجاح! 📸</span>
        </div>
      )}

      {/* تدرج التعتيم العلوي عالي التباين: عنوان المجلس وشارات الجودة وأزرار الأدوات */}
      <div
        className={`absolute top-0 right-0 left-0 z-20 flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-black/95 via-black/80 to-transparent transition-opacity duration-300 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-950 text-amber-300 font-black text-xs border border-emerald-500/60 shadow-md">
            {currentEpisodeIndex + 1}
          </span>
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] font-medium text-stone-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* شارة مؤقت المدارسة إن كان مفعلاً */}
          {sleepTimerRemaining !== null && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/30 border border-amber-400/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow-md">
              <Clock className="h-3 w-3 animate-spin" />
              <span>
                {Math.floor(sleepTimerRemaining / 60)}:{String(sleepTimerRemaining % 60).padStart(2, '0')}
              </span>
            </span>
          )}

          {/* شارة سرعة التشغيل حتى 3x وما فوق */}
          {playbackSpeed !== 1 && (
            <span
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-black shadow-md ${
                playbackSpeed >= 2.5
                  ? 'bg-amber-400 text-stone-950 shadow-amber-400/30 animate-pulse'
                  : 'bg-amber-400 text-stone-950'
              }`}
            >
              {playbackSpeed >= 2.5 ? <Rocket className="h-3 w-3" /> : <Zap className="h-3 w-3 fill-current" />}
              <span>{playbackSpeed}x</span>
            </span>
          )}

          {/* شارة توثيق الجودة العالية المباشرة */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/75 border border-emerald-400/50 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HD • فيديو سَنَد المباشر</span>
          </span>

          {/* زر التبديل السريع إلى بث YouTube الاحتياطي لو متاح */}
          {onSwitchToYoutube && (
            <button
              type="button"
              onClick={onSwitchToYoutube}
              title="التبديل إلى البث الاحتياطي على YouTube"
              className="inline-flex items-center gap-1.5 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-500/60 px-2.5 py-1 text-[11px] font-bold text-red-200 backdrop-blur-md transition shadow-sm cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current text-red-400" />
              <span className="hidden sm:inline">بث YouTube البديل</span>
            </button>
          )}

          {/* زر وضع وضوح السبورة والمخطوطات (Contrast / Reading Mode) */}
          <button
            type="button"
            onClick={toggleVisualClarity}
            title={
              visualClarityMode === 'clarity'
                ? 'إلغاء وضع وضوح السبورة'
                : 'تحسين وضوح السبورة والمخطوطات باهتة الإضاءة (C)'
            }
            className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition cursor-pointer border ${
              visualClarityMode === 'clarity'
                ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md font-bold'
                : visualClarityMode === 'reading'
                ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold'
                : 'bg-stone-900/80 hover:bg-black text-stone-300 hover:text-white border-stone-700/80'
            }`}
          >
            <Eye className="h-4 w-4" />
          </button>

          {/* زر الوقفات والعلامات المرجعية (Bookmarks Modal) */}
          <button
            type="button"
            onClick={() => setShowBookmarksModal(true)}
            title="عرض الوقفات والعلامات المرجعية المحفوظة (B)"
            className={`relative flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition cursor-pointer border ${
              bookmarks.length > 0
                ? 'bg-stone-900/90 text-amber-300 border-amber-400/50 hover:bg-black'
                : 'bg-stone-900/80 hover:bg-black text-stone-300 hover:text-white border-stone-700/80'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-stone-950 font-black text-[9px]">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* زر وضع المسرح العريض إن وجد */}
          {onToggleTheaterExpanded && (
            <button
              type="button"
              onClick={onToggleTheaterExpanded}
              title={isTheaterExpanded ? 'تصغير الشاشة للحجم القياسي' : 'توسيع الشاشة بنمط المسرح'}
              className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 border border-stone-700/80 px-2.5 py-1 text-xs font-bold backdrop-blur-md transition cursor-pointer"
            >
              <Tv className="h-3.5 w-3.5 text-amber-300" />
              <span>{isTheaterExpanded ? 'حجم قياسي' : 'عرض عريض'}</span>
            </button>
          )}

          {/* زر لقطة الشاشة السريعة للشرح */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            title="أخذ لقطة شاشة للشرح وحفظها للكشكول (S)"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-300 hover:text-white border border-stone-700/80 backdrop-blur-md transition cursor-pointer"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* زر دليل الاختصارات */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            title="دليل اختصارات لوحة المفاتيح (?)"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-300 hover:text-white border border-stone-700/80 backdrop-blur-md transition cursor-pointer"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* زر التشغيل الكبير الأنيق في الوسط عند الإيقاف المؤقت */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-black/30 hover:bg-black/40 transition"
        >
          <button
            type="button"
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-tr from-emerald-800 via-amber-500 to-amber-400 text-stone-950 shadow-2xl hover:scale-108 transition transform cursor-pointer border-2 border-amber-300/70"
            title="تشغيل الدرس (Space)"
          >
            <Play className="h-9 w-9 fill-current translate-x-0.5 text-stone-950" />
          </button>
        </div>
      )}

      {/* الشريط السفلي المتكامل لعناصر التحكم الفاخرة عالية التباين */}
      <div
        className={`absolute bottom-0 right-0 left-0 z-20 flex flex-col justify-end p-3 sm:p-5 bg-gradient-to-t from-black/98 via-black/85 to-transparent transition-opacity duration-300 space-y-2.5 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. شريط التقدم التفاعلي (Interactive Scrubber) مع إمكانية القفز والسحب الحر بالماوس */}
        <div
          ref={progressBarRef}
          dir="ltr"
          onClick={handleSeek}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressBarHover}
          onMouseLeave={handleProgressBarLeave}
          className="group/progress relative h-2.5 hover:h-3.5 w-full cursor-pointer rounded-full bg-stone-700/80 hover:bg-stone-600/80 transition-all shadow-inner select-none"
        >
          {/* شريط التحميل المسبق (Buffered) */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-white/30 transition-all duration-200"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* شريط المشاهدة المنجز (Played) بتدرج زمردي وذهبي مشع */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-linear-to-r from-emerald-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
            style={{ width: `${playedPercent}%` }}
          />

          {/* العلامات المرجعية والوقفات العلمية على خط الزمن */}
          {duration > 0 &&
            bookmarks.map((bm) => {
              const pos = (bm.time / duration) * 100
              return (
                <div
                  key={bm.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (videoRef.current) {
                      videoRef.current.currentTime = bm.time
                      setCurrentTime(bm.time)
                      showFeedback(`انتقال للوقفة: ${bm.label} 🔖`)
                    }
                  }}
                  title={bm.label}
                  style={{ left: `${pos}%` }}
                  className="group/bm absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer p-1"
                >
                  <div className="h-3 w-1.5 rounded-full bg-amber-400 hover:h-4 hover:w-2 hover:bg-amber-300 transition-all shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  <div className="absolute -top-7 -translate-x-1/2 hidden group-hover/bm:block rounded-md bg-stone-900 border border-amber-400/50 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 whitespace-nowrap shadow-xl pointer-events-none">
                    {bm.label}
                  </div>
                </div>
              );
            })}

          {/* مقبض المؤشر الدائري المتوهج */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4.5 w-4.5 rounded-full bg-white border-2 border-amber-400 ring-4 ring-amber-400/30 shadow-2xl opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${playedPercent}% - 9px)` }}
          />

          {/* تلميح الوقت العائم عند تحريك الفأرة على الشريط (Hover Tooltip) */}
          {hoverTime !== null && hoverPosition !== null && (
            <div
              className="absolute -top-9 -translate-x-1/2 rounded-xl bg-stone-900/95 border border-amber-400/50 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 shadow-2xl pointer-events-none backdrop-blur-md"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* 2. أزرار وأدوات التحكم الرئيسية عالية الوضوح */}
        <div className="flex items-center justify-between text-white text-xs pt-1">
          {/* الجزء الأيمن (التحكم بالتشغيل والصوت والتنقل) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* زر التشغيل / الإيقاف المؤقت */}
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'إيقاف مؤقت (Space)' : 'تشغيل (Space)'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900/85 hover:bg-black text-white transition cursor-pointer border border-stone-700/80 shadow-md"
            >
              {isPlaying ? (
                <Pause className="h-4.5 w-4.5 fill-current" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-current translate-x-0.5 text-amber-300" />
              )}
            </button>

            {/* أزرار التقديم والتأخير 10 ثوانٍ */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              title="تأخير 10 ثوانٍ (سهم يسار)"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white transition cursor-pointer border border-stone-700/70"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => skipTime(10)}
              title="تقديم 10 ثوانٍ (سهم يمين)"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white transition cursor-pointer border border-stone-700/70"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* التنقل بين المجالس السابقة والتالية */}
            {onPrevEpisode && (
              <button
                type="button"
                disabled={currentEpisodeIndex === 0}
                onClick={onPrevEpisode}
                title="المجلس السابق"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer border border-stone-700/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {onNextEpisode && (
              <button
                type="button"
                disabled={currentEpisodeIndex >= totalLessonsCount - 1}
                onClick={onNextEpisode}
                title="المجلس التالي"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer border border-stone-700/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* التحكم بمستوى الصوت مع شريط انزلاقي ومضخم الصوت */}
            <div className="group/volume flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'إلغاء كتم الصوت (M)' : 'كتم الصوت (M)'}
                className="text-stone-300 hover:text-white transition cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4.5 w-4.5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4.5 w-4.5" />
                ) : (
                  <Volume2 className="h-4.5 w-4.5 text-emerald-400" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-0 group-hover/volume:w-16 focus:w-16 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all duration-200"
              />

              {/* زر تضخيم الصوت الرقمي (Boost: 100% -> 150% -> 200%) */}
              <button
                type="button"
                onClick={handleToggleAudioBoost}
                title="تضخيم الصوت الرقمي وتحسين مخارج الحروف للتسجيلات المنخفضة (150% / 200%)"
                className={`text-[10px] font-black rounded-lg px-2 py-0.5 transition cursor-pointer border ${
                  audioBoost > 1
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md font-black'
                    : 'bg-stone-900/80 hover:bg-black text-stone-200 border-stone-700/80'
                }`}
              >
                {Math.round(audioBoost * 100)}%
              </button>
            </div>

            {/* عداد الوقت الرقمي عالي التباين (الوقت المنقضي / المدة الكلية) بالاتجاه القياسي LTR */}
            <div dir="ltr" className="flex items-center gap-1 text-[11px] font-mono font-bold text-stone-200 pr-1 drop-shadow-md">
              <span className="text-amber-300">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* الجزء الأيسر (السرعة حتى 3x، الوقفات، التكرار، المؤقت، PiP، ملء الشاشة) */}
          <div className="flex items-center gap-2 relative">
            {/* زر إضافة وقفة علمية سريعة (B) */}
            <button
              type="button"
              onClick={handleAddBookmark}
              title="إضافة وقفة علمية مرجعية عند هذه الدقيقة (B)"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-amber-300 border border-stone-700/80 transition cursor-pointer"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>

            {/* زر تكرار المجلس (Loop) */}
            <button
              type="button"
              onClick={toggleLoop}
              title={isLooping ? 'إلغاء تكرار المجلس (R)' : 'تكرار هذا المجلس للحفظ والمراجعة (R)'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer border ${
                isLooping
                  ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-md'
                  : 'bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white border-stone-700/80'
              }`}
            >
              <Repeat className="h-4 w-4" />
            </button>

            {/* قائمة مؤقت النوم والمدارسة */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                title="مؤقت إيقاف التشغيل التلقائي للمدارسة"
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer border ${
                  sleepTimerMinutes !== null
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                    : 'bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white border-stone-700/80'
                }`}
              >
                <Timer className="h-4 w-4" />
              </button>

              {showTimerMenu && (
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-2xl border border-stone-700 bg-stone-900/98 p-2 backdrop-blur-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 min-w-[140px]">
                  <span className="text-[10px] font-bold text-amber-300 text-center pb-1 border-b border-stone-800">
                    ⏱ إيقاف تلقائي بعد
                  </span>
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSleepTimerMinutes(m)
                        setSleepTimerRemaining(m * 60)
                        setShowTimerMenu(false)
                        showFeedback(`سيتم الإيقاف بعد ${m} دقيقة`)
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition text-right cursor-pointer ${
                        sleepTimerMinutes === m
                          ? 'bg-amber-400 text-stone-950'
                          : 'text-stone-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m} دقيقة
                    </button>
                  ))}
                  {sleepTimerMinutes !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setSleepTimerMinutes(null)
                        setSleepTimerRemaining(null)
                        setShowTimerMenu(false)
                        showFeedback('تم إلغاء المؤقت')
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition text-right cursor-pointer pt-1 border-t border-stone-800"
                    >
                      إلغاء المؤقت ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* زر وقائمة سرعة التشغيل الموسعة حتى 3x وأكثر */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="سرعة التشغيل (تصل حتى 3x)"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black transition cursor-pointer border ${
                  playbackSpeed !== 1
                    ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-400/20'
                    : 'bg-stone-900/80 hover:bg-black text-white border-stone-700/80'
                }`}
              >
                {playbackSpeed >= 2.5 ? (
                  <Rocket className="h-3 w-3" />
                ) : (
                  <Sliders className="h-3 w-3" />
                )}
                <span>{playbackSpeed}x</span>
              </button>

              {/* قائمة اختيارات السرعة المطورة بالكامل */}
              {showSpeedMenu && (
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 rounded-2xl border border-stone-700 bg-stone-900/98 p-2.5 backdrop-blur-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 min-w-[210px]">
                  {/* رأس القائمة مع أزرار التقديم والتأخير الدقيقة (بمقدار 0.1x) */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-[11px] font-bold text-stone-300 px-1">
                    <span className="text-amber-300 font-black">السرعة: {playbackSpeed}x</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustSpeedDelta(-0.1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-800 text-stone-200 hover:bg-amber-400 hover:text-stone-950 font-black text-sm transition cursor-pointer"
                        title="إبطاء 0.1x (-)"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-stone-400 font-bold">0.1x</span>
                      <button
                        type="button"
                        onClick={() => adjustSpeedDelta(0.1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-800 text-stone-200 hover:bg-amber-400 hover:text-stone-950 font-black text-sm transition cursor-pointer"
                        title="تسريع 0.1x (+)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* أزرار السرعات السريعة المباشرة */}
                  <div className="flex items-center gap-1">
                    {quickSpeedPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSpeedSelect(preset)}
                        className={`flex-1 rounded-lg py-1 text-[11px] font-black transition cursor-pointer ${
                          playbackSpeed === preset
                            ? 'bg-amber-400 text-stone-950 shadow-sm'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>

                  {/* شبكة السرعات التفصيلية */}
                  <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto pr-0.5 pt-1">
                    {speedOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSpeedSelect(s)}
                        className={`rounded-lg px-1.5 py-1 text-xs font-bold transition text-center cursor-pointer ${
                          playbackSpeed === s
                            ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                            : 'text-stone-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* زر صورة داخل صورة (PiP) */}
            <button
              type="button"
              onClick={togglePiP}
              title="تشغيل في نافذة عائمة (Picture in Picture) للمتابعة أثناء القراءة والتدوين"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer border ${
                isPiPActive
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                  : 'bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white border-stone-700/80'
              }`}
            >
              <Tv className="h-4 w-4" />
            </button>

            {/* زر ملء الشاشة (Fullscreen) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'الخروج من ملء الشاشة (F)' : 'ملء الشاشة الكامل (F)'}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white transition cursor-pointer border border-stone-700/80 shadow-md"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* نافذة قائمة الوقفات والعلامات المرجعية المحفوظة */}
      {showBookmarksModal && (
        <div
          onClick={() => setShowBookmarksModal(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-stone-700 bg-stone-900 p-5 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-amber-400" />
                <h4 className="text-sm font-black text-amber-300">الوقفات والعلامات المرجعية</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="text-center py-6 space-y-2 text-stone-400">
                <BookmarkPlus className="h-10 w-10 mx-auto text-stone-600" />
                <p className="text-xs">لم تسجل وقفات بعد في هذا المجلس</p>
                <p className="text-[11px] text-stone-500">
                  اضغط حرف (B) أثناء استماعك للمتن لحفظ وقفة عند فائدة أو مسألة مهمة
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-stone-800/80 border border-stone-700/60 hover:border-amber-400/50 transition"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = bm.time
                          setCurrentTime(bm.time)
                        }
                        setShowBookmarksModal(false)
                        showFeedback(`انتقال إلى: ${bm.label}`)
                      }}
                      className="flex items-center gap-2 text-right cursor-pointer flex-1"
                    >
                      <span className="font-mono text-xs font-bold text-amber-300 bg-stone-900 px-2 py-0.5 rounded-lg border border-stone-700">
                        {formatTime(bm.time)}
                      </span>
                      <span className="text-xs text-stone-200 font-medium line-clamp-1">{bm.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      title="حذف الوقفة"
                      className="text-stone-400 hover:text-rose-400 p-1 cursor-pointer transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleAddBookmark()
                  setShowBookmarksModal(false)
                }}
                className="flex-1 rounded-2xl bg-amber-400 py-2 text-xs font-black text-stone-950 hover:bg-amber-300 transition cursor-pointer"
              >
                حفظ وقفة عند اللحظة الحالية +
              </button>
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="rounded-2xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-stone-700 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة اختصارات لوحة المفاتيح الذكية */}
      {showShortcutsModal && (
        <div
          onClick={() => setShowShortcutsModal(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-stone-700 bg-stone-900 p-5 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-amber-400" />
                <h4 className="text-sm font-black text-amber-300">اختصارات المدارسة الذكية</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { keys: 'المسافة / K', desc: 'تشغيل / إيقاف مؤقت' },
                { keys: '→ / L', desc: 'تقديم 10 ثوانٍ' },
                { keys: '← / J', desc: 'تأخير 10 ثوانٍ' },
                { keys: 'نقر مزدوج يمين/يسار', desc: 'تقديم/تأخير 10 ثوانٍ سريع' },
                { keys: '↑ / ↓', desc: 'رفع / خفض الصوت' },
                { keys: 'M', desc: 'كتم / تشغيل الصوت' },
                { keys: 'F', desc: 'ملء الشاشة الكامل' },
                { keys: '+ / - أو ] / [', desc: 'تعديل السرعة تدريجياً (بمقدار 0.1x)' },
                { keys: 'R', desc: 'تكرار المجلس للمراجعة (Loop)' },
                { keys: 'S', desc: 'التقاط صورة من الشرح للكشكول' },
                { keys: 'B', desc: 'إضافة وقفة علمية مرجعية (Bookmark)' },
                { keys: 'C', desc: 'تحسين وضوح السبورة والمخطوطات' },
                { keys: '0 - 9', desc: 'انتقال لنسبة مئوية من الدرس (10%..90%)' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-stone-800/60">
                  <span className="text-stone-300">{item.desc}</span>
                  <kbd className="rounded-lg bg-stone-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 border border-stone-700">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="w-full rounded-2xl bg-amber-400 py-2 text-xs font-black text-stone-950 hover:bg-amber-300 transition cursor-pointer"
            >
              فهمت، عودة للمدارسة ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
