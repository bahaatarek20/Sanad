import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تسجيل الدخول وبداية الطلب',
  description: 'سجّل دخولك في منصة سَنَد لحفظ كشكول فوائدك العلمية ومتابعة رحلتك في مدارسة المتون الشرعية.',
  alternates: {
    canonical: 'https://sanad.vercel.app/login',
  },
  openGraph: {
    title: 'تسجيل الدخول وبداية الطلب || منصة سَنَد',
    description: 'سجّل دخولك في منصة سَنَد لحفظ كشكول فوائدك العلمية ومتابعة رحلتك في مدارسة المتون الشرعية.',
    url: 'https://sanad.vercel.app/login',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
