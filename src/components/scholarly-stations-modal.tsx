'use client'

import React, { useState } from 'react'
import {
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  Printer,
  X,
  ChevronRight,
  BookOpen,
  Compass,
  Flame,
  ShieldCheck,
  Star,
  Download,
  Share2,
  Layers,
  GraduationCap,
} from 'lucide-react'
import {
  SCHOLARLY_STATIONS,
  ScholarlyStation,
  ScholarlyBadge,
  evaluateStudentBadges,
} from '@/lib/scholarly-milestones'
import { MatnCourse } from '@/lib/curriculum-data'
import VerifiedDigitalIjaza from '@/components/verified-digital-ijaza'
import { issueCourseCertificateAction } from '@/app/actions/certificate-actions'
import { VerifiedCertificate } from '@/lib/certificate-service'

interface ScholarlyStationsModalProps {
  isOpen: boolean
  onClose: () => void
  completedCourses: MatnCourse[]
  totalCoursesCount: number
  streak?: number
  totalStudyMinutes?: number
  notesCount?: number
  studentName?: string
}

export default function ScholarlyStationsModal({
  isOpen,
  onClose,
  completedCourses,
  totalCoursesCount,
  streak = 0,
  totalStudyMinutes = 0,
  notesCount = 0,
  studentName = 'طالب العلم',
}: ScholarlyStationsModalProps) {
  const [activeTab, setActiveTab] = useState<'stations' | 'badges' | 'certificate'>('stations')
  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState<'all' | 'station' | 'discipline' | 'habit'>('all')
  const [selectedCertCourse, setSelectedCertCourse] = useState<string>(
    completedCourses.length > 0 ? completedCourses[0].title : 'الآجرومية في علم النحو'
  )
  const [verifiedCert, setVerifiedCert] = useState<VerifiedCertificate | null>(null)
  const [isVerifiedIjazaOpen, setIsVerifiedIjazaOpen] = useState(false)
  const [isIssuingCert, setIsIssuingCert] = useState(false)

  const evaluation = evaluateStudentBadges({
    completedCourses,
    totalStudyMinutes,
    streak,
    notesCount,
  })

  if (!isOpen) return null

  const filteredBadges = evaluation.allBadges.filter(
    (b) => selectedBadgeFilter === 'all' || b.category === selectedBadgeFilter
  )

  const handlePrintCertificate = () => {
    window.print()
  }

  const handleOpenVerifiedIjaza = async () => {
    setIsIssuingCert(true)
    try {
      const targetCourse = completedCourses.find((c) => c.title === selectedCertCourse) || completedCourses[0]
      const courseSlug = targetCourse?.slug || 'al-ajrumiyyah'
      const res = await issueCourseCertificateAction(courseSlug, studentName)
      if (res.success && res.certificate) {
        setVerifiedCert(res.certificate)
        setIsVerifiedIjazaOpen(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsIssuingCert(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-300/80 bg-white shadow-2xl dark:border-amber-900/60 dark:bg-stone-900 my-8">
        {/* الترويسة العلوية الفاخرة */}
        <div className="relative overflow-hidden bg-linear-to-r from-emerald-950 via-emerald-900 to-amber-950 px-6 py-6 text-white sm:px-8">
          <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-amber-400 via-emerald-300 to-amber-500" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40">
                <Trophy className="h-3.5 w-3.5" />
                <span>سُلَّم الترقي والمحطات التأصيلية</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                محطات سَنَد العلمية، الشارات، ومكافآت الإنجاز
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
                خارطة واضحة المعالم تبين أين تقف الآن، وما هي المحطات القادمة التي تنتظرك، والأوسمة والشهادات التي تستحقها.
              </p>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="rounded-full bg-white/10 p-2 text-stone-200 hover:bg-white/20 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* تبويبات النافذة الرئيسية */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('stations')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'stations'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-md'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>المحطات التأصيلية الأربع ({evaluation.currentStation.level}/4)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'badges'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-md'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>خزانة الأوسمة والشارات ({evaluation.unlockedCount}/{evaluation.allBadges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('certificate')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'certificate'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-md'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>شهادات وسند الإتقان (معاينة وطباعة)</span>
            </button>
          </div>
        </div>

        {/* محتوى التبويبات */}
        <div className="p-6 sm:p-8 max-h-[72vh] overflow-y-auto space-y-6">
          {/* ══════════════════════════════════════════════════════════════
              التبويب الأول: مسار المحطات التأصيلية الأربع
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'stations' && (
            <div className="space-y-6">
              {/* بطاقة ملخص المرتبة الحالية والهدف القادم */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      محطتك الحالية في سلم الطلب:
                    </span>
                    <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                      <span>{evaluation.currentStation.title}</span>
                      <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md dark:bg-amber-900 dark:text-amber-200 font-bold">
                        المستوى {evaluation.currentStation.level} من 4
                      </span>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300">
                      {evaluation.currentStation.subtitle} • أنجزت {completedCourses.length} متناً حتى الآن.
                    </p>
                  </div>

                  {evaluation.nextStation ? (
                    <div className="text-right sm:text-left space-y-1">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                        للارتقاء للمحطة القادمة ({evaluation.nextStation.title}):
                      </span>
                      <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">
                        تحتاج ضبط {evaluation.coursesUntilNextStation} متون إضافية
                      </p>
                      <div className="h-2 w-40 rounded-full bg-stone-200 overflow-hidden dark:bg-stone-700">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${evaluation.progressToNextStationPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 p-2 rounded-xl">
                      👑 ما شاء الله! بلغت أعلى محطات السند في المنصة.
                    </div>
                  )}
                </div>
              </div>

              {/* خط سير المحطات الأربع */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>تفاصيل ومكافآت المحطات الأربع بالترتيب:</span>
                </h4>

                <div className="space-y-4">
                  {SCHOLARLY_STATIONS.map((st) => {
                    const isPassed = completedCourses.length >= st.requiredCourses && evaluation.currentStation.level > st.level
                    const isCurrent = evaluation.currentStation.level === st.level
                    const isFuture = evaluation.currentStation.level < st.level

                    return (
                      <div
                        key={st.id}
                        className={`relative rounded-2xl border p-5 transition-all ${
                          isCurrent
                            ? 'border-amber-400 bg-amber-50/40 shadow-md ring-2 ring-amber-300/60 dark:border-amber-700 dark:bg-amber-950/20'
                            : isPassed
                            ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                            : 'border-stone-200 bg-stone-50/60 opacity-80 dark:border-stone-800 dark:bg-stone-800/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-xs ${
                                isCurrent
                                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950'
                                  : isPassed
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                              }`}
                            >
                              {st.unlockedBadge.icon}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-stone-400">
                                  المحطة #{st.level}
                                </span>
                                <h5 className="font-black text-base text-stone-900 dark:text-white">
                                  {st.title}
                                </h5>
                                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                                  ({st.subtitle})
                                </span>

                                {isCurrent && (
                                  <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black animate-pulse">
                                    📍 أنت هنا حالياً
                                  </span>
                                )}
                                {isPassed && (
                                  <span className="rounded-full bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-black">
                                    ✓ مجتازة بنجاح
                                  </span>
                                )}
                                {isFuture && (
                                  <span className="rounded-full bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 px-2 py-0.5 text-[10px] font-bold">
                                    🔒 محطة قادمة
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                                {st.description}
                              </p>

                              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-400 pt-1">
                                معيار المحطة: {st.scholarlyMilestone}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right sm:text-left border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
                            <span className="block text-xs font-bold text-stone-400">
                              شرط المحطة:
                            </span>
                            <span className="font-black text-sm text-stone-900 dark:text-white">
                              {st.requiredCourses === 0 ? 'البداية فوراً' : `${st.requiredCourses} متون منجزة`}
                            </span>
                          </div>
                        </div>

                        {/* مكافآت هذه المحطة */}
                        <div className="mt-4 border-t border-stone-200/80 pt-3 dark:border-stone-800">
                          <span className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-2">
                            🎁 ما يفتح لك في هذه المحطة (المكافآت والشارات):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {st.perks.map((perk, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-bold text-stone-700 shadow-2xs border border-stone-200 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{perk}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              التبويب الثاني: خزانة الشارات والأوسمة الشرفية
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'badges' && (
            <div className="space-y-6">
              {/* فلاتر تصنيف الشارات */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeFilter('all')}
                    className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
                      selectedBadgeFilter === 'all'
                        ? 'bg-emerald-900 text-white dark:bg-emerald-800'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    الكل ({evaluation.allBadges.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeFilter('station')}
                    className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
                      selectedBadgeFilter === 'station'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    أوسمة المحطات (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeFilter('discipline')}
                    className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
                      selectedBadgeFilter === 'discipline'
                        ? 'bg-blue-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    أوسمة العلوم واللسان (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeFilter('habit')}
                    className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
                      selectedBadgeFilter === 'habit'
                        ? 'bg-rose-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    أوسمة الهمة والمواظبة (4)
                  </button>
                </div>

                <div className="text-xs font-bold text-stone-500">
                  شاراتك المكتسبة: <strong className="text-emerald-800 dark:text-emerald-400">{evaluation.unlockedCount}</strong> من {evaluation.allBadges.length}
                </div>
              </div>

              {/* شبكة الشارات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBadges.map((badge) => {
                  const unlocked = badge.isUnlocked
                  return (
                    <div
                      key={badge.id}
                      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                        unlocked
                          ? 'border-amber-300 bg-linear-to-b from-amber-50/60 to-white shadow-xs dark:border-amber-800 dark:from-stone-900 dark:to-stone-900/90'
                          : 'border-stone-200 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-800/40 opacity-75'
                      }`}
                    >
                      {unlocked && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[9px] font-black dark:bg-amber-950 dark:text-amber-300">
                          <Sparkles className="h-3 w-3 text-amber-600" />
                          <span>مكتسبة</span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-xs ${
                            unlocked
                              ? 'bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20'
                              : 'bg-stone-200 text-stone-400 dark:bg-stone-700'
                          }`}
                        >
                          {badge.icon}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-stone-400 block truncate">
                            {badge.categoryLabel}
                          </span>
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate block">
                            {badge.title}
                          </h5>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-stone-200/70 pt-2.5 flex items-center justify-between text-[11px] dark:border-stone-700">
                        <span className="font-medium text-stone-400">طريقة الفتح:</span>
                        <span
                          className={`font-bold ${
                            unlocked
                              ? 'text-emerald-800 dark:text-emerald-400'
                              : 'text-amber-800 dark:text-amber-400'
                          }`}
                        >
                          {badge.progressText}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              التبويب الثالث: شهادات وسند الإتقان (معاينة وطباعة رسمية)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'certificate' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-stone-900 dark:text-white">
                    شهادة ضبط وإتقان متن شرعي بالسند المتصل
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    شهادة تخرج رسمية معتمدة لكل متن تتمه أو لكل مرحلة تجتازها، جاهزة للطباعة والتجليد.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCertCourse}
                    onChange={(e) => setSelectedCertCourse(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  >
                    {completedCourses.length > 0 ? (
                      completedCourses.map((c) => (
                        <option key={c.slug} value={c.title}>
                          {c.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="الآجرومية في علم النحو">متن الآجرومية في النحو (معاينة نموذجية)</option>
                        <option value="بداية المتفقه في الفقه">متن بداية المتفقه (معاينة نموذجية)</option>
                        <option value="الأصول الثلاثة في التوحيد">متن الأصول الثلاثة (معاينة نموذجية)</option>
                      </>
                    )}
                  </select>

                  <button
                    onClick={handleOpenVerifiedIjaza}
                    disabled={isIssuingCert}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Award className="h-4 w-4" />
                    <span>{isIssuingCert ? 'جارٍ التوثيق المشفر...' : 'إجازة موثقة بـ QR وكود تجزئة'}</span>
                  </button>

                  <button
                    onClick={handlePrintCertificate}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة الشهادة</span>
                  </button>
                </div>
              </div>

              {/* قالب الشهادة التراثية الرصين */}
              <div className="print-certificate-container relative mx-auto max-w-2xl overflow-hidden rounded-3xl border-8 border-double border-amber-600/60 bg-[#fffdf8] p-8 text-center shadow-lg dark:bg-[#1f1d1a] dark:border-amber-700/60 space-y-6">
                <div className="absolute top-2 right-2 text-amber-500 text-xs">﷽</div>
                <div className="absolute top-2 left-2 font-mono text-[9px] text-stone-400">
                  SANAD-CERT-#{Date.now().toString().slice(-6)}
                </div>

                {/* ترويسة الشهادة */}
                <div className="space-y-2 border-b border-amber-200 pb-4 dark:border-amber-900">
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="h-6 w-6 text-emerald-800 dark:text-emerald-400" />
                    <span className="text-xl font-black tracking-widest text-emerald-950 dark:text-white">
                      مَنَصَّةُ سَنَدٍ لِلتَّأْصِيلِ المَنْهَجِيِّ
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-amber-900 dark:text-amber-400">
                    شَهَادَةُ ضَبْطٍ وَإِتْقَانِ مَتْنٍ عِلْمِيٍّ
                  </h3>
                </div>

                {/* نص الإجازة */}
                <div className="space-y-3 font-serif text-stone-800 dark:text-stone-200 leading-relaxed text-sm sm:text-base">
                  <p>
                    الحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى سَيِّدِ المُرْسَلِينَ نَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ.
                  </p>

                  <p>
                    تَشْهَدُ مَنَصَّةُ سَنَدٍ التَّأْصِيلِيَّةُ بِأَنَّ الطَّالِبَ المُبَارَكَ:
                  </p>

                  <div className="py-2">
                    <span className="inline-block border-b-2 border-amber-600 px-6 font-sans text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-300">
                      {studentName}
                    </span>
                  </div>

                  <p>
                    قَدِ اسْتَكْمَلَ بِحَمْدِ اللهِ وَتَوْفِيقِهِ حُضُورَ مَجَالِسِ وَمُدَارَسَةِ:
                  </p>

                  <div className="py-1">
                    <span className="inline-block rounded-xl bg-amber-100/80 px-4 py-1.5 font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-200">
                      « {selectedCertCourse} »
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-lg mx-auto">
                    وَضَبَطَ مَسَائِلَهُ وَقَيَّدَ شَوَارِدَهُ وَفَوَائِدَهُ فِي كَشْكُولِهِ العِلْمِيِّ حَسَبَ المَنْهَجِ المُعْتَمَدِ، وَاسْتَحَقَّ الِارْتِقَاءَ فِي سُلَّمِ المَرَاتِبِ التَّأْصِيلِيَّةِ.
                  </p>
                </div>

                {/* ختم المنصة وتاريخ الاعتماد */}
                <div className="flex items-center justify-between border-t border-amber-200 pt-4 dark:border-amber-900 text-xs">
                  <div className="text-right space-y-1">
                    <span className="block text-stone-400 font-bold">تاريخ الاعتماد:</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {new Date().toLocaleDateString('ar-SA')} م
                    </span>
                  </div>

                  {/* الختم الدائري الذهبي */}
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-amber-600 text-center font-bold text-[9px] text-amber-800 rotate-12 dark:border-amber-500 dark:text-amber-400 shadow-inner">
                    <span>خَتْمُ سَنَدٍ الرَّسْمِيُّ</span>
                  </div>

                  <div className="text-left space-y-1">
                    <span className="block text-stone-400 font-bold">هيئة الإشراف والتأصيل:</span>
                    <span className="font-bold text-emerald-900 dark:text-emerald-400">
                      سَنَد لطلب العلم
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة الإجازة التراثية الموثقة برمز QR وكود التجزئة المشفر */}
      {isVerifiedIjazaOpen && verifiedCert && (
        <VerifiedDigitalIjaza
          certificate={verifiedCert}
          isOpen={isVerifiedIjazaOpen}
          onClose={() => setIsVerifiedIjazaOpen(false)}
        />
      )}
    </div>
  )
}
