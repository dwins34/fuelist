/**
 * Central theme registry.
 *
 * Each theme owns:
 *  - cssVars  : injected as CSS custom properties on <html data-theme="…">
 *  - flags    : runtime behaviour switches (enable3D, etc.)
 *  - meta     : display label & icon used in the ThemeSwitcher
 *
 * To add a new theme: add an entry to THEMES and handle its `id` in
 * globals.css [data-theme="…"] selectors.  Nothing else needs to change.
 */

export type ThemeId = 'default' | 'fruit-3d' | 'dark'

export interface ThemeConfig {
  id: ThemeId
  label: string
  icon: string           // emoji shown in switcher
  enable3D: boolean      // show Three.js canvas
  cssVars: Record<string, string>
}

export const THEMES: Record<ThemeId, ThemeConfig> = {

  // ── Default (current brand) ───────────────────────────────────────────────
  default: {
    id: 'default',
    label: 'Classic Green',
    icon: '🌿',
    enable3D: false,
    cssVars: {
      '--theme-bg':           '#ffffff',
      '--theme-surface':      '#ffffff',
      '--theme-surface-alt':  '#f9fafb',
      '--theme-border':       '#f3f4f6',
      '--theme-text-primary': '#111827',
      '--theme-text-muted':   '#6b7280',
      '--theme-accent':       '#22c55e',
      '--theme-accent-hover': '#16a34a',
      '--theme-overlay-bg':   'transparent',
      '--theme-card-bg':      '#ffffff',
      '--theme-card-border':  '#f3f4f6',
      '--theme-card-blur':    '0px',
      '--theme-nav-bg':       'rgba(255,255,255,0.90)',
      '--theme-nav-border':   '#f3f4f6',
    },
  },

  // ── Fruit 3D (hero feature) ───────────────────────────────────────────────
  'fruit-3d': {
    id: 'fruit-3d',
    label: 'Juicy 3D',
    icon: '🍊',
    enable3D: true,
    cssVars: {
      '--theme-bg':           'transparent',        // canvas shows through
      '--theme-surface':      'rgba(255,255,255,0.72)',
      '--theme-surface-alt':  'rgba(255,255,255,0.45)',
      '--theme-border':       'rgba(255,255,255,0.40)',
      '--theme-text-primary': '#1a1205',
      '--theme-text-muted':   '#78716c',
      '--theme-accent':       '#f97316',            // orange accent
      '--theme-accent-hover': '#ea580c',
      '--theme-overlay-bg':   'rgba(255,245,235,0.30)', // warm amber tint
      '--theme-card-bg':      'rgba(255,255,255,0.72)',
      '--theme-card-border':  'rgba(255,255,255,0.50)',
      '--theme-card-blur':    '14px',
      '--theme-nav-bg':       'rgba(255,255,255,0.12)',
      '--theme-nav-border':   'rgba(255,255,255,0.20)',
    },
  },

  // ── Dark ─────────────────────────────────────────────────────────────────
  dark: {
    id: 'dark',
    label: 'Dark Mode',
    icon: '🌙',
    enable3D: false,
    cssVars: {
      '--theme-bg':           '#0f172a',
      '--theme-surface':      '#1e293b',
      '--theme-surface-alt':  '#0f172a',
      '--theme-border':       '#334155',
      '--theme-text-primary': '#f1f5f9',
      '--theme-text-muted':   '#94a3b8',
      '--theme-accent':       '#22c55e',
      '--theme-accent-hover': '#16a34a',
      '--theme-overlay-bg':   'transparent',
      '--theme-card-bg':      '#1e293b',
      '--theme-card-border':  '#334155',
      '--theme-card-blur':    '0px',
      '--theme-nav-bg':       'rgba(15,23,42,0.95)',
      '--theme-nav-border':   '#334155',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]
export const DEFAULT_THEME: ThemeId = 'default'
