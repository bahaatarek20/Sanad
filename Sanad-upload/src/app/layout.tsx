import type { Metadata, Viewport } from 'next'
import { Amiri, Noto_Naskh_Arabic } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ScholarlyNotification from '@/components/scholarly-notification'
import GlobalAiTutor from '@/components/global-ai-tutor'
import VisitorTracker from '@/components/visitor-tracker'
import PwaOfflineCompanion from '@/components/pwa-offline-companion'

// الخط الأميري الأصيل — رمز فخامة التراث والمطبعة الأميرية الكلاسيكية
const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
})

// خط النسخ العربي المتقن — وضوح فائق واعتزاز بجماليات رسم الحروف
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh',
  display: 'swap',
})

const siteUrl = 'https://sanad.vercel.app'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcf9f2' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1917' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'سَنَد || رفيقك ومُعينك في طريق طلب العلم والتأصيل المنهجي',
    template: '%s || منصة سَنَد',
  },
  description: 'بيئة علمية رصينة، صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
  keywords: ['متون شرعية', 'طلب العلم', 'علوم إسلامية', 'مدارسة', 'سند', 'فقه', 'عقيدة', 'نحو', 'حديث'],
  authors: [{ name: 'منصة سَنَد لعلوم الشريعة والتأصيل' }],
  creator: 'منصة سَنَد لعلوم الشريعة والتأصيل',
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: siteUrl,
    siteName: 'منصة سَنَد',
    title: 'سَنَد || رفيقك ومُعينك في طريق طلب العلم',
    description: 'بيئة علمية رصينة، صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'منصة سَنَد — طريق التأصيل المنهجي',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سَنَد || رفيقك في طلب العلم',
    description: 'بيئة علمية رصينة لمدارسة المتون وضبط مسالك العلوم الشرعية.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
}

// البيانات الوصفية المهيكلة (Schema.org / JSON-LD) لمحركات البحث
const jsonLdData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'منصة سَنَد للتعليم الشرعي والتأصيل المنهجي',
      description: 'بيئة علمية رصينة، صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
      inLanguage: 'ar',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/courses?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${siteUrl}/#organization`,
      name: 'منصة سَنَد',
      alternateName: 'Sanad Platform',
      url: siteUrl,
      logo: `${siteUrl}/og-default.png`,
      description: 'منصة إسلامية رصينة لمدارسة المتون الشرعية والتأصيل المنهجي في الفنون التسعة.',
      publishingPrinciples: `${siteUrl}/about`,
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body
        className={`${notoNaskh.variable} ${amiri.variable} ${notoNaskh.className} min-h-screen flex flex-col antialiased selection:bg-amber-400/30 selection:text-emerald-950 transition-colors duration-300 font-sans`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScholarlyNotification />
        <GlobalAiTutor />
        <VisitorTracker />
        <PwaOfflineCompanion />
      </body>
    </html>
  )
}