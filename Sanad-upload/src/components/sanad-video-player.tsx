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
  Settings,
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
  Trash2,
  Sparkles,
  Award,
  Sliders,
  Tv,
} from 'lucide-react'

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
  src?: string
  youtubeId?: string
  youtubeUrl?: string
  title: string
  subtitle?: string
  subtitlesUrl?: string
  currentEpisodeIndex: number
  totalLessonsCount: number
  isCompleted?: boolean
  autoAdvanceNext?: boolean
  chapters?: ChapterItem[]
  introDuration?: number
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

export function extractYouTubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  )
  return match ? match[1] : null
}

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

  const detectedYtId = extractYouTubeId(youtubeId || youtubeUrl || (isDirectVideoUrl(src) ? undefined : src))
  const cleanDirectSrc = src && isDirectVideoUrl(src) ? src.trim() : undefined

  const [activeEngine, setActiveEngine] = useState<'direct' | 'youtube'>(() => {
    if (cleanDirectSrc) return 'direct'
    if (detectedYtId) return 'youtube'
    return cleanDirectSrc ? 'direct' : 'youtube'
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef<boolean>(false)
  const lastSeekTimeRef = useRef<number>(0)
  const seekTargetTimeRef = useRef<number | null>(null)
  const seekClearTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDragEndTimeRef = useRef<number>(0)
  const pendingSeekTimeRef = useRef<number | null>(initialSeekTime || null)

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
  const [audioBoost, setAudioBoost] = useState<number>(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_player_speed')
        if (saved !== null) return Number(saved)
      } catch {}
    }
    return 1
  })

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)

  // قائمة الإعدادات الموحدة الأنيقة
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [settingsView, setSettingsView] = useState<'main' | 'speed' | 'timer' | 'clarity'>('main')

  const [showBookmarksModal, setShowBookmarksModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [isLooping, setIsLooping] = useState(false)

  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [snapshotToast, setSnapshotToast] = useState(false)

  const [visualClarityMode, setVisualClarityMode] = useState<'normal' | 'clarity' | 'reading'>('normal')

  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [completionCountdown, setCompletionCountdown] = useState<number | null>(null)

  const [rippleSide, setRippleSide] = useState<'left' | 'right' | null>(null)
  const [centerIconState, setCenterIconState] = useState<
    'play' | 'pause' | 'skip-fwd' | 'skip-back' | 'speed' | 'boost' | null
  >(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)

  const [hasPlaybackError, setHasPlaybackError] = useState(false)
  const [playbackErrorMessage, setPlaybackErrorMessage] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  const speedPresets =
    activeEngine === 'youtube'
      ? [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
      : [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]

  const storageKey = detectedYtId
    ? `sanad_yt_${detectedYtId}`
    : cleanDirectSrc
    ? `sanad_src_${encodeURIComponent(cleanDirectSrc)}`
    : null

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

  const resetControlsTimeout = useCallback(() => {
    setIsControlsVisible(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false)
        setShowSettingsMenu(false)
      }, 2600)
    }
  }, [isPlaying])

  const handleMouseMove = () => {
    resetControlsTimeout()
  }

  // استرجاع الموضع المحفوظ والوقفات
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

  // حفظ الموضع تلقائياً
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
  // تكامل YouTube IFrame API
  // ==========================================
  useEffect(() => {
    if (activeEngine !== 'youtube' || !detectedYtId) return

    let isSubscribed = true
    setIsLoading(true)
    setHasPlaybackError(false)

    const initYouTubePlayer = () => {
      if (!isSubscribed || !window.YT || !window.YT.Player) return

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
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
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

              event.target.setVolume(Math.round(volume * 100))
              if (isMuted) event.target.mute()
              if (playbackSpeed !== 1) event.target.setPlaybackRate(playbackSpeed)

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
                'تعذر تشغيل هذا المقطع عبر YouTube (قد يكون الفيديو خاصاً أو مقيداً جغرافياً).'
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

  // معالجة انتهاء المجلس
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

    if (autoAdvanceNext && onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1) {
      setCompletionCountdown(6)
    }
  }, [isLooping, activeEngine, onVideoEnded, onToggleComplete, currentEpisodeIndex, autoAdvanceNext, onNextEpisode, totalLessonsCount])

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
  // عمليات التشغيل الموحدة
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

  const skipTime = useCallback(
    (seconds: number) => {
      const nextTime = Math.max(0, Math.min(duration, currentTime + seconds))
      performSeek(nextTime)
      showCenterAnimation(seconds > 0 ? 'skip-fwd' : 'skip-back', `${seconds > 0 ? '+' : ''}${seconds} ث`)
    },
    [currentTime, duration, performSeek, showCenterAnimation]
  )

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

  const handleToggleAudioBoost = () => {
    if (activeEngine === 'youtube') {
      showFeedback('تضخيم الصوت متاح للفيديوهات المباشرة')
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
      showCenterAnimation('boost', `تضخيم الصوت: ${Math.round(nextBoost * 100)}% 🔊`)
    } catch {
      showCenterAnimation('boost', `تضخيم الصوت: ${Math.round(nextBoost * 100)}% 🔊`)
    }
  }

  const handleSpeedSelect = (speed: number) => {
    const maxAllowed = activeEngine === 'youtube' ? 2.0 : 3.5
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

    showCenterAnimation('speed', `${clamped}x`)
    resetControlsTimeout()
  }

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

  const toggleLoop = () => {
    const next = !isLooping
    setIsLooping(next)
    if (videoRef.current) {
      videoRef.current.loop = next
    }
    showFeedback(next ? 'تكرار المجلس مفعل 🔁' : 'إلغاء التكرار')
  }

  const handleCaptureSnapshot = () => {
    if (activeEngine === 'youtube') {
      showFeedback('التقاط الشاشة متاح للفيديوهات المرفوعة')
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
        setTimeout(() => setSnapshotToast(false), 2500)
      }
    } catch {
      showFeedback('تعذر حفظ اللقطة')
    }
  }

  const handleAddBookmark = () => {
    const sec = Math.floor(currentTime)
    if (bookmarks.some((b) => Math.abs(b.time - sec) < 2)) {
      showFeedback('وقفة مسجلة مسبقاً 🔖')
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
    showFeedback(`حُفظت وقفة عند ${formatTime(sec)} 🔖`)
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
        ? 'وضع وضوح السبورة (تباين عالٍ) 🌟'
        : next === 'reading'
        ? 'وضع القراءة الليلية 🌙'
        : 'الألوان القياسية'
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

  // مؤقت النوم والمدارسة
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
        showFeedback('انتهى مؤقت المدارسة ⏱')
      }, 0)
      return () => clearTimeout(t)
    }

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(timer)
  }, [sleepTimerRemaining, activeEngine, showFeedback])

  // النقر المزدوج الذكي
  const handleVideoAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = e.timeStamp
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const width = rect.width
      const clickRatio = clickX / width

      if (now - lastClickTimeRef.current < 300) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current)
          clickTimeoutRef.current = null
        }

        if (clickRatio < 0.35) {
          skipTime(-10)
          setRippleSide('left')
          setTimeout(() => setRippleSide(null), 500)
        } else if (clickRatio > 0.65) {
          skipTime(10)
          setRippleSide('right')
          setTimeout(() => setRippleSide(null), 500)
        } else {
          toggleFullscreen()
        }
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          togglePlay()
        }, 220)
      }
      lastClickTimeRef.current = now
    },
    [skipTime, toggleFullscreen, togglePlay]
  )

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

  // اختصارات لوحة المفاتيح
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
    isLooping,
    performSeek,
    handleVolumeChange,
    toggleMute,
    handleCaptureSnapshot,
    handleAddBookmark,
    toggleVisualClarity,
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
          setShowSettingsMenu(false)
        }
      }}
      className={`group relative aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-stone-950 select-none shadow-2xl transition-all ${
        isFullscreen
          ? 'rounded-none h-screen w-screen border-0'
          : 'border border-stone-800/80 dark:border-stone-800'
      }`}
    >
      {/* ===================== منطقة الفيديو ===================== */}
      <div
        onClick={handleVideoAreaClick}
        style={{ filter: getVideoFilterStyle() }}
        className="relative h-full w-full cursor-pointer flex items-center justify-center bg-black transition-[filter] duration-300"
      >
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
              if (detectedYtId || fallbackYoutubeUrl) {
                setActiveEngine('youtube')
                return
              }
              setIsLoading(false)
              setHasPlaybackError(true)
              setPlaybackErrorMessage('الملف غير متوفر على هذا الخادم أو صيغته غير مدعومة.')
            }}
            className="h-full w-full object-contain pointer-events-none"
          />
        )}

        {activeEngine === 'youtube' && detectedYtId && (
          <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none">
            <div id={ytElementId} className="h-full w-full pointer-events-none scale-[1.01]" />
          </div>
        )}

        {/* مؤشر التحميل الأنيق */}
        {isLoading && !hasPlaybackError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none animate-in fade-in duration-200">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-500/20 border-t-amber-400 animate-spin" />
          </div>
        )}

        {/* وميض النقر المزدوج (Ripple) */}
        {rippleSide === 'left' && (
          <div className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-center bg-white/10 rounded-r-full pointer-events-none animate-in fade-in zoom-in-75 duration-200">
            <div className="flex flex-col items-center gap-1 text-white font-bold text-xs drop-shadow">
              <RotateCcw className="h-6 w-6" />
              <span>10-</span>
            </div>
          </div>
        )}

        {rippleSide === 'right' && (
          <div className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-center bg-white/10 rounded-l-full pointer-events-none animate-in fade-in zoom-in-75 duration-200">
            <div className="flex flex-col items-center gap-1 text-white font-bold text-xs drop-shadow">
              <RotateCw className="h-6 w-6" />
              <span>10+</span>
            </div>
          </div>
        )}
      </div>

      {/* الرسوم المتحركة في وسط الشاشة عند التفاعل (Center Animation) */}
      {(centerIconState || feedbackText) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-150">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-black/80 backdrop-blur-md px-5 py-3 text-white border border-white/10 shadow-2xl">
            {centerIconState === 'play' && (
              <Play className="h-7 w-7 fill-current text-amber-300 translate-x-0.5" />
            )}
            {centerIconState === 'pause' && <Pause className="h-7 w-7 fill-current text-amber-300" />}
            {centerIconState === 'skip-fwd' && <RotateCw className="h-7 w-7 text-amber-300" />}
            {centerIconState === 'skip-back' && <RotateCcw className="h-7 w-7 text-amber-300" />}
            {centerIconState === 'speed' && <Zap className="h-7 w-7 text-amber-300" />}
            {centerIconState === 'boost' && <Volume2 className="h-7 w-7 text-emerald-400" />}
            {feedbackText && (
              <span className="text-xs font-bold text-amber-200 tracking-wide text-center">
                {feedbackText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* زر تخطي المقدمة الصغير */}
      {introDuration && currentTime < introDuration && duration > introDuration && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            performSeek(introDuration)
            showFeedback('تم تخطي المقدمة ⏭️')
          }}
          className="absolute bottom-16 right-4 z-30 inline-flex items-center gap-1.5 rounded-xl bg-black/80 hover:bg-black text-amber-300 border border-amber-400/50 px-3 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md transition cursor-pointer"
        >
          <span>تخطي المقدمة</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {/* تنبيه لقطة الشاشة */}
      {snapshotToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/50 px-3 py-1.5 text-xs font-bold text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in">
          <Check className="h-3.5 w-3.5 text-amber-300" />
          <span>تم حفظ لقطة الشاشة 📸</span>
        </div>
      )}

      {/* زر التشغيل الدائري الهادئ في الوسط عند الإيقاف المؤقت */}
      {!isPlaying && !isLoading && !hasPlaybackError && !showCompletionScreen && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-black/25 hover:bg-black/35 transition"
        >
          <button
            type="button"
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-linear-to-tr from-emerald-800 to-amber-500 text-stone-950 shadow-2xl hover:scale-108 transition transform cursor-pointer border-2 border-amber-300/80"
            title="تشغيل (Space)"
          >
            <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-current translate-x-0.5 text-stone-950" />
          </button>
        </div>
      )}

      {/* ===================== الشريط العلوي النقي (Top Bar) ===================== */}
      <div
        className={`absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 truncate max-w-[80%]">
          <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-emerald-950 text-amber-300 font-bold text-[10px] sm:text-xs border border-emerald-500/50 shrink-0">
            {currentEpisodeIndex + 1}
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sleepTimerRemaining !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 backdrop-blur-md">
              <Timer className="h-2.5 w-2.5" />
              <span>
                {Math.floor(sleepTimerRemaining / 60)}:
                {String(sleepTimerRemaining % 60).padStart(2, '0')}
              </span>
            </span>
          )}

          {cleanDirectSrc && detectedYtId && (
            <button
              type="button"
              onClick={() => {
                setActiveEngine(activeEngine === 'direct' ? 'youtube' : 'direct')
                showFeedback(activeEngine === 'direct' ? 'بث YouTube ⇄' : 'HD المباشر ⇄')
              }}
              className="text-[10px] font-bold text-stone-300 hover:text-white bg-black/50 hover:bg-black/70 border border-stone-700/70 rounded-full px-2 py-0.5 backdrop-blur-md transition cursor-pointer"
            >
              {activeEngine === 'direct' ? 'سَنَد HD ⇄' : 'YouTube ⇄'}
            </button>
          )}
        </div>
      </div>

      {/* ===================== الشريط السفلي الأنيق غير المزدحم (Bottom Bar) ===================== */}
      <div
        className={`absolute bottom-0 right-0 left-0 z-20 flex flex-col justify-end px-3 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 space-y-1 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. شريط التقدم النحيف (Slim Scrubber) */}
        <div
          ref={progressBarRef}
          dir="ltr"
          onClick={handleSeek}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressBarHover}
          onMouseLeave={handleProgressBarLeave}
          className="group/progress relative h-1 hover:h-2 w-full cursor-pointer rounded-full bg-white/20 transition-all select-none"
        >
          {/* المخزن مؤقتاً */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-white/30 transition-all duration-150"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* المنجز */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-linear-to-r from-emerald-500 via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            style={{ width: `${playedPercent}%` }}
          />

          {/* مؤشرات الوقفات */}
          {duration > 0 &&
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                style={{ left: `${(bm.time / duration) * 100}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-1 bg-amber-400 rounded-full z-10"
                title={bm.label}
              />
            ))}

          {/* مقبض دائري مشع عند المرور */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white border border-amber-400 opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${playedPercent}% - 6px)` }}
          />

          {/* تلميح الوقت العائم */}
          {hoverTime !== null && hoverPosition !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded-md bg-stone-900 border border-stone-700 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300 shadow-xl pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* 2. صف أدوات التحكم الوحيد (Single Sleek Controls Row) */}
        <div className="flex items-center justify-between text-white pt-0.5">
          {/* الجانب الأيمن (التحكم بالتشغيل والصوت والتوقيت) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* تشغيل / إيقاف مؤقت */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 sm:p-1.5 text-stone-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title={isPlaying ? 'إيقاف مؤقت (Space)' : 'تشغيل (Space)'}
            >
              {isPlaying ? (
                <Pause className="h-4.5 w-4.5 fill-current" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-current text-amber-300" />
              )}
            </button>

            {/* تأخير 10 ثوانٍ */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="p-1 sm:p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="تأخير 10 ثوانٍ (J)"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* تقديم 10 ثوانٍ */}
            <button
              type="button"
              onClick={() => skipTime(10)}
              className="p-1 sm:p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="تقديم 10 ثوانٍ (L)"
            >
              <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* التحكم بالصوت */}
            <div className="group/vol flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 sm:p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title={isMuted ? 'إلغاء الكتم (M)' : 'كتم الصوت (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-0 group-hover/vol:w-12 sm:group-hover/vol:w-16 focus:w-12 sm:focus:w-16 h-1 bg-stone-600 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all duration-200"
              />
            </div>

            {/* عداد الوقت الرقمي */}
            <div
              dir="ltr"
              className="text-[10px] sm:text-[11px] font-mono text-stone-300 px-1 select-none"
            >
              <span className="text-amber-300 font-bold">{formatTime(currentTime)}</span>
              <span className="opacity-60"> / </span>
              <span className="opacity-80">{formatTime(duration)}</span>
            </div>
          </div>

          {/* الجانب الأيسر (الوقفات، الإعدادات الموحدة، والملء) */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 relative">
            {/* زر وقفة سريعة */}
            <button
              type="button"
              onClick={handleAddBookmark}
              className="p-1 sm:p-1.5 text-stone-300 hover:text-amber-300 hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="حفظ وقفة عند هذه اللحظة (B)"
            >
              <BookmarkPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* زر قائمة الوقفات إن وجدت */}
            {bookmarks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBookmarksModal(true)}
                className="relative p-1 sm:p-1.5 text-amber-300 hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="عرض الوقفات المحفوظة"
              >
                <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="absolute top-0 right-0 h-3 w-3 bg-amber-400 text-stone-950 font-black text-[8px] rounded-full flex items-center justify-center">
                  {bookmarks.length}
                </span>
              </button>
            )}

            {/* ترس الإعدادات الموحد الفاخر (Settings Gear) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu)
                  setSettingsView('main')
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                  showSettingsMenu
                    ? 'text-amber-300 bg-white/15'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
                title="إعدادات المشغل والسرعة"
              >
                <Settings className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${showSettingsMenu ? 'rotate-45' : ''} transition-transform duration-200`} />
              </button>

              {/* النافذة المنبثقة للإعدادات (Unified Settings Popover) */}
              {showSettingsMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-stone-700 bg-stone-900/95 p-2 backdrop-blur-xl shadow-2xl z-40 text-xs animate-in fade-in zoom-in-95 text-stone-200 space-y-1"
                >
                  {settingsView === 'main' ? (
                    <>
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-stone-800 px-1 text-[11px] font-bold text-amber-300">
                        <span>إعدادات المشغل</span>
                        <button
                          type="button"
                          onClick={() => setShowSettingsMenu(false)}
                          className="text-stone-400 hover:text-white p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* 1. سرعة التشغيل */}
                      <button
                        type="button"
                        onClick={() => setSettingsView('speed')}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="h-3.5 w-3.5 text-stone-400" />
                          <span>سرعة التشغيل</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded">
                          {playbackSpeed}x
                        </span>
                      </button>

                      {/* 2. مضخم الصوت الرقمي */}
                      <div className="p-1.5 rounded-lg hover:bg-white/5 transition flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-3.5 w-3.5 text-stone-400" />
                          <span>مضخم الصوت</span>
                        </div>
                        {activeEngine === 'direct' ? (
                          <div className="flex gap-1">
                            {[1, 1.5, 2].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  setAudioBoost(b)
                                  if (gainNodeRef.current) gainNodeRef.current.gain.value = b
                                  showFeedback(`مضخم الصوت: ${Math.round(b * 100)}%`)
                                }}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition ${
                                  audioBoost === b
                                    ? 'bg-emerald-500 text-stone-950'
                                    : 'bg-stone-800 text-stone-400 hover:text-white'
                                }`}
                              >
                                {Math.round(b * 100)}%
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[9px] text-stone-500">للمرفوع فقط</span>
                        )}
                      </div>

                      {/* 3. مؤقت المدارسة */}
                      <button
                        type="button"
                        onClick={() => setSettingsView('timer')}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Timer className="h-3.5 w-3.5 text-stone-400" />
                          <span>مؤقت المدارسة</span>
                        </div>
                        <span className="text-[10px] font-bold text-stone-400">
                          {sleepTimerMinutes ? `${sleepTimerMinutes} د` : 'متوقف'}
                        </span>
                      </button>

                      {/* 4. وضوح السبورة */}
                      <button
                        type="button"
                        onClick={toggleVisualClarity}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5 text-stone-400" />
                          <span>وضوح السبورة</span>
                        </div>
                        <span className="text-[10px] font-bold text-stone-400">
                          {visualClarityMode === 'clarity'
                            ? 'تباين عالٍ 🌟'
                            : visualClarityMode === 'reading'
                            ? 'ليلي 🌙'
                            : 'قياسي'}
                        </span>
                      </button>

                      {/* 5. تكرار المجلس */}
                      <button
                        type="button"
                        onClick={toggleLoop}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Repeat className="h-3.5 w-3.5 text-stone-400" />
                          <span>تكرار المجلس (Loop)</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isLooping ? 'text-amber-300' : 'text-stone-500'}`}>
                          {isLooping ? 'مفعل ✓' : 'متوقف'}
                        </span>
                      </button>

                      {/* 6. لقطة شاشة */}
                      {activeEngine === 'direct' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleCaptureSnapshot()
                            setShowSettingsMenu(false)
                          }}
                          className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5 text-stone-400" />
                          <span>حفظ لقطة شاشة للكشكول</span>
                        </button>
                      )}

                      {/* 7. دليل الاختصارات */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowShortcutsModal(true)
                          setShowSettingsMenu(false)
                        }}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition text-right cursor-pointer pt-1 border-t border-stone-800 text-stone-400 hover:text-white"
                      >
                        <Keyboard className="h-3.5 w-3.5" />
                        <span>اختصارات لوحة المفاتيح</span>
                      </button>
                    </>
                  ) : settingsView === 'speed' ? (
                    <>
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-stone-800 px-1 text-[11px] font-bold text-amber-300">
                        <button
                          type="button"
                          onClick={() => setSettingsView('main')}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span>عودة</span>
                        </button>
                        <span>سرعة التشغيل</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        {speedPresets.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              handleSpeedSelect(s)
                              setShowSettingsMenu(false)
                            }}
                            className={`rounded-lg py-1 text-center font-bold text-xs transition cursor-pointer ${
                              playbackSpeed === s
                                ? 'bg-amber-400 text-stone-950 font-black'
                                : 'hover:bg-white/10 text-stone-300'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-stone-800 px-1 text-[11px] font-bold text-amber-300">
                        <button
                          type="button"
                          onClick={() => setSettingsView('main')}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span>عودة</span>
                        </button>
                        <span>مؤقت المدارسة</span>
                      </div>
                      <div className="flex flex-col gap-1 pt-0.5">
                        {[15, 30, 45, 60].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSleepTimerMinutes(m)
                              setSleepTimerRemaining(m * 60)
                              setShowSettingsMenu(false)
                              showFeedback(`إيقاف بعد ${m} دقيقة`)
                            }}
                            className={`p-1.5 rounded-lg text-right text-xs transition cursor-pointer ${
                              sleepTimerMinutes === m
                                ? 'bg-amber-400 text-stone-950 font-bold'
                                : 'hover:bg-white/10 text-stone-300'
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
                              setShowSettingsMenu(false)
                              showFeedback('تم إلغاء المؤقت')
                            }}
                            className="p-1.5 rounded-lg text-right text-xs text-rose-400 hover:bg-rose-950/40 transition cursor-pointer border-t border-stone-800 mt-1"
                          >
                            إلغاء المؤقت ✕
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* المجلس التالي */}
            {onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1 && (
              <button
                type="button"
                onClick={onNextEpisode}
                className="p-1 sm:p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="المجلس التالي"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}

            {/* ملء الشاشة الكامل */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 text-stone-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title={isFullscreen ? 'الخروج من ملء الشاشة (F)' : 'ملء الشاشة (F)'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===================== النوافذ المنبثقة ===================== */}
      {/* نافذة الوقفات */}
      {showBookmarksModal && (
        <div
          onClick={() => setShowBookmarksModal(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-4 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h4 className="text-xs font-bold text-amber-300">الوقفات والعلامات المرجعية</h4>
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-center py-4 text-xs text-stone-500">لم تُحفظ وقفات بعد (اضغط B لحفظ وقفة)</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-stone-800 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        performSeek(bm.time)
                        setShowBookmarksModal(false)
                      }}
                      className="text-right cursor-pointer text-amber-300 font-mono font-bold"
                    >
                      {formatTime(bm.time)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      className="text-stone-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة اختصارات لوحة المفاتيح */}
      {showShortcutsModal && (
        <div
          onClick={() => setShowShortcutsModal(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-4 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h4 className="text-xs font-bold text-amber-300">اختصارات لوحة المفاتيح</h4>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { keys: 'Space / K', desc: 'تشغيل / إيقاف' },
                { keys: '→ / L', desc: 'تقديم 10 ثوانٍ' },
                { keys: '← / J', desc: 'تأخير 10 ثوانٍ' },
                { keys: 'M', desc: 'كتم / إلغاء الكتم' },
                { keys: 'F', desc: 'ملء الشاشة' },
                { keys: 'R', desc: 'تكرار المجلس' },
                { keys: 'B', desc: 'حفظ وقفة' },
                { keys: 'C', desc: 'وضوح السبورة' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-stone-800/50">
                  <span className="text-stone-300">{item.desc}</span>
                  <kbd className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* شاشة إتمام المجلس */}
      {showCompletionScreen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-stone-950/95 p-4 text-center backdrop-blur-md animate-in fade-in"
        >
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-stone-950 shadow-xl border border-amber-300">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-amber-300 mb-1">الحمد لله تم إتمام هذا المجلس</h3>
          <p className="text-xs text-stone-300 mb-4">«{title}»</p>

          <div className="flex gap-2">
            {onNextEpisode && currentEpisodeIndex < totalLessonsCount - 1 && (
              <button
                type="button"
                onClick={() => {
                  setShowCompletionScreen(false)
                  onNextEpisode()
                }}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-300 transition cursor-pointer"
              >
                المجلس التالي ←
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowCompletionScreen(false)
                performSeek(0)
                togglePlay()
              }}
              className="rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-bold text-stone-200 transition cursor-pointer"
            >
              إعادة المدارسة ↺
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
