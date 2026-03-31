import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ngt-fes.vercel.app'
  const lastModified = new Date()

  // Static routes based on the current app structure
  const staticRoutes = [
    {
      url: '',
      priority: 1.0,
      changeFrequency: 'daily' as const,
    },
    {
      url: '/booth',
      priority: 0.9,
      changeFrequency: 'daily' as const,
    },
    {
      url: '/display',
      priority: 0.9,
      changeFrequency: 'daily' as const,
    },
    {
      url: '/stage',
      priority: 0.9,
      changeFrequency: 'daily' as const,
    },
    {
      url: '/access',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      url: '/quiz',
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    },
  ]

  // Dynamic project routes
  const { data: projects } = await supabase
    .from('projects')
    .select('project_id')

  const projectRoutes = (projects || []).map((project) => ({
    url: `/projects/${project.project_id}`,
    priority: 0.6,
    changeFrequency: 'weekly' as const,
    lastModified,
  }))

  const allRoutes = [
    ...staticRoutes.map((route) => ({
      ...route,
      lastModified,
    })),
    ...projectRoutes,
  ]

  return allRoutes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
