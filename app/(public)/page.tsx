import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { SEO_CONFIG } from '@/lib/seo'

export const metadata: Metadata = {
  title: SEO_CONFIG.home.title,
  description: SEO_CONFIG.home.description,
  keywords: SEO_CONFIG.home.keywords,
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  return <HomeClient />
}
