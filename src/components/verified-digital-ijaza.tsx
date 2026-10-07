'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Award,
  CheckCircle2,
  Printer,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Calendar,
  Sparkles,
  X,
  Download,
  Scroll,
} from 'lucide-react'
import QRCodeSvg from '@/components/ui/qr-code'
import { VerifiedCertificate } from '@/lib/certificate-service'

interface VerifiedDigitalIjazaProps {
  certificate: VerifiedCertificate
  isOpen: boolean
  onClose: () => void
}

export default function VerifiedDigitalIjaza({
  certificate,
  isOpen,
  onClose,
}: VerifiedDigitalIjazaProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)
  const [currentOrigin, setCurrentOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin)
    }
  }, [])

  const verifyUrl = `${currentOrigin || 'https://sanad-edu1.vercel.app'}/verify-ijaza/${encodeURIComponent(certificate.id)}`

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(verifyUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const handleCopyHash = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(certificate.verificationHash)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2500)
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-500/40 bg-[#fffef9] shadow-2xl dark:bg-[#1a1815] my-auto print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full">
        {/* شريط الإجراءات والتحكم العلوي (يُخفى عند الطباعة) */}
        <div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-50/80 px-6 py-3 dark:border-amber-900/60 dark:bg-stone-900 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Scroll className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
                الإجازة العلمية الموثقة || منصة سَنَد
              </h4>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">
                إجازة قراءة وضبط مسجلة ومعتمدة برقم تسلسلي وكود تجزئة دولي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
              title="طباعة الإجازة أو حفظها كملف PDF عالي الدقة"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>طباعة / حفظ PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition cursor-pointer dark:border-amber-700 dark:bg-stone-800 dark:text-amber-300"
              title="نسخ رابط التحقق الرسمي للمشاركة"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'تم نسخ الرابط ✓' : 'مشاركة الرابط'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* صك الإجازة التراثي المذهب (The Royal Manuscript Document) */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        <div className="p-4 sm:p-10 print:p-6 select-text">
          <div className="relative mx-auto overflow-hidden rounded-2xl border-12 border-double border-amber-700/80 bg-linear-to-b from-[#fffefc] via-[#fffcf4] to-[#fbf7ea] p-6 sm:p-10 text-center shadow-xl dark:border-amber-700/70 dark:from-[#211e18] dark:via-[#1c1914] dark:to-[#171511]">
            {/* الزخارف الأندلسية في الأركان الأربعة */}
            <div className="absolute top-2 right-2 text-amber-600/40 text-xl font-serif select-none pointer-events-none">
              ❖
            </div>
            <div className="absolute top-2 left-2 text-amber-600/40 text-xl font-serif select-none pointer-events-none">
              ❖
            </div>
            <div className="absolute bottom-2 right-2 text-amber-600/40 text-xl font-serif select-none pointer-events-none">
              ❖
            </div>
            <div className="absolute bottom-2 left-2 text-amber-600/40 text-xl font-serif select-none pointer-events-none">
              ❖
            </div>

            {/* إطار داخلي ذهبي دقيق */}
            <div className="absolute inset-3 border border-amber-500/30 rounded-xl pointer-events-none select-none" />

            {/* البسملة الشريفة */}
            <div className="space-y-1 pt-1">
              <div className="font-serif text-lg sm:text-2xl text-amber-800 dark:text-amber-400 tracking-wider">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500">
                المملكة العربية السعودية • منصة سَنَد لعلوم الشريعة والتأصيل
              </div>
            </div>

            {/* عنوان صك الإجازة */}
            <div className="my-6 space-y-2 border-y-2 border-amber-500/50 py-4 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-center gap-2">
                <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-wide text-emerald-950 dark:text-emerald-300">
                  إِجَازَةُ قِرَاءَةٍ وَضَبْطٍ وَمُدَارَسَةِ مَتْنٍ عِلْمِيٍّ
                </h1>
              </div>
              <p className="font-serif text-xs sm:text-sm text-amber-900/80 dark:text-amber-400/80">
                صادرة عن إدارة منصة سَنَد للتأصيل الشرعي المنهجي وضبط متون طالب العلم
              </p>
            </div>

            {/* ديباجة الإجازة ونصوص التلقي */}
            <div className="space-y-4 font-serif text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed italic">
                « الحَمْدُ لِلَّهِ الَّذِي رَفَعَ الَّذِينَ آمَنُوا وَأُوتُوا العِلْمَ دَرَجَاتٍ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى نَبِيِّنَا مُحَمَّدٍ خَيْرِ مَنْ بَيَّنَ السُّنَنَ وَالآيَاتِ، وَعَلَى آلِهِ وَصَحْبِهِ أَهْلِ الرِّوَايَةِ وَالدِّرَايَاتِ.. أَمَّا بَعْدُ: »
              </p>

              <p className="font-bold text-stone-900 dark:text-white pt-1">
                فَإِنَّ <span className="text-emerald-900 dark:text-emerald-400 font-black">إِدَارَةَ مَنَصَّةِ سَنَدٍ لِلتَّأْصِيلِ الشَّرْعِيِّ</span> تَشْهَدُ وَتُوثِّقُ بِأَنَّ الطَّالِبَ/ـةَ المُبَارَكَ:
              </p>

              {/* اسم الطالب بخط فخم بارز */}
              <div className="py-2">
                <span className="inline-block border-b-2 border-amber-600 px-8 py-1 font-sans text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-300 bg-amber-100/50 dark:bg-stone-900/60 rounded-t-xl shadow-xs">
                  {certificate.studentName}
                </span>
              </div>

              <p>
                قَدْ أَتَمَّ بِمَنِّ اللهِ وَتَوْفِيقِهِ حُضُورَ وَمُدَارَسَةَ جَمِيعِ مَجَالِسِ شَرْحِ:
              </p>

              {/* عنوان المتن المدارس */}
              <div className="py-1">
                <span className="inline-block rounded-2xl bg-amber-500/15 border border-amber-500/40 px-6 py-2 text-lg sm:text-xl font-black text-amber-950 dark:text-amber-200 shadow-xs">
                  « {certificate.courseTitle} »
                </span>
              </div>

              <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-1">
                {certificate.authorName && (
                  <p>
                    تَأْلِيفُ الإِمَامِ المُصَنِّفِ: <strong>{certificate.authorName}</strong>
                  </p>
                )}
                {certificate.instructorName && (
                  <p>
                    بِشَرْحِ وَبَيَانِ: <strong>{certificate.instructorName}</strong>
                  </p>
                )}
                <p className="text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                  بِوَاقِعِ ({certificate.episodesCount || 10}) مَجَالِسَ عِلْمِيَّةٍ تَأْصِيلِيَّةٍ، مَعَ ضَبْطِ الأَلْفَاظِ وَتَقْيِيدِ الفَوَائِدِ وَحِفْظِهَا فِي الكَشْكُولِ المَنْهَجِيِّ.
                </p>
              </div>

              {/* وصية طالب العلم */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-3 text-[11px] sm:text-xs text-stone-600 dark:border-amber-900/40 dark:bg-stone-900/40 leading-relaxed max-w-xl mx-auto">
                <strong>وَإِنَّ المَنَصَّةَ لَتُوصِيهِ:</strong> بِلُزُومِ تَقْوَى اللهِ تَعَالَى فِي السِّرِّ وَالعَلَنِ، وَإِخْلَاصِ القَصْدِ فِي طَلَبِ العِلْمِ، وَالعَمَلِ بِمَا تَعَلَّمَ، وَبَثِّ هَذَا الخَيْرِ وَتَعْلِيمِهِ.
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* التذييل والتوثيق الرقمي وختم المنصة وكود QR */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className="mt-8 border-t-2 border-amber-500/40 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* 1. كود QR للتحقق السريع عبر الهاتف */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-right space-y-2">
                  <div className="flex items-center gap-3">
                    <QRCodeSvg value={verifyUrl} size={88} />
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-stone-400 dark:text-stone-500">
                        امسح الكود للتحقق العالمي:
                      </span>
                      <span className="block font-mono text-xs font-black text-emerald-900 dark:text-emerald-400">
                        {certificate.serialNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>موثق ومسجل سحابياً</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. الختم الرسمي الملكي المذهب لمنصة سَنَد */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-amber-600 bg-linear-to-tr from-amber-600 via-amber-500 to-amber-700 p-1 text-white shadow-xl rotate-[-8deg] dark:border-amber-400">
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-amber-200 bg-[#064e3b] p-1 text-center shadow-inner">
                      <ShieldCheck className="h-4 w-4 text-amber-300" />
                      <span className="text-[9px] font-black tracking-widest text-amber-300 pt-0.5">
                        مَنَصَّةُ سَنَدٍ
                      </span>
                      <span className="text-[7px] font-bold text-amber-100/90 leading-tight">
                        خَتْمُ التَّوْثِيقِ الرَّسْمِيُّ
                      </span>
                      <span className="text-[7px] font-mono font-bold text-amber-300/80">
                        VERIFIED SEAL
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 mt-1">
                    تاريخ الاعتماد: {certificate.formattedDate}
                  </span>
                </div>

                {/* 3. توقيع إدارة المنصة (البراند المعتمد حصراً بدون أسماء شخصية) */}
                <div className="flex flex-col items-center sm:items-end text-center sm:text-left space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500">
                    جهة الاعتماد والتوقيع الرسمي:
                  </span>
                  <span className="font-serif text-sm font-black text-emerald-950 dark:text-emerald-300">
                    {certificate.authorityTitle}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-400">
                    {certificate.committeeTitle}
                  </span>
                  <div className="pt-1">
                    <span className="inline-block border-b-2 border-dotted border-stone-400 px-4 py-0.5 font-serif italic text-xs text-stone-500 dark:text-stone-400">
                      التوقيع المعتمد: إدارة سَنَد العامة
                    </span>
                  </div>
                </div>
              </div>

              {/* شريط كود التجزئة المشفر SHA-256 لمنع أي تزوير في أي مكان في العالم */}
              <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-2 text-center text-[10px] font-mono text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>كود التجزئة المشفر دولياً (SHA-256 Hash):</span>
                </span>
                <span className="text-emerald-800 dark:text-emerald-400 truncate max-w-md" title={certificate.verificationHash}>
                  {certificate.verificationHash}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-200 px-2 py-0.5 text-[9px] font-bold text-stone-700 hover:bg-stone-300 transition cursor-pointer dark:bg-stone-800 dark:text-stone-300 print:hidden"
                >
                  {copiedHash ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedHash ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
