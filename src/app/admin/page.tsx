'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Eye,
  Calendar,
  Award,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Phone,
  RefreshCw,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  BookOpen,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import {
  SanadUser,
  subscribeToUsers,
  subscribeToOverviewStats,
  updateUserRole,
  toggleUserBanStatus,
  sendUserPasswordReset,
  recordSiteVisit,
} from '@/lib/user-service'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<SanadUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // بيانات المستخدمين الحية من Firestore
  const [users, setUsers] = useState<SanadUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [overviewStats, setOverviewStats] = useState<{
    totalUsers: number
    totalVisits: number
    lastUpdated?: string
  }>({ totalUsers: 0, totalVisits: 0 })

  // فلاتر البحث والتصفية
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')

  // حالة الإشعارات والعمليات
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [isProcessingUid, setIsProcessingUid] = useState<string | null>(null)

  // تفاصيل سجل النشاط في نافذة منبثقة (Modal)
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<SanadUser | null>(null)

  // 1. التحقق من صلاحية المشرف
  useEffect(() => {
    recordSiteVisit()

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // فحص جلسة المشرف عبر الكوكي أو التخزين المحلي كبديل سريع
        try {
          const cookieMatch = document.cookie.includes('sanad_admin_gate_token=')
          if (cookieMatch) {
            setIsAuthorized(true)
            setAuthChecking(false)
            return
          }
        } catch {}

        router.push('/login?mode=password&error=' + encodeURIComponent('يجب تسجيل الدخول بحساب المشرف للوصول إلى لوحة الإدارة'))
        return
      }

      // التحقق من صلاحية الحساب
      const cleanEmail = (fbUser.email || '').toLowerCase().trim()
      const isOwner =
        cleanEmail === 'bhaaljml480@gmail.com' ||
        cleanEmail === 'bhaaljml48@gmail.com' ||
        cleanEmail === 'bhaaljml66@gmail.com' ||
        cleanEmail === 'bhaaljml3@gmail.com' ||
        cleanEmail === 'bhaaljml62@gmail.com'

      if (isOwner) {
        setIsAuthorized(true)
        setCurrentUser({
          uid: fbUser.uid,
          fullName: fbUser.displayName || 'المشرف العام',
          email: cleanEmail,
          role: 'admin',
          status: 'active',
        })
        setAuthChecking(false)
      } else {
        // فحص دوره في Firestore
        import('firebase/firestore').then(async ({ doc, getDoc }) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', fbUser.uid))
            if (userSnap.exists() && userSnap.data()?.role === 'admin') {
              setIsAuthorized(true)
              setCurrentUser(userSnap.data() as SanadUser)
            } else {
              router.push('/login?error=' + encodeURIComponent('ليس لديك صلاحية الوصول للوحة التحكم'))
            }
          } catch {
            router.push('/login')
          } finally {
            setAuthChecking(false)
          }
        })
      }
    })

    return () => unsubscribe()
  }, [router])

  // 2. الاشتراك الحي اللحظي في مستندات Firestore
  useEffect(() => {
    if (!isAuthorized) return

    const unsubUsers = subscribeToUsers((freshUsers) => {
      setUsers(freshUsers)
      setIsLoadingUsers(false)
    })

    const unsubStats = subscribeToOverviewStats((freshStats) => {
      setOverviewStats(freshStats)
    })

    return () => {
      unsubUsers()
      unsubStats()
    }
  }, [isAuthorized])

  // إخفاء رسالة الإشعار التلقائية
  useEffect(() => {
    if (!actionNotice) return
    const timer = setTimeout(() => setActionNotice(null), 4500)
    return () => clearTimeout(timer)
  }, [actionNotice])

  // 3. حساب مؤشرات الأداء الحية (KPIs)
  const activeTodayCount = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return users.filter((u) => {
      if (!u.lastLoginAt) return false
      const timeMs =
        typeof u.lastLoginAt === 'string'
          ? new Date(u.lastLoginAt).getTime()
          : typeof (u.lastLoginAt as { toMillis?: () => number })?.toMillis === 'function'
          ? (u.lastLoginAt as { toMillis: () => number }).toMillis()
          : 0
      return timeMs > oneDayAgo
    }).length
  }, [users])

  const totalCompletedStudies = useMemo(() => {
    return users.reduce((acc, u) => acc + (u.completedCourses?.length || 0), 0)
  }, [users])

  // 4. تصفية وبحث المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q)

      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // 5. إجراءات الإدارة
  const handleToggleRole = async (user: SanadUser) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin'
    setIsProcessingUid(user.uid)
    const success = await updateUserRole(user.uid, newRole)
    setIsProcessingUid(null)

    if (success) {
      setActionNotice({
        type: 'success',
        text: `تم تغيير رتبة «${user.fullName}» إلى: ${newRole === 'admin' ? 'مشرف عام' : 'طالب علم'} بنجاح`,
      })
    } else {
      setActionNotice({ type: 'error', text: 'فشل تحديث الصلاحية، يرجى مراجعة إعدادات Firestore' })
    }
  }

  const handleToggleBan = async (user: SanadUser) => {
    const newStatus = user.status === 'banned' ? 'active' : 'banned'
    setIsProcessingUid(user.uid)
    const success = await toggleUserBanStatus(user.uid, newStatus)
    setIsProcessingUid(null)

    if (success) {
      setActionNotice({
        type: 'success',
        text: newStatus === 'banned'
          ? `تم تجميد وحظر حساب «${user.fullName}» فورياً`
          : `تم تنشيط وإلغاء حظر حساب «${user.fullName}» بنجاح`,
      })
    } else {
      setActionNotice({ type: 'error', text: 'فشل تغيير حالة الحظر' })
    }
  }

  const handleSendResetEmail = async (email: string) => {
    if (!email) return
    setIsProcessingUid(email)
    const res = await sendUserPasswordReset(email)
    setIsProcessingUid(null)
    setActionNotice({
      type: res.success ? 'success' : 'error',
      text: res.message,
    })
  }

  // 6. تصدير بيانات المستخدمين كملف Excel/CSV مع BOM للغة العربية
  const handleExportCSV = () => {
    if (users.length === 0) return

    const headers = [
      'المعرف الفريد (UID)',
      'الاسم الكامل',
      'البريد الإلكتروني',
      'رقم الهاتف',
      'الرتبة',
      'حالة الحساب',
      'تاريخ الانضمام',
      'دقائق المدارسة',
    ]

    const rows = users.map((u) => [
      `"${u.uid}"`,
      `"${u.fullName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phoneNumber || ''}"`,
      `"${u.role === 'admin' ? 'مشرف' : 'طالب'}"`,
      `"${u.status === 'banned' ? 'محظور' : 'نشط'}"`,
      `"${formatDate(u.createdAt)}"`,
      `"${u.totalStudyMinutes || 0}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `sanad_students_backup_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setActionNotice({
      type: 'success',
      text: 'تم تصدير سجل الطلاب كملف CSV احتياطي بنجاح!',
    })
  }

  function formatDate(val: unknown): string {
    if (!val) return '—'
    try {
      if (typeof val === 'string') return new Date(val).toLocaleDateString('ar-EG')
      const timestampObj = val as { toDate?: () => Date; seconds?: number }
      if (typeof timestampObj.toDate === 'function') return timestampObj.toDate().toLocaleDateString('ar-EG')
      if (typeof timestampObj.seconds === 'number') return new Date(timestampObj.seconds * 1000).toLocaleDateString('ar-EG')
    } catch {}
    return '—'
  }

  if (authChecking) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <RefreshCw className="h-10 w-10 animate-spin text-emerald-800 dark:text-emerald-400" />
        <p className="mt-4 text-sm font-bold text-stone-600 dark:text-stone-300">
          جاري التحقق من هوية المشرف والصلاحيات السحابية...
        </p>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#fcf9f2] pb-24 text-stone-900 transition-colors duration-200 dark:bg-stone-950 dark:text-stone-100">
      {/* ===================== الترويسة الإدارية العليا ===================== */}
      <div className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-900 to-teal-950 text-amber-300 shadow-md ring-1 ring-amber-400/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                    لوحة تحكم المشرف العام
                  </h1>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/50">
                    بث حي مباشر
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  منصة سَنَد للتعليم الشرعي • إدارة الحسابات، الأذونات، والتأصيل
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-xs hover:border-emerald-700 hover:text-emerald-900 hover:bg-emerald-50/40 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:text-emerald-400"
              >
                <Download className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>تصدير نسخة إكسل (CSV)</span>
              </button>

              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-emerald-800 to-emerald-950 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-emerald-900 transition border border-emerald-600/30"
              >
                <span>العودة للمنصة</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 max-w-7xl">
        {/* إشعار العمليات التفاعلي */}
        {actionNotice && (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-bold shadow-md transition-all animate-in fade-in slide-in-from-top duration-300 ${
              actionNotice.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{actionNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===================== كروت الإحصائيات الحية (KPIs) ===================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* كرت 1: إجمالي الزيارات */}
          <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                إجمالي الزيارات
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <Eye className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-mono text-3xl font-black text-stone-900 dark:text-white">
                {overviewStats.totalVisits.toLocaleString('ar-EG')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              زيادة تلقائية لحظية عند كل دخول
            </p>
          </div>

          {/* كرت 2: الطلاب المسجلون */}
          <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                الطلاب المسجلون
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-stone-900 dark:text-white">
                {users.length.toLocaleString('ar-EG')}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                طالب علم
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              مأخوذة حياً من مجموعة users في Firestore
            </p>
          </div>

          {/* كرت 3: النشطون اليوم */}
          <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                النشطون اليوم
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-stone-900 dark:text-white">
                {activeTodayCount.toLocaleString('ar-EG')}
              </span>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                خلال 24 ساعة
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              سجلوا دخول أو تدارسوا اليوم
            </p>
          </div>

          {/* كرت 4: الدروس المنجزة */}
          <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                الدروس المنجزة
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-stone-900 dark:text-white">
                {totalCompletedStudies.toLocaleString('ar-EG')}
              </span>
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400">
                متناً منجزاً
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              إجمالي المتون المكتملة والمجازة
            </p>
          </div>
        </div>

        {/* ===================== شريط البحث والفلترة ===================== */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
            {/* حقل البحث */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800/80"
              />
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* أدوات الفلترة */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* فلتر الرتبة */}
              <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 text-xs dark:border-stone-700 dark:bg-stone-800">
                <span className="px-2 text-[11px] text-stone-400 font-bold">الرتبة:</span>
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('student')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    roleFilter === 'student'
                      ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  الطلاب
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('admin')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    roleFilter === 'admin'
                      ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  المشرفين
                </button>
              </div>

              {/* فلتر الحالة */}
              <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 text-xs dark:border-stone-700 dark:bg-stone-800">
                <span className="px-2 text-[11px] text-stone-400 font-bold">الحالة:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-white text-emerald-950 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  النشطين
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('banned')}
                  className={`rounded-xl px-2.5 py-1 font-bold transition cursor-pointer ${
                    statusFilter === 'banned'
                      ? 'bg-white text-red-950 shadow-2xs dark:bg-stone-700 dark:text-red-300'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  المحظورين
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== جدول إدارة المستخدمين التفاعلي ===================== */}
        <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <div className="p-4 sm:p-5 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                سجل الطلاب والمستخدمين ({filteredUsers.length})
              </h2>
            </div>
            <span className="text-xs text-stone-400">
              مرتبون تنازلياً من الأحدث للأقدم
            </span>
          </div>

          {isLoadingUsers ? (
            <div className="py-16 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
              <p className="mt-3 text-xs text-stone-500">جاري تحميل سجلات الطلاب من Cloud Firestore...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <UserX className="mx-auto h-10 w-10 text-stone-400" />
              <p className="mt-3 text-sm font-bold text-stone-600 dark:text-stone-300">
                لم يتم العثور على أي نتائج تطابق البحث الحالي
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#fbf9f4] text-stone-600 dark:bg-stone-800/80 dark:text-stone-300 border-b border-stone-200/80 dark:border-stone-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">الطالب</th>
                    <th className="py-3 px-4 font-bold">بيانات الاتصال</th>
                    <th className="py-3 px-4 font-bold">الرتبة</th>
                    <th className="py-3 px-4 font-bold">الحالة</th>
                    <th className="py-3 px-4 font-bold">تاريخ الانضمام</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredUsers.map((u) => {
                    const isProcessing = isProcessingUid === u.uid
                    return (
                      <tr
                        key={u.uid}
                        className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        {/* 1. الاسم والصورة الشخصية */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {u.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={u.avatarUrl}
                                alt={u.fullName}
                                className="h-9 w-9 rounded-full object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-emerald-800 to-teal-900 text-amber-200 font-bold text-xs shadow-inner">
                                {u.fullName?.charAt(0) || 'ط'}
                              </div>
                            )}
                            <div>
                              <span className="block font-bold text-stone-900 dark:text-white">
                                {u.fullName || 'طالب علم'}
                              </span>
                              <span className="block font-mono text-[10px] text-stone-400">
                                UID: {u.uid.slice(0, 10)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. البريد ورقم الهاتف */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="space-y-0.5">
                            <span className="block text-stone-800 dark:text-stone-200 text-xs">
                              {u.email || '—'}
                            </span>
                            {u.phoneNumber ? (
                              <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                                📞 {u.phoneNumber}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. الرتبة */}
                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
                              <ShieldCheck className="h-3 w-3 text-amber-600" />
                              <span>مشرف</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                              <span>طالب علم</span>
                            </span>
                          )}
                        </td>

                        {/* 4. الحالة */}
                        <td className="py-3.5 px-4">
                          {u.status === 'banned' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-950 border border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800">
                              <UserX className="h-3 w-3 text-red-600" />
                              <span>محظور</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-950 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800">
                              <UserCheck className="h-3 w-3 text-emerald-600" />
                              <span>نشط</span>
                            </span>
                          )}
                        </td>

                        {/* 5. تاريخ الانضمام وآخر ظهور */}
                        <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 text-[11px]">
                          <div>
                            <span>{formatDate(u.createdAt)}</span>
                            {u.lastLoginAt ? (
                              <span className="block text-[10px] text-stone-400 mt-0.5">
                                آخر ظهور: {formatDate(u.lastLoginAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 6. عمود الإجراءات */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* زر تعديل الصلاحية */}
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              disabled={isProcessing}
                              title={u.role === 'admin' ? 'إرجاع الحساب لطالب عادي' : 'ترقية الحساب لمشرف'}
                              className="rounded-xl border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-amber-400 disabled:opacity-40"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>

                            {/* زر الحظر / التنشيط */}
                            <button
                              type="button"
                              onClick={() => handleToggleBan(u)}
                              disabled={isProcessing}
                              title={u.status === 'banned' ? 'إلغاء حظر الحساب' : 'حظر الحساب وتجميده'}
                              className={`rounded-xl border p-1.5 transition cursor-pointer disabled:opacity-40 ${
                                u.status === 'banned'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                              }`}
                            >
                              {u.status === 'banned' ? (
                                <UserCheck className="h-3.5 w-3.5" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* زر إعادة ضبط كلمة المرور */}
                            <button
                              type="button"
                              onClick={() => handleSendResetEmail(u.email)}
                              disabled={isProcessing || !u.email}
                              title="إرسال رابط إعادة تعيين كلمة المرور إلى بريده"
                              className="rounded-xl border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-emerald-400 disabled:opacity-40"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>

                            {/* زر سجل النشاط */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForActivity(u)}
                              title="عرض سجل نشاط الطالب والدروس المنجزة"
                              className="rounded-xl border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-teal-600 hover:text-teal-900 hover:bg-teal-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-teal-400"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===================== نافذة تفاصيل وسجل النشاط (Activity Modal) ===================== */}
      {selectedUserForActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    سجل نشاط: {selectedUserForActivity.fullName}
                  </h3>
                  <span className="text-xs text-stone-400">{selectedUserForActivity.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForActivity(null)}
                className="rounded-xl p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/60">
                  <span className="block text-[11px] text-stone-400">دقائق المدارسة</span>
                  <span className="font-mono text-lg font-black text-emerald-800 dark:text-emerald-300">
                    {selectedUserForActivity.totalStudyMinutes || 0} دقيقة
                  </span>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/60">
                  <span className="block text-[11px] text-stone-400">المتون المنجزة</span>
                  <span className="font-mono text-lg font-black text-amber-700 dark:text-amber-400">
                    {selectedUserForActivity.completedCourses?.length || 0} متن
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-2">
                  قائمة المتون المنجزة:
                </h4>
                {selectedUserForActivity.completedCourses && selectedUserForActivity.completedCourses.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedUserForActivity.completedCourses.map((slug) => (
                      <div
                        key={slug}
                        className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-950 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between"
                      >
                        <span>{slug}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 italic">لم يتم إنجاز متون كاملة حتى الآن.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserForActivity(null)}
                className="rounded-xl bg-stone-100 px-4 py-2 font-bold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
