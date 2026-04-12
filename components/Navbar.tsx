'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Button from './ui/Button'

// ── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ avatarUrl, name, large = false }: { avatarUrl: string | null; name: string; large?: boolean }) {
  const size = large ? 48 : 34
  const base = large ? 'h-12 w-12 rounded-full ring-2 ring-green-100' : 'h-[34px] w-[34px] rounded-full ring-2 ring-green-100'

  if (avatarUrl) {
    return <Image src={avatarUrl} alt={name} width={size} height={size} className={`${base} object-cover`} referrerPolicy="no-referrer" />
  }
  return (
    <div className={`${base} bg-green-500 text-white font-bold flex items-center justify-center shrink-0 ${large ? 'text-lg' : 'text-sm'}`}>
      {name?.[0]?.toUpperCase() ?? 'U'}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { profile, avatarUrl, loading } = useAuthContext()
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname    = usePathname()

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    setMenuOpen(false)
    try { await fetch('/api/auth/signout', { method: 'POST', redirect: 'manual' }) } catch {}
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/',     label: 'Home' },
    { href: '/menu', label: 'Menu' },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-green-600">
          <span className="text-2xl">🥗</span><span>Fuelist</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className={`text-sm font-medium transition-colors ${pathname === link.href ? 'text-green-600' : 'text-gray-600 hover:text-green-600'}`}>
              {link.label}
            </Link>
          ))}
          {profile?.role === 'admin' && (
            <Link href="/admin"
              className={`text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-green-600' : 'text-gray-600 hover:text-green-600'}`}>
              Admin
            </Link>
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-[34px] w-[34px] animate-pulse rounded-full bg-gray-100" />
          ) : profile ? (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full p-0.5 hover:ring-2 hover:ring-green-300 transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="Profile menu">
                <UserAvatar avatarUrl={avatarUrl} name={profile.name} />
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="flex items-center gap-3 px-4 py-4 bg-green-50">
                    <UserAvatar avatarUrl={avatarUrl} name={profile.name} large />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
                      <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                      {profile.role === 'admin' && (
                        <span className="inline-block mt-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">Admin</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    {profile.role === 'admin' && (
                      <Link href="/admin" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <span>📊</span> Admin Dashboard
                      </Link>
                    )}
                    <Link href="/account" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Account settings
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">Log in</Button>
              <Button href="/signup" size="sm">Sign up</Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-green-600">
              {link.label}
            </Link>
          ))}
          {profile?.role === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-green-600">Admin</Link>
          )}
          <div className="pt-3 border-t border-gray-100">
            {loading ? (
              <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100" />
            ) : profile ? (
              <div className="rounded-xl bg-green-50 p-3 flex items-center gap-3">
                <UserAvatar avatarUrl={avatarUrl} name={profile.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href="/account" onClick={() => setMenuOpen(false)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-white transition-colors" aria-label="Account settings">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <button onClick={handleSignOut} className="rounded-lg p-2 text-red-400 hover:bg-red-50 transition-colors" aria-label="Sign out">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button href="/login" variant="secondary" size="sm" className="w-full justify-center" onClick={() => setMenuOpen(false)}>Log in</Button>
                <Button href="/signup" size="sm" className="w-full justify-center" onClick={() => setMenuOpen(false)}>Sign up</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
