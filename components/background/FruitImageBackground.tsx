'use client'

/**
 * FruitImageBackground — real HD fruit photos spread across the entire screen.
 *
 * Design decisions:
 *  • Uses real Unsplash food photography (already allowed in next.config.ts)
 *  • mix-blend-mode: multiply makes each photo's white bg transparent —
 *    fruits appear to float over the warm gradient from FruitFallback
 *  • drop-shadow gives each fruit natural depth
 *  • Positions are deliberately spread to all four corners + edges,
 *    NOT clustered in the center
 *  • Each fruit has a unique float animation with different duration + delay
 *    so motion never looks uniform
 *  • onError silently hides any photo that fails (degradation is graceful)
 *  • Entire layer is pointer-events: none — never blocks clicks
 */

import { CSSProperties } from 'react'

// ─── Fruit data ───────────────────────────────────────────────────────────────
// x/y are percentage-based positions (left/top).
// Negative values push fruits partially off-screen for a more natural edge feel.
// cut: true → circular crop to simulate a sliced cross-section view.
// opacity: controls how prominent each fruit is (background fruits are subtler).

interface FruitItem {
  id: string
  // HD Unsplash photo ID — format: https://images.unsplash.com/photo-{photoId}
  photoId: string
  label: string         // alt text (hidden from screen readers via aria-hidden parent)
  x: number            // % from left  (can be negative for partial off-screen)
  y: number            // % from top   (can be > 100 for partial off-screen)
  size: number         // px (width = height before rotate)
  rotate: number       // initial rotation in degrees
  floatDuration: number // seconds for one float cycle
  delay: number        // animation-delay in seconds
  opacity: number      // 0.5–1.0
  cut?: boolean        // true → round crop (sliced fruit cross-section)
  mobileHide?: boolean // omit on small screens for perf
}

const FRUITS: FruitItem[] = [
  // ── Top-left cluster ──────────────────────────────────────────────────────
  {
    id: 'orange-whole-tl',
    photoId: '1547514701-42782101795e',
    label: 'Orange',
    x: -4, y: -6, size: 300, rotate: -18,
    floatDuration: 9, delay: 0, opacity: 0.90,
  },
  {
    id: 'orange-slice-l',
    photoId: '1580502759754-6d00e2989594',
    label: 'Orange slices',
    x: 6, y: 34, size: 220, rotate: 12,
    floatDuration: 11, delay: 1.4, opacity: 0.85,
    cut: true,
  },
  {
    id: 'lemon-l',
    photoId: '1590502160462-58b41354f588',
    label: 'Lemon',
    x: -2, y: 62, size: 200, rotate: -8,
    floatDuration: 8, delay: 3.2, opacity: 0.80,
    mobileHide: true,
  },

  // ── Top-center ────────────────────────────────────────────────────────────
  {
    id: 'kiwi-tc',
    photoId: '1511193374-04f663d2f6bc',
    label: 'Kiwi cut in half',
    x: 33, y: -4, size: 210, rotate: 6,
    floatDuration: 10, delay: 2.0, opacity: 0.88,
    cut: true,
  },
  {
    id: 'berries-tc',
    photoId: '1498557850523-fd3d118b962e',
    label: 'Blueberries',
    x: 52, y: 3, size: 170, rotate: -14,
    floatDuration: 7, delay: 4.5, opacity: 0.78,
    mobileHide: true,
  },

  // ── Top-right cluster ─────────────────────────────────────────────────────
  {
    id: 'apple-tr',
    photoId: '1568702846914-96b305d2aaeb',
    label: 'Red apple',
    x: 76, y: -8, size: 260, rotate: 22,
    floatDuration: 12, delay: 0.6, opacity: 0.90,
  },
  {
    id: 'strawberry-tr',
    photoId: '1464965911861-746a04b4bca6',
    label: 'Strawberries',
    x: 90, y: 12, size: 195, rotate: -20,
    floatDuration: 9, delay: 2.8, opacity: 0.85,
    mobileHide: true,
  },

  // ── Left edge (mid) ───────────────────────────────────────────────────────
  {
    id: 'mango-l',
    photoId: '1553279768-865429fa0078',
    label: 'Mango',
    x: -6, y: 44, size: 270, rotate: 15,
    floatDuration: 13, delay: 1.0, opacity: 0.88,
  },
  {
    id: 'pomegranate-l',
    photoId: '1615485290382-441e4d049cb5',
    label: 'Pomegranate cut',
    x: 3, y: 74, size: 230, rotate: -10,
    floatDuration: 10, delay: 5.0, opacity: 0.82,
    cut: true,
    mobileHide: true,
  },

  // ── Right edge (mid) ──────────────────────────────────────────────────────
  {
    id: 'watermelon-r',
    photoId: '1587049016823-69ef9d68bd44',
    label: 'Watermelon slice',
    x: 83, y: 38, size: 340, rotate: -16,
    floatDuration: 14, delay: 0.3, opacity: 0.88,
    cut: true,
  },
  {
    id: 'grapes-r',
    photoId: '1537640538966-79f369143f8f',
    label: 'Grapes',
    x: 88, y: 62, size: 220, rotate: 8,
    floatDuration: 9, delay: 3.5, opacity: 0.80,
    mobileHide: true,
  },

  // ── Center (behind content — smaller & subtler) ───────────────────────────
  {
    id: 'passion-c',
    photoId: '1554241290-d7d0d94ae9b9',
    label: 'Passion fruit cut',
    x: 42, y: 36, size: 155, rotate: 5,
    floatDuration: 8, delay: 2.2, opacity: 0.60,
    cut: true,
    mobileHide: true,
  },
  {
    id: 'dragon-c',
    photoId: '1590165483849-e1e96e37e6c5',
    label: 'Dragon fruit',
    x: 58, y: 54, size: 165, rotate: -12,
    floatDuration: 11, delay: 6.0, opacity: 0.60,
    cut: true,
    mobileHide: true,
  },

  // ── Bottom-left ───────────────────────────────────────────────────────────
  {
    id: 'banana-bl',
    photoId: '1571771894821-ce9b6c11b08e',
    label: 'Bananas',
    x: -2, y: 80, size: 290, rotate: 28,
    floatDuration: 10, delay: 1.7, opacity: 0.88,
  },
  {
    id: 'mixed-berries-bl',
    photoId: '1596591606975-97ee5cef3a1e',
    label: 'Mixed berries',
    x: 16, y: 88, size: 200, rotate: -5,
    floatDuration: 8, delay: 4.0, opacity: 0.82,
    mobileHide: true,
  },

  // ── Bottom-center ─────────────────────────────────────────────────────────
  {
    id: 'pineapple-bc',
    photoId: '1589733955941-5eeaf752f6dd',
    label: 'Pineapple',
    x: 38, y: 82, size: 240, rotate: -8,
    floatDuration: 12, delay: 0.8, opacity: 0.86,
  },

  // ── Bottom-right ──────────────────────────────────────────────────────────
  {
    id: 'mango-cut-br',
    photoId: '1582979512210-5aeef3faef59',
    label: 'Mango sliced',
    x: 70, y: 84, size: 250, rotate: 18,
    floatDuration: 11, delay: 2.5, opacity: 0.85,
    cut: true,
  },
  {
    id: 'apple-green-br',
    photoId: '1567306226416-28f0efdc88ce',
    label: 'Green apple',
    x: 88, y: 80, size: 215, rotate: -24,
    floatDuration: 9, delay: 3.8, opacity: 0.82,
    mobileHide: true,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface FruitImageBackgroundProps {
  isMobile: boolean
}

export default function FruitImageBackground({ isMobile }: FruitImageBackgroundProps) {
  const visibleFruits = isMobile
    ? FRUITS.filter((f) => !f.mobileHide)
    : FRUITS

  return (
    <>
      {/* Keyframe definitions — one generic float pattern, offset per-fruit via delay + duration */}
      <style>{`
        @keyframes fruit-float {
          0%   { transform: translateY(0px)   rotate(var(--fruit-rotate)); }
          33%  { transform: translateY(-16px) rotate(calc(var(--fruit-rotate) + 2deg)); }
          66%  { transform: translateY(-8px)  rotate(calc(var(--fruit-rotate) - 1.5deg)); }
          100% { transform: translateY(0px)   rotate(var(--fruit-rotate)); }
        }
        @keyframes fruit-fadein {
          from { opacity: 0; }
          to   { opacity: var(--fruit-opacity); }
        }
      `}</style>

      {visibleFruits.map((fruit) => {
        const imgSrc =
          `https://images.unsplash.com/photo-${fruit.photoId}` +
          `?w=${Math.round(fruit.size * 2)}&q=85&auto=format&fit=crop`

        const style: CSSProperties = {
          // Layout
          position:      'absolute',
          left:          `${fruit.x}%`,
          top:           `${fruit.y}%`,
          width:         fruit.size,
          height:        fruit.size,
          objectFit:     'cover',

          // Shape — circular for cut fruits
          borderRadius:  fruit.cut ? '50%' : '12%',

          // Blending — makes white/light bg transparent over the warm gradient
          mixBlendMode:  'multiply' as const,

          // Depth
          filter:        `drop-shadow(0 12px 32px rgba(0,0,0,0.18))`,

          // Animation — CSS variables carry per-fruit values into the keyframe
          ['--fruit-rotate' as string]:  `${fruit.rotate}deg`,
          ['--fruit-opacity' as string]: String(fruit.opacity),
          opacity:       0,                           // starts hidden; fadein reveals it
          animation: [
            `fruit-float ${fruit.floatDuration}s ease-in-out ${fruit.delay}s infinite`,
            `fruit-fadein 1.2s ease-out ${fruit.delay + 0.2}s forwards`,
          ].join(', '),

          // Never intercept pointer events
          userSelect:    'none',
          pointerEvents: 'none',
          willChange:    'transform, opacity',
        }

        return (
          <img
            key={fruit.id}
            src={imgSrc}
            alt=""             // decorative — real alt text lives on visible content
            loading="lazy"
            decoding="async"
            style={style}
            // Hide gracefully if photo fails (wrong ID, network issue, etc.)
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        )
      })}
    </>
  )
}
