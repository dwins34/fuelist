import type { Metadata } from 'next'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import HeroCTA from '@/components/HeroCTA'

// Page-level metadata overrides the root layout defaults for the home page.
export const metadata: Metadata = {
  title: 'Fuelist — Healthy Bowls Delivered',
  description:
    'Order handcrafted fruit bowls, breakfast bowls, and power bowls made with fresh, real ingredients. Full macro transparency. Delivered fast.',
  alternates: { canonical: 'https://fuelist.in' },
  openGraph: {
    title: 'Fuelist — Healthy Bowls Delivered',
    description: 'Fresh, nutritious bowls crafted with real ingredients. Order now.',
    url: 'https://fuelist.in',
  },
}

const FEATURES = [
  {
    icon: '🌿',
    title: 'Fresh Every Day',
    description: 'We source only the freshest seasonal fruits and whole-food ingredients.',
  },
  {
    icon: '💪',
    title: 'Packed with Protein',
    description: 'Every bowl is carefully crafted to fuel your active lifestyle.',
  },
  {
    icon: '🔬',
    title: 'Macro Transparent',
    description: 'Full calorie and macro info on every item — no guessing needed.',
  },
  {
    icon: '⚡',
    title: 'Ready in Minutes',
    description: "Freshly assembled to order — healthy food that's actually fast.",
  },
]

const CATEGORIES = [
  {
    slug: 'fruit',
    label: 'Fruit Bowls',
    description: 'Nature\'s candy, elevated.',
    emoji: '🍓',
    bg: 'bg-pink-50',
    accent: 'text-pink-600',
  },
  {
    slug: 'breakfast',
    label: 'Breakfast Bowls',
    description: 'Start strong, stay strong.',
    emoji: '🥣',
    bg: 'bg-amber-50',
    accent: 'text-amber-600',
  },
  {
    slug: 'power',
    label: 'Power Bowls',
    description: 'Fuel for the grind.',
    emoji: '🥗',
    bg: 'bg-green-50',
    accent: 'text-green-600',
  },
]


export default async function HomePage() {

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 mb-6">
            Healthy. Clean. Delicious.
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
            Fuel Your Body<br />
            <span className="text-green-500">Love Your Food</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Handcrafted fruit bowls, breakfast bowls, and power bowls made with
            real ingredients and full nutritional transparency.
          </p>
          <HeroCTA />
        </div>

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-green-100 opacity-40" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-100 opacity-40" />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Our Bowl Categories</h2>
          <p className="text-gray-500 text-lg">Pick your power — every bowl built for a purpose.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/menu?category=${cat.slug}`}>
              <div
                className={`${cat.bg} rounded-2xl p-8 text-center hover:shadow-md transition-shadow cursor-pointer group`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform inline-block">
                  {cat.emoji}
                </div>
                <h3 className={`text-xl font-bold ${cat.accent} mb-2`}>{cat.label}</h3>
                <p className="text-gray-500 text-sm">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Fuelist?</h2>
            <p className="text-gray-500 text-lg">We believe clean eating shouldn't be complicated.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="bg-green-600 px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to eat better?</h2>
        <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
          Explore our full menu and find the bowl that matches your goals.
        </p>
        <Link href="/menu">
          <Button variant="secondary" size="lg">
            See Full Menu
          </Button>
        </Link>
      </section>
    </>
  )
}
