'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Printer,
  Sparkles,
  ExternalLink,
  Search,
  Check,
  FileText,
  Clock,
  Building2,
  Lock,
} from 'lucide-react'
import { VerifiedCertificate } from '@/lib/certificate-service'
import QRCodeSvg from '@/components/ui/qr-code'
import VerifiedDigitalIjaza from '@/components/verified-digital-ijaza'

interface VerifyIjazaClientViewProps {
  cert: VerifiedCertificate | null
  integrity: { isValid: boolean; matchedHash: boolean }
  searchId: string
}

export default function VerifyIjazaClientView({
  cert,
  integrity,
  searchId,
}: VerifyIjazaClientViewProps) {
  const router = useRouter()
  const [showFullIjaza, setShowFullIjaza] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleCopyHash = () => {
    if (cert?.verificationHash && navigator?.clipboard) {
      navigator.clipboard.writeText(cert.verificationHash)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2500)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/verify-ijaza/${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // في حال كانت الشهادة غير موجودة أو ملغية
  if (!cert || !integrity.isValid) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50/80 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/60 rounded-3xl p-8 sm:p-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold font-amiri text-red-900 dark:text-red-200">
              تعذّر التحقق من صحة الإجازة
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              المعرف الذي تحاول التحقق منه <code className="bg-red-100/60 dark:bg-red-900/30 px-2 py-0.5 rounded font-mono text-red-700 dark:text-red-300 font-bold">{searchId}</code> غير مسجل في السجل التوثيقي الرسمي لمنصة سَنَد، أو قد يكون كود التجزئة المشفر غير متطابق.
            </p>
          </div>

          {/* نموذج البحث برقم آخر */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto pt-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="أدخل رقم الإجازة (مثال: SND-IJZ-2026-X8F9Q)"
              className="flex-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-center"
              dir="ltr"
            />
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>فحص</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* بطاقة الإثبات والتوثيق الرئيسية */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xl overflow-hidden">
        
        {/* الترويسة الذهبية الخضراء */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-right">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>وثيقة معتمدة ومسجلة رسمياً بسجل التأصيل الشرعي</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold font-amiri tracking-tight">
                إجازة قراءة وضبط في متن علمي
              </h1>

              <p className="text-sm text-emerald-100/90 font-light flex items-center justify-center sm:justify-start gap-2">
                <span>جهة الاعتماد:</span>
                <strong className="font-semibold text-amber-300">{cert.authorityTitle}</strong>
              </p>
            </div>

            {/* الختم الرقمي السريع */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-emerald-950 flex items-center justify-center shadow-md mb-1">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">سَنَد المعتمد</span>
            </div>
          </div>
        </div>

        {/* تفاصيل الإجازة الموثقة */}
        <div className="p-6 sm:p-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* بطاقة الطالب */}
            <div className="bg-[#fcfaf7] dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">المُجاز له (طالب العلم):</span>
              <p className="text-xl sm:text-2xl font-bold font-amiri text-stone-900 dark:text-amber-100">
                {cert.studentName}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>استوفى قراءة المتن ومحطات الفهم والتأصيل</span>
              </div>
            </div>

            {/* بطاقة المتن */}
            <div className="bg-[#fcfaf7] dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">المتن العلمي المُجاز فيه:</span>
              <p className="text-xl sm:text-2xl font-bold font-amiri text-stone-900 dark:text-amber-100">
                {cert.courseTitle}
              </p>
              {cert.authorName && (
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  <span>تأليف: </span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{cert.authorName}</span>
                </div>
              )}
            </div>

            {/* تاريخ الإصدار */}
            <div className="bg-[#fcfaf7] dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">تاريخ الاعتماد والإصدار:</span>
              <p className="text-base font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{cert.formattedDate}</span>
              </p>
              <span className="text-xs text-stone-400 block font-mono">
                {new Date(cert.issuedAt).toISOString().split('T')[0]}
              </span>
            </div>

            {/* الرقم التسلسلي */}
            <div className="bg-[#fcfaf7] dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">الرقم التسلسلي المعتمد:</span>
              <p className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-400 tracking-wider">
                {cert.serialNumber}
              </p>
              <span className="text-xs text-stone-400 block">
                معرف فريد لا يتكرر ومسجل في قاعدة التوثيق
              </span>
            </div>

          </div>

          {/* بصمة التجزئة المشفرة SHA-256 */}
          <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  كود التجزئة التوثيقي المشفر (Cryptographic SHA-256 Hash):
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" />
                <span>سليم وغير متلاعب به</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl p-3">
              <code className="text-xs font-mono text-stone-700 dark:text-stone-300 break-all flex-1 select-all" dir="ltr">
                {cert.verificationHash}
              </code>
              <button
                onClick={handleCopyHash}
                title="نسخ كود التجزئة"
                className="shrink-0 p-2 text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                {copiedHash ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              هذا الرمز المشفر يُولد رياضياً بربط اسم الطالب والمتن وتاريخ الإتمام؛ أي تغيير في أي حرف يكسر هذا الرمز فوراً مما يمنع التزوير قطعاً.
            </p>
          </div>

          {/* باركود QR للتحقق السريع ومطابقة الصفحة */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl">
            <div className="bg-white p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm shrink-0">
              <QRCodeSvg
                value={`https://sanad.edu/verify-ijaza/${encodeURIComponent(cert.id)}`}
                size={110}
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-right">
              <h3 className="font-bold text-stone-900 dark:text-amber-100 font-amiri text-lg">
                رمز الاستجابة السريعة المباشر (QR Code)
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-lg">
                يمكن لأي جهة علمية أو لجنة اختبار حول العالم مسح هذا الرمز بواسطة كاميرا الهاتف للوصول الفوري لهذه الصفحة والتحقق من صحة صدور الإجازة من منصة سَنَد.
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              onClick={() => setShowFullIjaza(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>عرض الإجازة التراثية الأصلية بالختم الكامل</span>
            </button>

            <Link
              href={`/courses/${cert.courseSlug}`}
              className="px-6 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-sm transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>صفحة المتن في المنصة</span>
            </Link>
          </div>

        </div>
      </div>

      {/* نافذة الإجازة التراثية الكاملة المنبثقة */}
      {showFullIjaza && (
        <VerifiedDigitalIjaza
          certificate={cert}
          isOpen={showFullIjaza}
          onClose={() => setShowFullIjaza(false)}
        />
      )}
    </div>
  )
}
