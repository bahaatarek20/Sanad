import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sanad.vercel.app'

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
          '/privacy',
          '/terms',
          '/login',
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
          '/api/*',
          '/auth/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
