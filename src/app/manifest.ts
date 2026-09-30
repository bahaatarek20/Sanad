import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'سَنَد || رفيقك ومُعينك في طلب العلم',
    short_name: 'سَنَد',
    description: 'بيئة علمية رصينة، صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fcf9f2',
    theme_color: '#064e3b',
    lang: 'ar',
    dir: 'rtl',
    categories: ['education', 'books', 'lifestyle'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/og-default.png',
        sizes: '1200x630',
        type: 'image/png',
      },
    ],
  }
}