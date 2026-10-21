import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sanad-edu1.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/courses',
          '/courses/*',
          '/roadmap',
          '/community',
          '/about',
          '/contact',
          '/download',
          '/verify-ijaza',
          '/verify-ijaza/*',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/sanad-control-gate',
          '/sanad-control-gate/*',
          '/admin',
          '/admin/*',
          '/dashboard',
          '/dashboard/*',
          '/settings',
          '/settings/*',
          '/inbox',
          '/inbox/*',
          '/api/*',
          '/auth/*',
          '/login',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
