import type { Metadata } from 'next'
import MenuClient from '../menu/MenuClient'
import { SEO_CONFIG } from '@/lib/seo'

export const metadata: Metadata = {
  title: SEO_CONFIG.fruitDeliveryDelhi.title,
  description: SEO_CONFIG.fruitDeliveryDelhi.description,
  alternates: {
    canonical: '/fruit-delivery-delhi',
  },
}

export default function FruitDeliveryDelhiPage() {
  return (
    <div className="flex flex-col">
      <div className="bg-stone-900 py-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-black text-amber-500 tracking-tighter uppercase">
          {SEO_CONFIG.fruitDeliveryDelhi.h1}
        </h1>
        <p className="text-stone-400 mt-4 text-sm font-medium tracking-widest uppercase">
          Premium Fruit Logistics • Delhi NCR • Express Delivery
        </p>
      </div>
      <MenuClient defaultCategory="fruit" />
    </div>
  )
}
