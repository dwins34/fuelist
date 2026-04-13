import type { MetadataRoute } from 'next'

const BASE_URL = 'https://fuelist.in'

// Static public routes that should be crawled and indexed.
// Private/auth pages (orders, account, admin) are excluded — they carry
// robots: {index: false} in their segment layouts anyway.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/menu`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]
}