import type { Metadata, Viewport } from 'next'
import { Amiri, Cairo } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import BottomNav from '@/components/bottom-nav'
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
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'منصة سَنَد التعليمية || بإشراف وتطوير م. بهاء طارق',
    template: '%s || منصة سَنَد التعليمية',
  },
  applicationName: 'منصة سَنَد التعليمية',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'منصة سَنَد',
  },
  description:
    'منصة سَنَد التعليمية: بيئة إسلامية رصينة لمدارسة وضبط المتون الشرعية والتأصيل المنهجي في الفنون التسعة. فكرة وتطوير وإشراف المهندس بهاء طارق (م. بهاء طارق) كصدقة جارية لوجه الله تعالى مجاناً بالكامل.',
  keywords: [
    'منصة سند',
    'منصة سند التعليمية',
    'بشمهندس بهاء طارق',
    'م. بهاء طارق',
    'بهاء طارق',
    'منصة بهاء طارق',
    'متون شرعية',
    'طلب العلم الشرعي',
    'مدارسة المتون',
    'تأصيل شرعي',
    'علوم إسلامية',
    'فقه',
    'عقيدة',
    'حديث',
    'أصول الفقه',
    'نحو',
    'Sanad platform',
    'Bahaa Tarek',
  ],
  authors: [
    { name: 'المهندس بهاء طارق (م. بهاء طارق)', url: 'https://sanad-edu1.vercel.app/about' },
    { name: 'منصة سَنَد التعليمية' },
  ],
  creator: 'م. بهاء طارق (بشمهندس بهاء طارق)',
  publisher: 'منصة سَنَد التعليمية',
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48 32x32 16x16' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: siteUrl,
    siteName: 'منصة سَنَد التعليمية',
    title: 'منصة سَنَد التعليمية || بإشراف وتطوير المهندس بهاء طارق',
    description:
      'منصة سَنَد التعليمية: بيئة إسلامية رصينة لمدارسة وضبط المتون الشرعية والتأصيل المنهجي في الفنون التسعة. فكرة وتطوير وإشراف المهندس بهاء طارق كصدقة جارية لوجه الله تعالى.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'منصة سَنَد التعليمية — إشراف وهندسة م. بهاء طارق',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'منصة سَنَد التعليمية || بإشراف م. بهاء طارق',
    description:
      'منصة سَنَد التعليمية لمدارسة المتون الشرعية والتأصيل المنهجي، تأسيس وبرمجة المهندس بهاء طارق مجاناً بالكامل.',
    images: ['/og-default.png'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'google-site-verification=sanad-edu-bahaa-tareq',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
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
      name: 'منصة سَنَد التعليمية',
      alternateName: [
        'منصة سند',
        'منصة بهاء طارق',
        'منصة المهندس بهاء طارق',
        'Sanad Educational Platform',
      ],
      description:
        'منصة سَنَد التعليمية: بيئة إسلامية رصينة لمدارسة المتون الشرعية وضبط الفنون التسعة. فكرة وتطوير وإشراف م. بهاء طارق.',
      inLanguage: 'ar',
      author: {
        '@type': 'Person',
        name: 'بهاء طارق',
        alternateName: ['م. بهاء طارق', 'بشمهندس بهاء طارق', 'المهندس بهاء طارق', 'Bahaa Tarek'],
        jobTitle: 'مهندس برمجيات ومؤسس منصة سَنَد التعليمية',
        url: `${siteUrl}/about`,
      },
      creator: {
        '@type': 'Person',
        name: 'بهاء طارق',
        alternateName: ['م. بهاء طارق', 'المهندس بهاء طارق'],
      },
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
      name: 'منصة سَنَد التعليمية',
      alternateName: ['منصة سند', 'منصة بهاء طارق', 'Sanad Platform'],
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      description:
        'منصة تعليمية إسلامية رصينة أسسها وطورها المهندس بهاء طارق لتيسير طلب العلم ومدارسة المتون الشرعية مجاناً لوجه الله.',
      publishingPrinciples: `${siteUrl}/about`,
      founder: {
        '@type': 'Person',
        name: 'بهاء طارق',
        alternateName: ['م. بهاء طارق', 'بشمهندس بهاء طارق', 'المهندس بهاء طارق', 'Eng. Bahaa Tarek'],
        jobTitle: 'مؤسس ومطور منصة سَنَد التعليمية',
        url: `${siteUrl}/about`,
      },
      sameAs: [
        'https://github.com/bahaatarek20/Sanad',
      ],
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}/#founder`,
      name: 'بهاء طارق',
      alternateName: ['م. بهاء طارق', 'بشمهندس بهاء طارق', 'المهندس بهاء طارق', 'Bahaa Tarek'],
      jobTitle: 'مهندس برمجيات ومؤسس منصة سَنَد',
      description: 'مهندس برمجيات ومطور منصة سَنَد لعلوم الشريعة والتأصيل المنهجي.',
      url: `${siteUrl}/about`,
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
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
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
        <main className="flex-1 pb-18 lg:pb-0">{children}</main>
        <BottomNav isLoggedIn={!!user} />
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