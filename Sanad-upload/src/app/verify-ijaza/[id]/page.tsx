import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import {
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Printer,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react'
import { getCertificateById, verifyCertificateIntegrity } from '@/lib/certificate-service'
import QRCodeSvg from '@/components/ui/qr-code'
import VerifyIjazaClientView from './verify-client-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const cert = getCertificateById(decodedId)

  if (!cert) {
    return {
      title: 'التحقق من صحة الإجازة العلمية || منصة سَنَد',
      description: 'بوابة التحقق الرقمي الموثق من صحة الإجازات والشهادات الصادرة من منصة سَنَد للتأصيل الشرعي.',
    }
  }

  return {
    title: `توثيق إجازة: ${cert.studentName} في متن ${cert.courseTitle} || منصة سَنَد`,
    description: `إجازة قراءة وضبط موثقة برقم ${cert.serialNumber} وكود تجزئة مشفر، صادرة عن إدارة منصة سَنَد للتأصيل الشرعي.`,
  }
}

export default async function VerifyIjazaPage({ params }: PageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const cert = getCertificateById(decodedId)
  const integrity = cert ? verifyCertificateIntegrity(cert) : { isValid: false, matchedHash: false }

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121110] text-stone-800 dark:text-stone-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* شريط التنقل العلوي */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              سجل التوثيق الرقمي المشفر
            </span>
          </div>
        </div>

        {/* جسم نتيجة التحقق */}
        <VerifyIjazaClientView cert={cert} integrity={integrity} searchId={decodedId} />

      </div>
    </div>
  )
}
