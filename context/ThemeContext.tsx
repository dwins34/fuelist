'use client'

/**
 * ThemeContext — global theme state.
 *
 * Usage:
 *   const { themeId, theme, setTheme } = useTheme()
 *
 * The provider:
 *  1. Always applies the DEFAULT_THEME (theme switching is currently disabled)
 *  2. Applies CSS variables to <html> so every component inherits them
 *  3. Sets data-theme attribute for CSS selector overrides (globals.css)
 *
 * To re-enable theme switching:
 *  1. Uncomment the readSaved() call in the useEffect below
 *  2. Uncomment the localStorage.setItem line in setTheme
 *  3. Un-stub setTheme (remove the no-op guard)
 *  4. Re-add the [data-theme="…"] overrides in globals.css
 *  5. Render <ThemeSwitcher /> wherever desired
 */

import {
  createContext, useContext, useEffect,
  useCallback, ReactNode,
} from 'react'
import { THEMES, DEFAULT_THEME, ThemeId, ThemeConfig } from '@/lib/themes'

interface ThemeContextValue {
  themeId:  ThemeId
  theme:    ThemeConfig
  /** No-op while theme switching is disabled. Re-enable in ThemeContext to use. */
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyCssVars(themeId: ThemeId) {
  const cfg  = THEMES[themeId]
  const root = document.documentElement

  // data-theme drives CSS selectors in globals.css
  root.setAttribute('data-theme', themeId)

  // Inject each CSS variable onto :root
  Object.entries(cfg.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always lock to the default theme (no user selection, no localStorage)
  const themeId: ThemeId = DEFAULT_THEME

  // Apply CSS vars once on mount so components using var(--theme-*) resolve
  useEffect(() => {
    applyCssVars(DEFAULT_THEME)
  }, [])

  // No-op: theme switching is disabled.
  // To re-enable, replace this with a real setThemeId + localStorage write.
  const setTheme = useCallback((_id: ThemeId) => {
    // no-op — theme switching is currently disabled
  }, [])

  return (
    <ThemeContext.Provider value={{ themeId, theme: THEMES[themeId], setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
