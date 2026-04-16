'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

const FOOTER_LINKS = [
  {
    title: 'Selection',
    links: [
      { label: 'Signature Menu', href: '/menu' },
      { label: 'High Protein', href: '/menu?category=power' },
      { label: 'Morning Fuel', href: '/menu?category=breakfast' },
      { label: 'Fresh Fruits', href: '/menu?category=fruit' }
    ]
  },
  {
    title: 'Plans',
    links: [
      { label: 'Subscriptions', href: '/about#subscriptions' },
      { label: 'Fuelist Rewards', href: '/account' },
      { label: 'How it Works', href: '/about' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/contact' },
      { label: 'Account', href: '/account' },
      { label: 'Contact Us', href: '/contact' }
    ]
  }
]

import { useServiceStatus } from '@/context/ServiceStatusContext'

export default function Footer() {
  const { isEnabled } = useServiceStatus()

  return (
    <footer className="bg-white border-t border-stone-50 pt-12 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 mb-4 lg:grid-cols-5 gap-16">
          {/* Brand Focus */}
          <div className="lg:col-span-2 space-y-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center p-2 shadow-md shadow-amber-200 group-hover:rotate-6 transition-transform">
                <Icon name="bowl" size={24} className="text-white" />
              </div>
              <span className="text-3xl font-black text-stone-900 tracking-tighter">Fuelist</span>
            </Link>

            <p className="text-stone-400 text-lg font-medium leading-relaxed max-w-sm">
              Fresh, handcrafted bowls made for people who care about what they eat. Nutritious by design, delicious by nature.
            </p>

            <div className="flex items-center gap-4">
              <a
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/fuelist"}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 w-12 rounded-[1.25rem] bg-stone-50 text-stone-300 flex items-center justify-center hover:bg-amber-50 hover:text-amber-500 transition-all shadow-inner group"
                title="Join our premium community on Instagram"
              >
                <Icon name="search" size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              </a>
              <div className="text-xs font-black uppercase tracking-widest text-stone-300">
                Join our premium community
              </div>
            </div>
          </div>

          {/* Navigational Links */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title} className="space-y-8">
              <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest ml-3">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-stone-400 hover:text-amber-600 transition-all text-sm font-bold capitalize tracking-tight"
                    >
                      <span className="h-1 w-1 rounded-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* High-Contrast Bottom Tier */}
        <div className="pt-4 border-t border-stone-50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <p className="text-xs font-black uppercase tracking-widest text-stone-300 opacity-60">
              © {new Date().getFullYear()} FUELIST PVT LTD.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-xs font-black capitalize tracking-widest text-stone-300 hover:text-stone-900">Privacy Policy</Link>
              <Link href="/terms" className="text-xs font-black capitalize tracking-widest text-stone-300 hover:text-stone-900">Terms Of Service</Link>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2 px-5 rounded-full bg-stone-50 border border-stone-100 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Status</span>
            <div className={cn(
              "h-1.5 w-1.5 rounded-full shadow-sm animate-pulse",
              isEnabled ? "bg-emerald-500 shadow-emerald-200" : "bg-rose-500 shadow-rose-200"
            )} />
            <span className="text-[10px] font-black capitalize tracking-wider text-stone-900">
              {isEnabled ? 'Open for Deliveries' : 'Temporarily Closed'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

