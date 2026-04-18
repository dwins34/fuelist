'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from "@/components/Logo"
import { Icon, IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: IconName
  external?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',               label: 'Dashboard',     icon: 'dashboard' },
  { href: '/admin/analytics',     label: 'Analytics',     icon: 'billing' },
  { href: '/admin/inquiries',     label: 'Inquiries',     icon: 'mail' },
  { href: '/admin/menu',          label: 'Menu Items',    icon: 'bowl' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { href: '/kitchen',             label: 'Live Orders',   icon: 'time', external: true },
]

export default function AdminSidebar({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const closeSidebar = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 flex h-20 items-center justify-between border-b border-stone-100 bg-white/80 backdrop-blur-xl px-6 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center p-1.5 shadow-md shadow-amber-200">
            <Logo size={24} />
          </div>
          <span className="text-lg font-black text-stone-900 tracking-tight">Fuelist Admin</span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-2xl p-2.5 text-stone-500 hover:bg-stone-50 active:scale-90 transition-all"
          aria-label="Open sidebar"
        >
          <Icon name="menu" size={24} strokeWidth={2.5} />
        </button>
      </header>

      {/* Backdrop (Mobile only) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 h-full transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:static lg:block lg:translate-x-0 bg-white",
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col border-r border-stone-100 shadow-premium">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-8 py-8">
            <Link href="/" className="flex items-center gap-3 group" onClick={closeSidebar}>
              <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center p-2 shadow-md shadow-amber-200 group-hover:rotate-3 transition-transform">
                <Logo size={24} />
              </div>
              <span className="text-xl font-black text-stone-900 tracking-tighter">Fuelist</span>
            </Link>
            <button 
              onClick={closeSidebar} 
              className="lg:hidden p-2 text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
            >
              <Icon name="close" size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* User Status Card */}
          <div className="px-6 mb-4">
            <div className="bg-stone-50 rounded-[2rem] p-5 flex items-center gap-3 border border-stone-100">
              <div className="h-10 w-10 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                {userName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black capitalize tracking-widest text-stone-400 leading-none">Administrator</p>
                <p className="mt-1 truncate text-sm font-black text-stone-900">{userName}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto px-5 py-6 custom-scrollbar">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={closeSidebar}
                  className={cn(
                    "relative flex items-center gap-4 group rounded-2xl px-5 py-4 text-sm font-black transition-all duration-300",
                    isActive
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                      : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
                    isActive ? "bg-white/20" : "bg-stone-50 text-stone-300 group-hover:bg-amber-50 group-hover:text-amber-500"
                  )}>
                    <Icon name={item.icon} size={20} strokeWidth={2.5} />
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                  {item.external && <Icon name="arrowRight" size={14} className="ml-auto opacity-30 -rotate-45" />}
                  
                  {isActive && !isOpen && (
                    <motion.div layoutId="adminNavIndicator" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer Branding */}
          <div className="mt-auto px-8 py-8 border-t border-stone-50">
            <div className="flex items-center gap-2 text-[10px] font-black text-stone-300 capitalize tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Production Ready
            </div>
            <p className="mt-2 text-[9px] font-bold text-stone-400">© 2026 Fuelist Portal v2.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
