import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ngt-fes.vercel.app'
  const lastModified = new Date()

  const routes = [
    {
      url: '',
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: '/projects',
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: '/access',
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: '/quiz',
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: '/mypage',
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
