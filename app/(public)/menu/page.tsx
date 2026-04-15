import type { Metadata } from 'next'
import MenuClient from './MenuClient'
import { SEO_CONFIG } from '@/lib/seo'

export const metadata: Metadata = {
  title: SEO_CONFIG.menu.title,
  description: SEO_CONFIG.menu.description,
  alternates: {
    canonical: '/menu',
  },
}

export default function MenuPage() {
  return <MenuClient />
}
