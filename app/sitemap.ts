import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/lib/seo'

// Static public routes that should be crawled and indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/menu',
    '/about',
    '/contact',
    '/fresh-fruit-bowls-delhi',
    '/cut-fruits-near-me',
    '/fruit-delivery-delhi',
  ]

  return routes.map((route) => ({
    url: `${SITE_CONFIG.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/menu' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/menu' ? 0.9 : 0.7,
  }))
}