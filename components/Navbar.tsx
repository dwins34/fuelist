'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { Icon } from '@/lib/icons'
import Button from './ui/Button'
import Logo from "@/components/Logo"
import Dropdown from './ui/Dropdown'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

// ── Premium Avatar ───────────────────────────────────────────────────────────
function UserAvatar({ avatarUrl, name, size = 'md' }: { avatarUrl: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 56 : size === 'md' ? 40 : 32
  
  return (
    <div 
      className={cn(
        "relative shrink-0 flex items-center justify-center rounded-full overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-amber-100 to-amber-200",
        size === 'lg' ? 'h-14 w-14' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
      )}
    >
      {avatarUrl ? (
        <Image 
          src={avatarUrl} 
          alt={name} 
          width={dimensions} 
          height={dimensions} 
          className="object-cover h-full w-full" 
          referrerPolicy="no-referrer" 
        />
      ) : (
        <span className={cn("font-black text-amber-700", size === 'lg' ? 'text-xl' : 'text-sm')}>
          {name?.charAt(0).toUpperCase() || 'U'}
        </span>
      )}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, avatarUrl, loading } = useAuthContext()
  const { isEnabled } = useServiceStatus()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleSignOut() {
    try { await fetch('/api/auth/signout', { method: 'POST' }) } catch { }
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/menu', label: 'Menu', icon: 'menu' },
    { href: '/about', label: 'About', icon: 'info' },
    { href: '/contact', label: 'Contact', icon: 'mail' },
  ] as const

  const menuItems = [
    ...(profile?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Dashboard',
      icon: 'dashboard' as const,
      onClick: () => router.push('/admin')
    }] : []),
    {
      id: 'orders',
      label: 'My Orders',
      icon: 'subscriptions' as const,
      onClick: () => router.push('/orders')
    },
    {
      id: 'account',
      label: 'Account Settings',
      icon: 'settings' as const,
      onClick: () => router.push('/account')
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: 'logout' as const,
      variant: 'danger' as const,
      onClick: handleSignOut
    }
  ]

  // Premium Header for the Dropdown
  const DropdownHeader = profile ? (
    <div className="px-4 py-4 mb-1">
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar avatarUrl={avatarUrl} name={profile.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-stone-900 truncate text-sm leading-tight">{profile.name}</p>
          <p className="text-[11px] font-bold text-stone-400 truncate tracking-wide">{profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {profile.role === 'admin' && (
          <Badge variant="premium" className="text-[9px] px-2 py-0">Admin</Badge>
        )}
        <Badge variant="premium" className="text-[9px] px-2 py-0 bg-amber-50 border-amber-200 text-amber-700">
          <Icon name="points" size={10} strokeWidth={3} className="mr-1" />
          {profile.reward_points ?? 0} PTS
        </Badge>
      </div>
    </div>
  ) : null

  return (
    <header 
      className="fuelist-nav sticky z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100 transition-all duration-300"
      style={{ top: isEnabled ? '0px' : 'var(--banner-height, 0px)' }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 transition-transform active:scale-95">
          <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center p-1.5 shadow-md shadow-amber-200 group-hover:rotate-3 transition-transform">
            <Logo size={32} />
          </div>
          <span className="text-xl font-black tracking-tighter text-stone-900 group-hover:text-amber-600 transition-colors">
            Fuelist
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1 ml-auto mr-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                pathname === link.href 
                  ? "bg-amber-50 text-amber-700 shadow-sm shadow-amber-100" 
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth / Profile Area */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-stone-100" />
          ) : profile ? (
            <Dropdown
              width="w-72"
              header={DropdownHeader}
              items={menuItems}
              trigger={
                <button className="group flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-stone-50 border border-stone-100 hover:border-amber-200 transition-all hover:bg-white hover:shadow-sm">
                  <UserAvatar avatarUrl={avatarUrl} name={profile.name} size="sm" />
                  <Icon name="chevronDown" size={14} strokeWidth={3} className="text-stone-300 group-hover:text-amber-500 transition-colors" />
                </button>
              }
            />
          ) : (
            <div className="flex items-center gap-3">
              <Button href="/login" variant="ghost" size="sm">Log in</Button>
              <Button href="/signup" size="sm" className="shadow-premium">Join Now</Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2.5 rounded-2xl bg-stone-50 text-stone-600 active:scale-90 transition-all"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Icon name={mobileMenuOpen ? "close" : "menu"} size={22} strokeWidth={2.5} />
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-stone-100 bg-white overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-6 space-y-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all",
                    pathname === link.href 
                      ? "bg-amber-50 text-amber-700" 
                      : "text-stone-600 hover:bg-stone-50"
                  )}
                >
                  <Icon name={link.icon} size={20} strokeWidth={2} className="opacity-70" />
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 mt-4 border-t border-stone-50">
                {profile ? (
                  <div className="space-y-2">
                    <div className="px-4 py-4 flex items-center gap-3 bg-stone-50 rounded-[2rem] mb-4">
                      <UserAvatar avatarUrl={avatarUrl} name={profile.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-stone-900 text-sm truncate">{profile.name}</p>
                        <p className="text-[11px] font-bold text-stone-400 truncate tracking-wide">{profile.email}</p>
                      </div>
                    </div>
                    {menuItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.onClick()
                          setMobileMenuOpen(false)
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all",
                          item.variant === 'danger' ? "text-red-600 hover:bg-red-50" : "text-stone-600 hover:bg-stone-50 shadow-sm"
                        )}
                      >
                        {item.icon && <Icon name={item.icon} size={20} strokeWidth={2} />}
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button href="/login" variant="outline" size="md" className="w-full" onClick={() => setMobileMenuOpen(false)}>Log In</Button>
                    <Button href="/signup" size="md" className="w-full" onClick={() => setMobileMenuOpen(false)}>Join Now</Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
