import type { Metadata } from 'next'
import MenuClient from '../menu/MenuClient'
import { SEO_CONFIG } from '@/lib/seo'

export const metadata: Metadata = {
  title: SEO_CONFIG.freshFruitBowls.title,
  description: SEO_CONFIG.freshFruitBowls.description,
  alternates: {
    canonical: '/fresh-fruit-bowls-delhi',
  },
}

export default function FreshFruitBowlsPage() {
  return (
    <div className="flex flex-col">
      <div className="bg-stone-900 py-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-black text-amber-500 tracking-tighter uppercase">
          {SEO_CONFIG.freshFruitBowls.h1}
        </h1>
        <p className="text-stone-400 mt-4 text-sm font-medium tracking-widest uppercase">
          Sourced Daily • Hand-Cut • Fast Delivery
        </p>
      </div>
      <MenuClient defaultCategory="fruit" />
    </div>
  )
}
