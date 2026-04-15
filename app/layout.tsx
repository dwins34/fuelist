import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

import { ThemeProvider }   from '@/context/ThemeContext'
import { ServiceStatusProvider } from '@/context/ServiceStatusContext'
import FruitBackground     from '@/components/background/FruitBackground'
import ServiceBanner       from '@/components/ServiceBanner'
import JsonLd              from '@/components/seo/JsonLd'
import { SEO_CONFIG, SITE_CONFIG, getLocalBusinessSchema } from '@/lib/seo'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_CONFIG.url}/#organization`,
  'name': SITE_CONFIG.name,
  'url': SITE_CONFIG.url,
  'logo': {
    '@type': 'ImageObject',
    'url': `${SITE_CONFIG.url}/android-chrome-512x512.png`,
    'width': 512,
    'height': 512,
  },
  'sameAs': [],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SEO_CONFIG.home.title,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SEO_CONFIG.home.description,
  keywords: SITE_CONFIG.keywords,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_CONFIG.name,
    title: SEO_CONFIG.home.title,
    description: SEO_CONFIG.home.description,
    url: SITE_CONFIG.url,
    locale: 'en_IN',
    images: [{ url: '/android-chrome-512x512.png', width: 512, height: 512, alt: SITE_CONFIG.name }],
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE_CONFIG.social.twitter,
    title: SEO_CONFIG.home.title,
    description: SEO_CONFIG.home.description,
    images: ['/android-chrome-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
    <html lang="en" className={`${geistSans.variable} h-full`} data-scroll-behavior="smooth">
      <head>
        <JsonLd data={organizationSchema} />
        <JsonLd data={getLocalBusinessSchema()} />
      </head>
      <body className="min-h-full">
        <ServiceStatusProvider>
          <ThemeProvider>
            <FruitBackground />
            <ServiceBanner />
            {children}
          </ThemeProvider>
        </ServiceStatusProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
