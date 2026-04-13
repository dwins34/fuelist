'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from "@/components/Logo"

interface NavItem {
  href: string
  label: string
  icon: string
  external?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',               label: 'Dashboard',     icon: '📊' },
  { href: '/admin/inquiries',     label: 'Inquiries',     icon: '📧' },
  { href: '/admin/menu',          label: 'Menu Items',    icon: '🥗' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: '🔄' },
  { href: '/kitchen',             label: 'Live Orders',   icon: '🍽', external: true },
]

export default function AdminSidebar({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const closeSidebar = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-green-600">
          <Logo size={24} />
          <span className="text-sm">Fuelist Admin</span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50"
          aria-label="Open sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Backdrop (Mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-full transform bg-white transition-transform duration-300 ease-in-out lg:static lg:block lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col border-r border-gray-100">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-green-600" onClick={closeSidebar}>
              <Logo size={20} /> Fuelist
            </Link>
            <button onClick={closeSidebar} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                  {item.external && <span className="ml-auto text-[10px] opacity-40">↗</span>}
                </Link>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-gray-100 px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Signed in as</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">{userName}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
