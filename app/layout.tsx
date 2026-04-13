import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

import { ThemeProvider }   from '@/context/ThemeContext'
import FruitBackground     from '@/components/background/FruitBackground'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const SITE_URL = 'https://fuelist.in'
const SITE_NAME = 'Fuelist'
const DEFAULT_TITLE = 'Fuelist — Healthy Bowls Delivered'
const DEFAULT_DESCRIPTION =
  'Order handcrafted fruit bowls, breakfast bowls, and power bowls made with fresh, real ingredients. Full macro transparency. Delivered fast.'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/android-chrome-512x512.png`,
  sameAs: [],
}

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'healthy food delivery',
    'fruit bowl',
    'power bowl',
    'breakfast bowl',
    'clean eating',
    'macro friendly',
    'healthy bowls near me',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/android-chrome-512x512.png`, width: 512, height: 512, alt: 'Fuelist' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [`${SITE_URL}/android-chrome-512x512.png`],
  },
  robots: { index: true, follow: true },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full">
        {/*
          ThemeProvider must wrap everything so useTheme() works anywhere.
          FruitBackground is inside ThemeProvider so it can read the active theme.
        */}
        <ThemeProvider>
          {/* 3D canvas (fixed, behind all content, only mounts for fruit-3d theme) */}
          <FruitBackground />

          {children}
        </ThemeProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
