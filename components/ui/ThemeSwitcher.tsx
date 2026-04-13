'use client'

/**
 * ThemeSwitcher — compact floating theme selector.
 *
 * Currently DISABLED: returns null so no switcher UI is shown.
 *
 * To re-enable:
 *   1. Remove (or comment out) the `return null` line below.
 *   2. Re-enable setTheme in ThemeContext (remove the no-op guard).
 *   3. Restore [data-theme="..."] override blocks in globals.css.
 *
 * Variants (when active):
 *   <ThemeSwitcher />          → horizontal row (default)
 *   <ThemeSwitcher compact />  → icon-only, for tight spaces
 */

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { THEMES, THEME_IDS } from '@/lib/themes'
import { cn } from '@/lib/utils'

interface ThemeSwitcherProps {
  compact?: boolean
  className?: string
}

export default function ThemeSwitcher({ compact = false, className }: ThemeSwitcherProps) {
  // Theme switching is currently disabled — remove this line to restore the UI.
  return null

  // eslint-disable-next-line no-unreachable
  const { themeId, setTheme } = useTheme()
  const [open, setOpen]       = useState(false)

  if (compact) {
    // ── Compact: click the current theme icon to open a popover ─────────────
    return (
      <div className={cn('relative', className)}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Change theme"
          aria-label="Change theme"
          className="flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-all hover:scale-110 active:scale-95"
          style={{
            background:   'var(--theme-card-bg)',
            borderColor:  'var(--theme-card-border)',
            backdropFilter: `blur(var(--theme-card-blur))`,
          }}
        >
          {THEMES[themeId].icon}
        </button>

        {open && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <div
              className="absolute right-0 top-11 z-50 rounded-2xl border p-2 shadow-xl flex flex-col gap-1 min-w-[160px]"
              style={{
                background:     'var(--theme-card-bg)',
                borderColor:    'var(--theme-card-border)',
                backdropFilter: `blur(var(--theme-card-blur, 0px))`,
              }}
            >
              {THEME_IDS.map((id) => {
                const t = THEMES[id]
                const active = id === themeId
                return (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); setOpen(false) }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all text-left',
                      active
                        ? 'bg-white/30 font-semibold'
                        : 'hover:bg-white/20'
                    )}
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                    {active && (
                      <svg className="ml-auto h-3.5 w-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Full: pill row ────────────────────────────────────────────────────────
  return (
    <div
      className={cn('flex items-center gap-1 rounded-full border p-1', className)}
      style={{
        background:     'var(--theme-card-bg)',
        borderColor:    'var(--theme-card-border)',
        backdropFilter: `blur(var(--theme-card-blur, 0px))`,
      }}
    >
      {THEME_IDS.map((id) => {
        const t      = THEMES[id]
        const active = id === themeId
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            title={t.label}
            aria-label={`Switch to ${t.label} theme`}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              active
                ? 'bg-white shadow-sm'
                : 'hover:bg-white/40 active:scale-95'
            )}
            style={{ color: 'var(--theme-text-primary)' }}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
