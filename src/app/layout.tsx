import type { Metadata, Viewport } from 'next'
import { Amiri, Cairo } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ScholarlyNotification from '@/components/scholarly-notification'
import GlobalAiTutor from '@/components/global-ai-tutor'
import VisitorTracker from '@/components/visitor-tracker'
import SessionStorageSync from '@/components/session-storage-sync'
import { getCurrentStudentUser } from '@/lib/auth-helper'

// الخط الأميري الأصيل — رمز فخامة التراث والمطبعة الأميرية الكلاسيكية
const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
})

// خط كايرو العربي الفخم الواضح — حروف متباعدة مريحة للعين تمنع أي تلاصق
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
})

const siteUrl = 'https://sanad-edu1.vercel.app'

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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
  manifest: '/manifest.json',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentStudentUser()

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var theme = localStorage.getItem('sanad_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  if (!theme) localStorage.setItem('sanad_theme', 'light');
                }
              } catch (e) {}
            })();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body
        className={`${cairo.variable} ${amiri.variable} ${cairo.className} min-h-screen flex flex-col antialiased selection:bg-amber-400/30 selection:text-emerald-950 transition-colors duration-300 font-sans`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScholarlyNotification />
        <GlobalAiTutor />
        <VisitorTracker />
        <SessionStorageSync
          user={
            user
              ? {
                  email: user.email,
                  fullName: user.user_metadata?.full_name,
                  phone: user.phone,
                  authProvider: user.authProvider,
                  avatarUrl: user.avatarUrl,
                }
              : null
          }
        />
      </body>
    </html>
  )
}