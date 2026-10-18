'use client'

import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
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
  ListVideo,
  FastForward,
  Award,
  Sparkles,
} from 'lucide-react'

// التصريح العام لكائن YouTube في المتصفح
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface ChapterItem {
  title: string
  time: number
}

export interface BookmarkItem {
  id: string
  time: number
  label: string
}

export interface SanadVideoPlayerProps {
  src?: string // رابط الفيديو المباشر (MP4 / WebM / إلخ)
  youtubeId?: string // معرف فيديو YouTube
  youtubeUrl?: string // رابط فيديو YouTube
  title: string
  subtitle?: string
  subtitlesUrl?: string
  currentEpisodeIndex: number
  totalLessonsCount: number
  isCompleted?: boolean
  autoAdvanceNext?: boolean
  chapters?: ChapterItem[]
  introDuration?: number // ثواني لتخطي المقدمة
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
  initialSeekTime?: number
}

// دالة مساعدة لتنسيق الوقت بالدقائق والثواني
export function formatTime(secs: number): string {
  if (!secs || isNaN(secs) || !isFinite(secs)) return '00:00'
  const totalSeconds = Math.floor(secs)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// استخراج معرف YouTube من أي رابط أو نص
export function extractYouTubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  )
  return match ? match[1] : null
}

// التحقق هل الرابط هو فيديو مباشر على السيرفر
export function isDirectVideoUrl(url?: string): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  return (
    trimmed.endsWith('.mp4') ||
    trimmed.endsWith('.webm') ||
    trimmed.endsWith('.m4v') ||
    trimmed.endsWith('.mov') ||
    trimmed.endsWith('.m3u8') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:video') ||
    trimmed.includes('/storage/v1/b/') ||
    trimmed.includes('.supabase.co/storage') ||
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('/api/stream')
  )
}

export default function SanadVideoPlayer({
  src,
  youtubeId,
  youtubeUrl,
  title,
  subtitle,
  subtitlesUrl,
  currentEpisodeIndex,
  totalLessonsCount,
  isCompleted = false,
  autoAdvanceNext = true,
  chapters = [],
  introDuration,
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
  initialSeekTime,
}: SanadVideoPlayerProps) {
  const playerId = useId().replace(/:/g, '')
  const ytElementId = `sanad-yt-frame-${playerId}`

  // استنتاج المحرك المناسب: YouTube أو الفيديو المباشر
  const detectedYtId = extractYouTubeId(youtubeId || youtubeUrl || (isDirectVideoUrl(src) ? undefined : src))
  const cleanDirectSrc = src && isDirectVideoUrl(src) ? src.trim() : undefined

  // الحالة النشطة الحالية للمصدر (direct أو youtube)
  const [activeEngine, setActiveEngine] = useState<'direct' | 'youtube'>(() => {
    if (cleanDirectSrc) return 'direct'
    if (detectedYtId) return 'youtube'
    return cleanDirectSrc ? 'direct' : 'youtube'
  })

  // المراجع للعناصر
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // المؤقتات والتفاعلات
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef<boolean>(false)
  const lastSeekTimeRef = useRef<number>(0)
  const seekTargetTimeRef = useRef<number | null>(null)
  const seekClearTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDragEndTimeRef = useRef<number>(0)
  const pendingSeekTimeRef = useRef<number | null>(initialSeekTime || null)

  // حالات التشغيل الأساسية
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_player_volume')
        if (saved !== null) return Number(saved)
      } catch {}
    }
    return 1
  })
  const [isMuted, setIsMuted] = useState(false)
  const [audioBoost, setAudioBoost] = useState<number>(1) // 1 = 100%, 1.5 = 150%, 2 = 200%
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_player_speed')
        if (saved !== null) return Number(saved)
      } catch {}
    }
    return 1
  })
  const [customSpeedInput, setCustomSpeedInput] = useState('')

  // حالات الواجهة والعرض
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [showChaptersMenu, setShowChaptersMenu] = useState(false)
  const [showBookmarksModal, setShowBookmarksModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [isPiPActive, setIsPiPActive] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)

  // مؤقت النوم والمدارسة
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)

  // الوقفات والعلامات المرجعية
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [snapshotToast, setSnapshotToast] = useState(false)

  // تحسين وضوح السبورة والقراءة الليلية
  const [visualClarityMode, setVisualClarityMode] = useState<'normal' | 'clarity' | 'reading'>('normal')

  // شاشة إتمام المجلس
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [completionCountdown, setCompletionCountdown] = useState<number | null>(null)

  // التأثيرات والرسوم المتحركة التفاعلية
  const [rippleSide, setRippleSide] = useState<'left' | 'right' | null>(null)
  const [centerIconState, setCenterIconState] = useState<
    'play' | 'pause' | 'skip-fwd' | 'skip-back' | 'speed' | 'boost' | null
  >(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)

  // إدارة الأخطاء والاستدراك التلقائي
  const [hasPlaybackError, setHasPlaybackError] = useState(false)
  const [playbackErrorMessage, setPlaybackErrorMessage] = useState<string | null>(null)
  const [autoFallbackCountdown, setAutoFallbackCountdown] = useState<number | null>(null)

  // مراجع Web Audio API لتضخيم الصوت الرقمي
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // سرعات التشغيل المتاحة حسب المصدر
  const speedPresets =
    activeEngine === 'youtube'
      ? [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
      : [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4]

  const storageKey = detectedYtId ? `sanad_yt_${detectedYtId}` : cleanDirectSrc ? `sanad_src_${encodeURIComponent(cleanDirectSrc)}` : null

  // إظهار إشعار أو أيقونة في وسط الشاشة
  const showCenterAnimation = useCallback(
    (type: 'play' | 'pause' | 'skip-fwd' | 'skip-back' | 'speed' | 'boost', text?: string) => {
      setCenterIconState(type)
      if (text) setFeedbackText(text)
      setTimeout(() => {
        setCenterIconState(null)
        setFeedbackText(null)
      }, 700)
    },
    []
  )

  const showFeedback = useCallback((text: string) => {
    setFeedbackText(text)
    setTimeout(() => {
      setFeedbackText(null)
    }, 1800)
  }, [])

  // إعادة ضبط مؤقت إخفاء أشرطة التحكم تلقائياً
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
        setShowChaptersMenu(false)
      }, 2600)
    }
  }, [isPlaying])

  const handleMouseMove = () => {
    resetControlsTimeout()
  }

  // ==========================================
  // استرجاع الموضع المحفوظ والوقفات
  // ==========================================
  useEffect(() => {
    if (!storageKey) return
    try {
      const savedPos = localStorage.getItem(`pos_${storageKey}`)
      if (savedPos && Number(savedPos) > 10) {
        pendingSeekTimeRef.current = Number(savedPos)
      }
      const savedBm = localStorage.getItem(`bm_${storageKey}`)
      if (savedBm) {
        setBookmarks(JSON.parse(savedBm))
      }
    } catch {}
  }, [storageKey])

  // حفظ الموضع تلقائياً أثناء المشاهدة
  useEffect(() => {
    if (!storageKey || currentTime <= 5) return
    try {
      if (duration > 0 && currentTime >= duration - 4) {
        localStorage.removeItem(`pos_${storageKey}`)
      } else {
        localStorage.setItem(`pos_${storageKey}`, Math.floor(currentTime).toString())
      }
    } catch {}
  }, [currentTime, duration, storageKey])

  // ==========================================
  // تكامل YouTube IFrame API للمحرك
  // ==========================================
  useEffect(() => {
    if (activeEngine !== 'youtube' || !detectedYtId) return

    let isSubscribed = true
    setIsLoading(true)
    setHasPlaybackError(false)

    const initYouTubePlayer = () => {
      if (!isSubscribed || !window.YT || !window.YT.Player) return

      // تنظيف أي مشغل سابق
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy()
        } catch {}
        ytPlayerRef.current = null
      }

      try {
        ytPlayerRef.current = new window.YT.Player(ytElementId, {
          videoId: detectedYtId,
          playerVars: {
            autoplay: 0,
            controls: 0, // إخفاء عناصر تحكم يوتيوب بالكامل
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
            disablekb: 1, // إسناد التحكم الكامل للكيبورد لواجهة سند
            fs: 0, // نتحكم في ملء الشاشة عبر الحاوية
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return
              setIsLoading(false)
              const dur = event.target.getDuration() || 0
              if (dur > 0) setDuration(dur)

              // تطبيق الإعدادات المحفوظة
              event.target.setVolume(Math.round(volume * 100))
              if (isMuted) event.target.mute()
              if (playbackSpeed !== 1) event.target.setPlaybackRate(playbackSpeed)

              // القفز إلى الموضع المحفوظ
              if (pendingSeekTimeRef.current && pendingSeekTimeRef.current > 5) {
                event.target.seekTo(pendingSeekTimeRef.current, true)
                setCurrentTime(pendingSeekTimeRef.current)
                pendingSeekTimeRef.current = null
              }
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return
              const state = event.data
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true)
                setIsLoading(false)
                setHasPlaybackError(false)
                setShowCompletionScreen(false)
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false)
              } else if (state === window.YT.PlayerState.BUFFERING) {
                setIsLoading(true)
              } else if (state === window.YT.PlayerState.CUED) {
                setIsLoading(false)
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false)
                handleVideoEnd()
              }
            },
            onError: (event: any) => {
              if (!isSubscribed) return
              console.warn('YouTube Player error code:', event.data)
              setIsLoading(false)
              setHasPlaybackError(true)
              setPlaybackErrorMessage(
                'تعذر تشغيل هذا المقطع عبر YouTube (قد يكون الفيديو خاصاً أو مقيداً جغرافياً أو محظور التضمين).'
              )
            },
          },
        })
      } catch (err) {
        console.error('Error initializing YT Player:', err)
        setIsLoading(false)
      }
    }

    if (!window.YT) {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
      if (!existingScript) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag)
      }
      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback()
        initYouTubePlayer()
      }
    } else if (window.YT && window.YT.Player) {
      initYouTubePlayer()
    }

    return () => {
      isSubscribed = false
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy()
        } catch {}
        ytPlayerRef.current = null
      }
    }
  }, [activeEngine, detectedYtId, ytElementId])

  // مزامنة وقت YouTube والـ Buffering مع شريط الواجهة أثناء التشغيل
  useEffect(() => {
    if (activeEngine !== 'youtube' || !isPlaying) return

    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime() || 0
          const d = ytPlayerRef.current.getDuration() || 0
          const frac = ytPlayerRef.current.getVideoLoadedFraction() || 0
          if (d > 0 && d !== duration) setDuration(d)
          if (!isSeekingRef.current) {
            setCurrentTime(t)
          }
          setBufferedPercent(frac * 100)
        } catch {}
      }
    }, 250)

    return () => clearInterval(interval)
  }, [activeEngine, isPlaying, duration])

  // ==========================================
  // معالجة انتهاء المجلس (Lesson End)
  // ==========================================
  const handleVideoEnd = useCallback(() => {
    if (isLooping) {
      if (activeEngine === 'youtube' && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0, true)
        ytPlayerRef.current.playVideo()
      } else if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play().catch(() => {})
      }
      return
    }

    setShowCompletionScreen(true)
    if (onVideoEnded) onVideoEnded()
    if (onToggleComplete) onToggleComplete(currentEpisodeIndex + 1)

    // تشغيل عد تنازلي للانتقال التلقائي للدرس التالي
    if (autoAdvanceNext && onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1) {
      setCompletionCountdown(6)
    }
  }, [isLooping, activeEngine, onVideoEnded, onToggleComplete, currentEpisodeIndex, autoAdvanceNext, onNextEpisode, totalLessonsCount])

  // عداد الانتقال التلقائي للدرس التالي
  useEffect(() => {
    if (completionCountdown === null) return
    if (completionCountdown <= 0) {
      setCompletionCountdown(null)
      setShowCompletionScreen(false)
      if (onNextEpisode) onNextEpisode()
      return
    }

    const t = setInterval(() => {
      setCompletionCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(t)
  }, [completionCountdown, onNextEpisode])

  // ==========================================
  // عمليات التشغيل الموحدة (Unified Playback API)
  // ==========================================
  const togglePlay = useCallback(() => {
    if (activeEngine === 'youtube') {
      if (!ytPlayerRef.current) return
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo()
          setIsPlaying(false)
          showCenterAnimation('pause')
        } else {
          ytPlayerRef.current.playVideo()
          setIsPlaying(true)
          showCenterAnimation('play')
        }
      } catch {}
    } else {
      if (!videoRef.current) return
      if (videoRef.current.paused) {
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            showCenterAnimation('play')
          })
          .catch(() => {})
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
        showCenterAnimation('pause')
      }
    }
    resetControlsTimeout()
  }, [activeEngine, isPlaying, resetControlsTimeout, showCenterAnimation])

  // القفز في الوقت (Seek) بدقة بالغة
  const performSeek = useCallback(
    (targetTime: number) => {
      const realDur = duration || 0
      const clamped = Math.max(0, Math.min(realDur > 0 ? realDur - 0.5 : targetTime, targetTime))

      isSeekingRef.current = true
      lastSeekTimeRef.current = Date.now()
      seekTargetTimeRef.current = clamped
      setCurrentTime(clamped)

      if (activeEngine === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(clamped, true)
        } catch {}
      } else if (videoRef.current) {
        try {
          videoRef.current.currentTime = clamped
        } catch {}
      }

      resetControlsTimeout()
      if (seekClearTimeoutRef.current) clearTimeout(seekClearTimeoutRef.current)
      seekClearTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false
      }, 1800)
    },
    [activeEngine, duration, resetControlsTimeout]
  )

  // التقديم والتأخير بثوانٍ محددة (+/- 5, 10, 15)
  const skipTime = useCallback(
    (seconds: number) => {
      const nextTime = Math.max(0, Math.min(duration, currentTime + seconds))
      performSeek(nextTime)
      showCenterAnimation(seconds > 0 ? 'skip-fwd' : 'skip-back', `${seconds > 0 ? '+' : ''}${seconds} ثوانٍ`)
    },
    [currentTime, duration, performSeek, showCenterAnimation]
  )

  // التحكم بمستوى الصوت
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol))
    setVolume(clamped)
    setIsMuted(clamped === 0)
    try {
      localStorage.setItem('sanad_player_volume', clamped.toString())
    } catch {}

    if (activeEngine === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(Math.round(clamped * 100))
        if (clamped === 0) ytPlayerRef.current.mute()
        else ytPlayerRef.current.unMute()
      } catch {}
    } else if (videoRef.current) {
      videoRef.current.volume = clamped
      videoRef.current.muted = clamped === 0
    }
  }

  const toggleMute = () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    if (activeEngine === 'youtube' && ytPlayerRef.current) {
      try {
        if (nextMute) ytPlayerRef.current.mute()
        else {
          ytPlayerRef.current.unMute()
          if (volume === 0) handleVolumeChange(0.5)
        }
      } catch {}
    } else if (videoRef.current) {
      videoRef.current.muted = nextMute
      if (!nextMute && volume === 0) handleVolumeChange(0.5)
    }
  }

  // تضخيم الصوت الرقمي (Audio Boost حتى 200% لفيديوهات السيرفر)
  const handleToggleAudioBoost = () => {
    if (activeEngine === 'youtube') {
      showFeedback('تضخيم الصوت الرقمي متاح للفيديوهات المباشرة فقط 🔊')
      return
    }

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

        // تعزيز نبرة الشارح وتوضيح مخارج الحروف (2.2kHz)
        filter.type = 'peaking'
        filter.frequency.value = 2200
        filter.gain.value = 3.5
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

  // ضبط السرعة وتخزينها
  const handleSpeedSelect = (speed: number) => {
    const maxAllowed = activeEngine === 'youtube' ? 2.0 : 4.0
    const clamped = Math.max(0.25, Math.min(maxAllowed, Number(speed.toFixed(2))))
    setPlaybackSpeed(clamped)
    try {
      localStorage.setItem('sanad_player_speed', clamped.toString())
    } catch {}

    if (activeEngine === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(clamped)
      } catch {}
    } else if (videoRef.current) {
      videoRef.current.playbackRate = clamped
    }

    setShowSpeedMenu(false)
    showCenterAnimation('speed', clamped >= 2 ? `سرعة فائقة: ${clamped}x 🚀` : `السرعة: ${clamped}x`)
    resetControlsTimeout()
  }

  // تعديل السرعة تدريجياً بمقدار +/- 0.1x
  const adjustSpeedDelta = (delta: number) => {
    const current = Number(playbackSpeed.toFixed(1))
    const next = Number((current + delta).toFixed(1))
    handleSpeedSelect(next)
  }

  // تطبيق سرعة مخصصة أدخلها المستخدم
  const handleApplyCustomSpeed = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(customSpeedInput)
    if (!isNaN(val) && val > 0) {
      handleSpeedSelect(val)
      setCustomSpeedInput('')
    }
  }

  // ملء الشاشة الكامل (على مستوى حاوية المشغل لتبقى عناصر التحكم ظاهرة)
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
      console.error('Fullscreen toggle error:', err)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // وضع صورة داخل صورة (PiP)
  const togglePiP = async () => {
    if (activeEngine === 'youtube') {
      showFeedback('وضع PiP المباشر مدعوم للفيديوهات المرفوعة')
      return
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPiPActive(false)
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture()
        setIsPiPActive(true)
      }
    } catch (err) {
      console.error('PiP toggle error:', err)
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

  // أخذ لقطة شاشة من الشرح للكشكول (Canvas Snapshot)
  const handleCaptureSnapshot = () => {
    if (activeEngine === 'youtube') {
      showFeedback('التقاط الشاشة الفوري متاح للفيديوهات المباشرة')
      return
    }
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

  // إضافة وقفة علمية مرجعية
  const handleAddBookmark = () => {
    const sec = Math.floor(currentTime)
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
    if (storageKey) {
      try {
        localStorage.setItem(`bm_${storageKey}`, JSON.stringify(updated))
      } catch {}
    }
    showFeedback(`تم حفظ الوقفة عند ${formatTime(sec)} 🔖`)
  }

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id)
    setBookmarks(updated)
    if (storageKey) {
      try {
        localStorage.setItem(`bm_${storageKey}`, JSON.stringify(updated))
      } catch {}
    }
    showFeedback('تم حذف الوقفة')
  }

  // تبديل وضوح السبورة والمخطوطات
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
        return 'contrast(125%) brightness(108%) saturate(108%)'
      case 'reading':
        return 'brightness(95%) sepia(20%) contrast(105%)'
      default:
        return 'none'
    }
  }

  // مؤقت النوم والمدارسة (Sleep Timer)
  useEffect(() => {
    if (sleepTimerRemaining === null) return
    if (sleepTimerRemaining <= 0) {
      if (activeEngine === 'youtube' && ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo()
      } else if (videoRef.current) {
        videoRef.current.pause()
      }
      setIsPlaying(false)
      const t = setTimeout(() => {
        setSleepTimerMinutes(null)
        setSleepTimerRemaining(null)
        showFeedback('انتهى مؤقت المدارسة وتم إيقاف التشغيل هدوءاً ⏱')
      }, 0)
      return () => clearTimeout(t)
    }

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(timer)
  }, [sleepTimerRemaining, activeEngine, showFeedback])

  // ==========================================
  // النقر الذكي والنقر المزدوج (Double-tap Seek)
  // ==========================================
  const handleVideoAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = e.timeStamp
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
          // نقر بالمنتصف: ملء الشاشة
          toggleFullscreen()
        }
      } else {
        // نقر مفرد
        clickTimeoutRef.current = setTimeout(() => {
          togglePlay()
        }, 240)
      }
      lastClickTimeRef.current = now
    },
    [skipTime, toggleFullscreen, togglePlay]
  )

  // حساب وقت القفز عند النقر أو السحب على شريط التقدم
  const calculateSeekTime = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current || !duration || !isFinite(duration) || duration <= 0) return null
      const rect = progressBarRef.current.getBoundingClientRect()
      if (rect.width <= 0) return null
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left))
      const percent = Math.max(0, Math.min(0.998, clickX / rect.width))
      const targetTime = percent * duration
      return Math.max(0, Math.min(Math.max(0, duration - 0.5), targetTime))
    },
    [duration]
  )

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
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

  // ==========================================
  // اختصارات لوحة المفاتيح الأكاديمية الذكية
  // ==========================================
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
      if (/^[0-9]$/.test(key) && duration > 0) {
        e.preventDefault()
        const targetSec = (Number(key) / 10) * duration
        performSeek(targetSec)
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
  }, [
    togglePlay,
    skipTime,
    volume,
    toggleFullscreen,
    duration,
    playbackSpeed,
    isLooping,
    bookmarks,
    visualClarityMode,
    performSeek,
    handleVolumeChange,
    toggleMute,
    handleCaptureSnapshot,
    handleAddBookmark,
    toggleVisualClarity,
    adjustSpeedDelta,
    showFeedback,
  ])

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
          setShowChaptersMenu(false)
        }
      }}
      className={`group relative aspect-video w-full overflow-hidden rounded-3xl bg-stone-950 select-none shadow-2xl transition-all ${
        isFullscreen
          ? 'rounded-none h-screen w-screen border-0'
          : 'border border-stone-800/90 dark:border-stone-800'
      }`}
    >
      {/* ===================== منطقة الفيديو التفاعلية ===================== */}
      <div
        onClick={handleVideoAreaClick}
        style={{ filter: getVideoFilterStyle() }}
        className="relative h-full w-full cursor-pointer flex items-center justify-center bg-black transition-[filter] duration-300"
      >
        {/* المحرك 1: فيديو السيرفر المباشر (HTML5 Video) */}
        {activeEngine === 'direct' && cleanDirectSrc && (
          <video
            ref={videoRef}
            src={cleanDirectSrc}
            playsInline
            preload="metadata"
            onTimeUpdate={() => {
              if (videoRef.current && !isSeekingRef.current) {
                setCurrentTime(videoRef.current.currentTime)
              }
              if (videoRef.current && videoRef.current.buffered.length > 0 && videoRef.current.duration) {
                const bEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
                setBufferedPercent((bEnd / videoRef.current.duration) * 100)
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const dur = videoRef.current.duration || 0
                setDuration(dur)
                setIsLoading(false)
                setHasPlaybackError(false)
                if (pendingSeekTimeRef.current && pendingSeekTimeRef.current > 5 && dur > 10) {
                  videoRef.current.currentTime = pendingSeekTimeRef.current
                  pendingSeekTimeRef.current = null
                }
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => {
              setIsLoading(false)
              setHasPlaybackError(false)
            }}
            onPlay={() => {
              setIsPlaying(true)
              setIsLoading(false)
              setShowCompletionScreen(false)
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnd}
            onError={() => {
              console.warn('SanadVideoPlayer: Direct video playback failed for:', cleanDirectSrc)
              if (detectedYtId || fallbackYoutubeUrl) {
                setActiveEngine('youtube')
                return
              }
              setIsLoading(false)
              setHasPlaybackError(true)
              setPlaybackErrorMessage('الملف غير متوفر على هذا الخادم أو ترميزه غير مدعوم في متصفحك.')
            }}
            className="h-full w-full object-contain pointer-events-none"
          >
            {subtitlesUrl && subtitlesEnabled && (
              <track kind="subtitles" src={subtitlesUrl} srcLang="ar" label="العربية" default />
            )}
          </video>
        )}

        {/* المحرك 2: فيديو YouTube IFrame API المعزول */}
        {activeEngine === 'youtube' && detectedYtId && (
          <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none">
            <div id={ytElementId} className="h-full w-full pointer-events-none scale-[1.01]" />
          </div>
        )}

        {/* مؤشر التحميل والتهيئة (Islamic Loading Skeleton) */}
        {isLoading && !hasPlaybackError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none animate-in fade-in duration-200">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <div className="h-10 w-10 rounded-full bg-linear-to-tr from-emerald-900 to-amber-600/50 flex items-center justify-center text-amber-300 shadow-lg">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            </div>
            <span className="mt-3 text-xs font-bold text-amber-200/90 tracking-wide">
              جاري تحضير مجلس العلم...
            </span>
          </div>
        )}

        {/* وميض النقر المزدوج (Ripple Seek Feedback) */}
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

      {/* الرسوم المتحركة في وسط الشاشة عند التفاعل (Center Animations) */}
      {(centerIconState || feedbackText) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-black/85 backdrop-blur-md px-6 py-4 text-white border border-amber-400/50 shadow-2xl">
            {centerIconState === 'play' && (
              <Play className="h-10 w-10 fill-current text-amber-300 translate-x-0.5" />
            )}
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

      {/* زر تخطي المقدمة (Skip Intro Button) */}
      {introDuration && currentTime < introDuration && duration > introDuration && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            performSeek(introDuration)
            showFeedback('تم تخطي المقدمة ⏭️')
          }}
          className="absolute bottom-20 right-5 z-30 inline-flex items-center gap-2 rounded-2xl bg-black/85 hover:bg-black text-amber-300 border border-amber-400/60 px-4 py-2 text-xs font-black shadow-2xl backdrop-blur-md transition transform hover:scale-105 cursor-pointer"
        >
          <FastForward className="h-4 w-4 fill-current text-amber-400" />
          <span>تخطي مقدمة المجلس</span>
        </button>
      )}

      {/* تنبيه لقطة الشاشة */}
      {snapshotToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-emerald-900/95 border border-emerald-400/60 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4 text-amber-300" />
          <span>تم التقاط الشاشة وحفظها للكشكول بنجاح! 📸</span>
        </div>
      )}

      {/* ===================== واجهة استدراك الأخطاء الذكية ===================== */}
      {hasPlaybackError && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-stone-950/95 p-6 text-center backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Tv className="h-7 w-7 animate-pulse" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white mb-1.5">
            تعذر تشغيل هذا المصدر مباشرة
          </h3>
          <p className="max-w-md text-xs text-stone-300 mb-4 leading-relaxed">
            {playbackErrorMessage || 'قد يكون الملف محجوباً أو أن المتصفح يحتاج استخدام المصدر البديل.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg">
            {activeEngine === 'direct' && detectedYtId && (
              <button
                type="button"
                onClick={() => {
                  setHasPlaybackError(false)
                  setActiveEngine('youtube')
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xl transition cursor-pointer hover:scale-105"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>⚡ الانتقال لبث YouTube المباشر</span>
              </button>
            )}

            {activeEngine === 'youtube' && cleanDirectSrc && (
              <button
                type="button"
                onClick={() => {
                  setHasPlaybackError(false)
                  setActiveEngine('direct')
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xl transition cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>الانتقال لفيديو السيرفر المباشر HD</span>
              </button>
            )}

            {onSwitchToAudio && audioUrl && (
              <button
                type="button"
                onClick={onSwitchToAudio}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 px-4 py-2 text-xs font-bold text-emerald-200 transition cursor-pointer"
              >
                <Headphones className="h-4 w-4 text-emerald-400" />
                <span>الاستماع للصوتية (MP3) 🎧</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setHasPlaybackError(false)
                if (activeEngine === 'youtube' && ytPlayerRef.current) {
                  ytPlayerRef.current.seekTo(0, true)
                  ytPlayerRef.current.playVideo()
                } else if (videoRef.current) {
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
          </div>
        </div>
      )}

      {/* ===================== شاشة إتمام المجلس الفاخرة (End Screen) ===================== */}
      {showCompletionScreen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-stone-950/95 p-6 text-center backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-tr from-emerald-600 to-amber-500 text-stone-950 shadow-2xl shadow-emerald-500/30 border-2 border-amber-300">
            <Award className="h-8 w-8" />
          </div>

          <h3 className="font-amiri text-xl sm:text-2xl font-black text-amber-300 mb-1">
            الحمد لله تم إتمام هذا المجلس بنجاح
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-stone-300 mb-5 leading-relaxed">
            «{title}» • كُتب لك حضور هذا المجلس في صحيفة إنجازك الأكاديمي.
          </p>

          {completionCountdown !== null && onNextEpisode && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 px-4 py-1.5 text-xs font-bold text-emerald-200">
              <Sparkles className="h-4 w-4 text-amber-300 animate-spin" />
              <span>الانتقال التلقائي للمجلس التالي خلال ({completionCountdown}) ثوانٍ...</span>
              <button
                type="button"
                onClick={() => setCompletionCountdown(null)}
                className="mr-2 text-[11px] text-stone-400 hover:text-white underline cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1 && (
              <button
                type="button"
                onClick={() => {
                  setShowCompletionScreen(false)
                  setCompletionCountdown(null)
                  onNextEpisode()
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-emerald-600 via-amber-600 to-amber-500 hover:scale-105 px-6 py-2.5 text-xs sm:text-sm font-black text-stone-950 shadow-2xl transition cursor-pointer"
              >
                <span>الانتقال للمجلس التالي</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowCompletionScreen(false)
                setCompletionCountdown(null)
                performSeek(0)
                togglePlay()
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-700 bg-stone-900/90 hover:bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-200 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              <span>إعادة مدارسة المجلس ↺</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCompletionScreen(false)}
              className="rounded-2xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-xs font-medium text-stone-400 hover:text-white transition cursor-pointer"
            >
              إغلاق الشاشة
            </button>
          </div>
        </div>
      )}

      {/* زر التشغيل الكبير الأنيق في الوسط عند الإيقاف المؤقت */}
      {!isPlaying && !isLoading && !hasPlaybackError && !showCompletionScreen && (
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

      {/* ===================== الشريط العلوي الفاخر (Top Bar) ===================== */}
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
          {/* شارة مؤقت المدارسة إن كان نشطاً */}
          {sleepTimerRemaining !== null && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/30 border border-amber-400/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow-md">
              <Clock className="h-3 w-3 animate-spin" />
              <span>
                {Math.floor(sleepTimerRemaining / 60)}:
                {String(sleepTimerRemaining % 60).padStart(2, '0')}
              </span>
            </span>
          )}

          {/* شارة السرعة الحالية */}
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

          {/* شارة نوع المصدر وإمكانية التبديل بينهما */}
          {cleanDirectSrc && detectedYtId ? (
            <button
              type="button"
              onClick={() => {
                setActiveEngine(activeEngine === 'direct' ? 'youtube' : 'direct')
                showFeedback(
                  activeEngine === 'direct'
                    ? 'التحويل إلى بث YouTube المباشر'
                    : 'التحويل إلى فيديو السيرفر المباشر HD'
                )
              }}
              title="التبديل بين فيديو السيرفر وبث YouTube"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-stone-900/90 hover:bg-black border border-stone-700/80 px-3 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md transition shadow-md cursor-pointer"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  activeEngine === 'direct' ? 'bg-emerald-400' : 'bg-red-500'
                } animate-pulse`}
              />
              <span>{activeEngine === 'direct' ? 'HD سَنَد المباشر ⇄' : 'بث YouTube ⇄'}</span>
            </button>
          ) : activeEngine === 'direct' ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/75 border border-emerald-400/50 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HD • فيديو سَنَد المباشر</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/75 border border-red-500/50 px-3 py-1 text-[11px] font-bold text-red-300 backdrop-blur-md shadow-md">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>بث YouTube المعتمد</span>
            </span>
          )}

          {/* زر وضع وضوح السبورة والمخطوطات */}
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

          {/* زر الوقفات والعلامات المرجعية */}
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

          {/* زر وضع المسرح العريض */}
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
            title={
              activeEngine === 'youtube'
                ? 'التقاط الشاشة مدعوم للفيديوهات المرفوعة على السيرفر'
                : 'أخذ لقطة شاشة للشرح وحفظها للكشكول (S)'
            }
            className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition cursor-pointer border ${
              activeEngine === 'youtube'
                ? 'opacity-40 cursor-not-allowed bg-stone-900/40 border-stone-800 text-stone-500'
                : 'bg-stone-900/80 hover:bg-black text-stone-300 hover:text-white border-stone-700/80'
            }`}
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

      {/* ===================== الشريط السفلي المتكامل لعناصر التحكم (Bottom Bar) ===================== */}
      <div
        className={`absolute bottom-0 right-0 left-0 z-20 flex flex-col justify-end p-3 sm:p-5 bg-gradient-to-t from-black/98 via-black/85 to-transparent transition-opacity duration-300 space-y-2.5 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. شريط التقدم التفاعلي (Interactive Timeline Scrubber) */}
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

          {/* فصول المجلس (Chapters Markers) إن وجدت */}
          {duration > 0 &&
            chapters.map((ch, idx) => {
              const pos = (ch.time / duration) * 100
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    performSeek(ch.time)
                    showFeedback(`فصل: ${ch.title}`)
                  }}
                  title={`فصل: ${ch.title} (${formatTime(ch.time)})`}
                  style={{ left: `${pos}%` }}
                  className="group/ch absolute top-0 bottom-0 z-10 w-1 bg-black/60 hover:w-1.5 hover:bg-amber-300 transition-all cursor-pointer"
                >
                  <div className="absolute -top-7 -translate-x-1/2 hidden group-hover/ch:block rounded-md bg-stone-900 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-300 whitespace-nowrap shadow-xl pointer-events-none">
                    {ch.title}
                  </div>
                </div>
              )
            })}

          {/* العلامات المرجعية والوقفات العلمية على خط الزمن */}
          {duration > 0 &&
            bookmarks.map((bm) => {
              const pos = (bm.time / duration) * 100
              return (
                <div
                  key={bm.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    performSeek(bm.time)
                    showFeedback(`انتقال للوقفة: ${bm.label} 🔖`)
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
              )
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

        {/* 2. أزرار وأدوات التحكم الرئيسية عالية التباين */}
        <div className="flex items-center justify-between text-white text-xs pt-1">
          {/* الجزء الأيمن (التحكم بالتشغيل والتنقل والصوت) */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
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

            {/* التحكم بالصوت مع شريط انزلاقي ومضخم الصوت */}
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

              {/* زر مضخم الصوت الرقمي (Audio Boost حتى 200%) */}
              <button
                type="button"
                onClick={handleToggleAudioBoost}
                title={
                  activeEngine === 'youtube'
                    ? 'مضخم الصوت الرقمي متاح للفيديوهات المرفوعة مباشرة'
                    : 'تضخيم الصوت الرقمي وتحسين مخارج الحروف للتسجيلات المنخفضة (150% / 200%)'
                }
                className={`text-[10px] font-black rounded-lg px-2 py-0.5 transition cursor-pointer border ${
                  audioBoost > 1
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md font-black'
                    : activeEngine === 'youtube'
                    ? 'opacity-40 bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-stone-900/80 hover:bg-black text-stone-200 border-stone-700/80'
                }`}
              >
                {Math.round(audioBoost * 100)}%
              </button>
            </div>

            {/* عداد الوقت الرقمي عالي التباين LTR */}
            <div
              dir="ltr"
              className="flex items-center gap-1 text-[11px] font-mono font-bold text-stone-200 pr-1 drop-shadow-md"
            >
              <span className="text-amber-300">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* الجزء الأيسر (السرعة، الوقفات، الفصول، المؤقت، PiP، ملء الشاشة) */}
          <div className="flex items-center gap-2 relative">
            {/* زر قائمة فصول المجلس إن توفرت */}
            {chapters.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowChaptersMenu(!showChaptersMenu)}
                  title="فصول ومحاور المجلس"
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer border ${
                    showChaptersMenu
                      ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-md'
                      : 'bg-stone-900/80 hover:bg-black text-stone-200 hover:text-white border-stone-700/80'
                  }`}
                >
                  <ListVideo className="h-4 w-4" />
                </button>

                {showChaptersMenu && (
                  <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-2xl border border-stone-700 bg-stone-900/98 p-2.5 backdrop-blur-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 min-w-[220px] max-h-56 overflow-y-auto">
                    <span className="text-[10px] font-bold text-amber-300 text-center pb-1 border-b border-stone-800">
                      📑 فصول ومسائل المجلس
                    </span>
                    {chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          performSeek(ch.time)
                          setShowChaptersMenu(false)
                          showFeedback(`انتقال إلى: ${ch.title}`)
                        }}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg text-right text-xs hover:bg-white/10 text-stone-200 cursor-pointer transition"
                      >
                        <span className="line-clamp-1">{ch.title}</span>
                        <span className="font-mono text-[10px] text-amber-300 shrink-0">
                          {formatTime(ch.time)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* زر إضافة وقفة علمية مرجعية سريعة (B) */}
            <button
              type="button"
              onClick={handleAddBookmark}
              title="إضافة وقفة علمية مرجعية عند هذه الدقيقة (B)"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900/80 hover:bg-black text-stone-200 hover:text-amber-300 border border-stone-700/80 transition cursor-pointer"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>

            {/* زر تكرار المجلس للمراجعة (Loop) */}
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
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-2xl border border-stone-700 bg-stone-900/98 p-2 backdrop-blur-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 min-w-[145px]">
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

            {/* زر تشغيل/إيقاف التفريغ النصي والترجمة (CC) */}
            {subtitlesUrl && (
              <button
                type="button"
                onClick={() => {
                  setSubtitlesEnabled(!subtitlesEnabled)
                  showFeedback(subtitlesEnabled ? 'تم إيقاف التفريغ النصي' : 'تم تفعيل التفريغ النصي')
                }}
                title={subtitlesEnabled ? 'إخفاء التفريغ النصي (CC)' : 'إظهار التفريغ النصي (CC)'}
                className={`flex h-8 px-2 items-center justify-center rounded-xl text-xs font-black transition cursor-pointer border ${
                  subtitlesEnabled
                    ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-md shadow-amber-400/20'
                    : 'bg-stone-900/80 hover:bg-black text-stone-400 hover:text-white border-stone-700/80'
                }`}
              >
                CC
              </button>
            )}

            {/* زر وقائمة سرعة التشغيل الموسعة */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="سرعة التشغيل المخصصة"
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

              {/* نافذة خيارات السرعة المتطورة */}
              {showSpeedMenu && (
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 rounded-2xl border border-stone-700 bg-stone-900/98 p-2.5 backdrop-blur-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 min-w-[220px]">
                  {/* رأس القائمة مع أزرار الزيادة والنقصان 0.1x */}
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

                  {/* شبكة السرعات السريعة */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {speedPresets.map((s) => (
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

                  {/* إدخال سرعة مخصصة يدوياً */}
                  <form onSubmit={handleApplyCustomSpeed} className="pt-2 border-t border-stone-800 flex gap-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0.25"
                      max={activeEngine === 'youtube' ? '2.0' : '4.0'}
                      placeholder="سرعة مخصصة.."
                      value={customSpeedInput}
                      onChange={(e) => setCustomSpeedInput(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-amber-400 px-2 py-1 text-xs font-bold text-stone-950 hover:bg-amber-300 transition cursor-pointer"
                    >
                      تطبيق
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* زر صورة داخل صورة (PiP) */}
            <button
              type="button"
              onClick={togglePiP}
              title={
                activeEngine === 'youtube'
                  ? 'وضع PiP متاح للفيديوهات المرفوعة على السيرفر'
                  : 'تشغيل في نافذة عائمة (Picture in Picture)'
              }
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer border ${
                isPiPActive
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                  : activeEngine === 'youtube'
                  ? 'opacity-40 bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
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

      {/* ===================== نافذة الوقفات والعلامات المرجعية ===================== */}
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
                        performSeek(bm.time)
                        setShowBookmarksModal(false)
                        showFeedback(`انتقال إلى: ${bm.label}`)
                      }}
                      className="flex items-center gap-2 text-right cursor-pointer flex-1"
                    >
                      <span className="font-mono text-xs font-bold text-amber-300 bg-stone-900 px-2 py-0.5 rounded-lg border border-stone-700">
                        {formatTime(bm.time)}
                      </span>
                      <span className="text-xs text-stone-200 font-medium line-clamp-1">
                        {bm.label}
                      </span>
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

      {/* ===================== نافذة اختصارات لوحة المفاتيح الأكاديمية ===================== */}
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
                { keys: '+ / - أو ] / [', desc: 'تعديل السرعة تدريجياً (0.1x)' },
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
