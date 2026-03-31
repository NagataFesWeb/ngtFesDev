import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/login', '/mypage'],
    },
    sitemap: 'https://ngt-fes.vercel.app/sitemap.xml',
  }
}
