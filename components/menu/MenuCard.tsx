'use client'

/**
 * MenuCard — redesigned to match the Fuelist card design.
 *
 * Structure (top → bottom):
 *  ┌─────────────────────────────┐
 *  │  [food image]               │  ← CardImage
 *  │  ⭐ Bestseller  (overlay)   │
 *  ├─────────────────────────────┤
 *  │  Name             ₹ Price   │  ← title row
 *  │  ingredient · list…         │  ← ingredients
 *  │  220 kcal  5g P  46g C 6g F│  ← macro badges
 *  ├─────────────────────────────┤
 *  │  [Add to cart]  [Subscribe] │  ← action row  (CardFooter)
 *  └─────────────────────────────┘
 *
 * All visual tokens (colours, radius, spacing) live in:
 *   components/ui/card.tsx  →  Card, CardImage, CardContent, CardFooter
 *   components/ui/badge.tsx →  Badge variants
 *   components/ui/Button.tsx→  Button variants
 * Change those files to retheme the entire menu without touching this file.
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import SubscriptionModal, {
  loadPendingSubscription,
  clearPendingSubscription,
  type PendingSubscriptionConfig,
} from '@/components/SubscriptionModal'

// UI primitives — the only place theme tokens live
import { Card, CardImage, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Quantity stepper (inline, shown when item is already in cart) ─────────────

function QuantityStepper({
  qty,
  onDecrement,
  onIncrement,
}: {
  qty: number
  onDecrement: () => void
  onIncrement: () => void
}) {
  return (
    // ← theme token: change stepper background/border in the className below
    <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-1.5 py-0.5">
      <button
        onClick={onDecrement}
        aria-label="Remove one"
        // ← theme token: stepper button colours
        className="h-7 w-7 rounded-full text-green-700 font-bold text-lg leading-none flex items-center justify-center hover:bg-green-100 active:scale-90 transition-all"
      >
        −
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold text-green-800 select-none">
        {qty}
      </span>
      <button
        onClick={onIncrement}
        aria-label="Add one more"
        className="h-7 w-7 rounded-full text-green-700 font-bold text-lg leading-none flex items-center justify-center hover:bg-green-100 active:scale-90 transition-all"
      >
        +
      </button>
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface MenuCardProps {
  item: MenuItem
}

export default function MenuCard({ item }: MenuCardProps) {
  const { items: cartItems, addItem, updateQuantity } = useCart()
  const cartEntry = cartItems.find((ci) => ci.item.id === item.id)
  const qty = cartEntry?.quantity ?? 0

  const [showSubscribe, setShowSubscribe] = useState(false)
  const [restoredConfig, setRestoredConfig] = useState<PendingSubscriptionConfig | null>(null)

  // Check for pending subscription from localStorage (after login redirect)
  useEffect(() => {
    const pending = loadPendingSubscription()
    if (pending && pending.selectedItemIds.includes(item.id)) {
      setRestoredConfig(pending)
      setShowSubscribe(true)
      // Only the first MenuCard that matches will handle it
      clearPendingSubscription()
    }
  }, [item.id])

  return (
    <>
      {showSubscribe && (
        <SubscriptionModal
          initialItem={item}
          restoredConfig={restoredConfig}
          onClose={() => { setShowSubscribe(false); setRestoredConfig(null) }}
        />
      )}

      {/* Card — hover lifts the shadow slightly */}
      <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">

        {/* ── Food image ── */}
        <CardImage>
          {item.image_url ? (
            <Image
              src={getImageUrl(item.image_url)}
              alt={item.name}
              fill
              // Subtle zoom on hover — controlled here, not in the primitive
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl select-none">🥗</div>
          )}

          {/* Unavailable overlay */}
          {!item.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <Badge variant="unavailable" className="text-sm px-4 py-1.5">
                Unavailable
              </Badge>
            </div>
          )}

          {/* Bestseller badge — top-left overlay */}
          {item.is_bestseller && (
            <div className="absolute top-3 left-3">
              <Badge variant="bestseller">
                {/* Star icon */}
                <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
                </svg>
                Bestseller
              </Badge>
            </div>
          )}
        </CardImage>

        {/* ── Content ── */}
        <CardContent className="flex-1">

          {/* Name + price row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 leading-snug text-base">{item.name}</h3>
            <span className="shrink-0 font-bold text-gray-900 text-base">
              {formatPrice(item.price)}
            </span>
          </div>

          {/* Ingredients */}
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-1">
            {item.ingredients.join(', ')}
          </p>

          {/* Macro badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="macro-cal">{item.calories} kcal</Badge>
            <Badge variant="macro-p">{item.protein}g P</Badge>
            <Badge variant="macro-c">{item.carbs}g C</Badge>
            <Badge variant="macro-f">{item.fats}g F</Badge>
          </div>
        </CardContent>

        {/* ── Actions ── */}
        {item.is_available && (
          <CardFooter className="px-4 pb-4 pt-0">
            {qty === 0 ? (
              /* ── Not in cart: show Add + Subscribe ── */
              <>
                <button
                  onClick={() => addItem(item)}
                  // ← theme token: primary action button colour
                  className="flex-1 rounded-full bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 active:scale-95 transition-all"
                >
                  Add to cart
                </button>
                <button
                  onClick={() => setShowSubscribe(true)}
                  // ← theme token: secondary action button colour
                  className="rounded-full border border-green-500 px-4 py-2.5 text-sm font-bold text-green-600 hover:bg-green-50 active:scale-95 transition-all"
                >
                  Subscribe
                </button>
              </>
            ) : (
              /* ── In cart: show stepper + running total ── */
              <>
                <QuantityStepper
                  qty={qty}
                  onDecrement={() => updateQuantity(item.id, qty - 1)}
                  onIncrement={() => addItem(item)}
                />
                <span className="ml-auto text-sm font-bold text-green-600">
                  {formatPrice(item.price * qty)}
                </span>
              </>
            )}
          </CardFooter>
        )}
      </Card>
    </>
  )
}
