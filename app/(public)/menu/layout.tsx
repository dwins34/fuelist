import type { Metadata } from 'next'

// Menu segment metadata — overrides root layout for all /menu routes.
// Because the menu page itself is a 'use client' component, metadata must
// be exported from a server component (this layout).
export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Browse our full menu of fruit bowls, breakfast bowls, and power bowls. Filter by protein, calories, and more. Full macro info on every item.',
  alternates: { canonical: 'https://fuelist.in/menu' },
  openGraph: {
    title: 'Menu | Fuelist',
    description: 'Explore fresh, nutritious bowls with full macro transparency.',
    url: 'https://fuelist.in/menu',
  },
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
