import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your Fuelist profile, reward points, and account settings.',
  alternates: { canonical: 'https://fuelist.in/account' },
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
