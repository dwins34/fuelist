import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Fuelist — Healthy Bowls',
    template: '%s | Fuelist',
  },
  description:
    'Handcrafted fruit bowls, breakfast bowls, and power bowls made with real ingredients.',
  keywords: ['healthy food', 'fruit bowl', 'power bowl', 'breakfast bowl', 'clean eating'],
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
