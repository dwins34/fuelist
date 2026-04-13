import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'View and track all your Fuelist orders. Reorder your favourite bowls in one tap.',
  alternates: { canonical: 'https://fuelist.in/orders' },
  // Private page — no need to be indexed.
  robots: { index: false, follow: false },
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
