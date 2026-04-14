'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import { Icon } from '@/lib/icons'
import SubscriptionModal, {
  loadPendingSubscription,
  clearPendingSubscription,
  type PendingSubscriptionConfig,
} from '@/components/SubscriptionModal'

// UI primitives
import { Card, CardImage, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

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
    <div className="flex items-center gap-1 bg-amber-50 rounded-2xl p-1 border border-amber-100 shadow-sm shadow-amber-100/20">
      <button
        onClick={onDecrement}
        aria-label="Remove one"
        className="h-8 w-8 rounded-xl text-amber-600 font-black text-lg leading-none flex items-center justify-center hover:bg-white hover:text-amber-700 active:scale-90 transition-all"
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-black text-amber-900 select-none">
        {qty}
      </span>
      <button
        onClick={onIncrement}
        aria-label="Add one more"
        className="h-8 w-8 rounded-xl text-amber-600 font-black text-lg leading-none flex items-center justify-center hover:bg-white hover:text-amber-700 active:scale-90 transition-all"
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

  useEffect(() => {
    const pending = loadPendingSubscription()
    if (pending && pending.selectedItemIds.includes(item.id)) {
      setRestoredConfig(pending)
      setShowSubscribe(true)
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

      <Card 
        interactive
        className={cn(
          "group flex flex-col h-full",
          !item.is_available && "opacity-70 grayscale-[0.3]"
        )}
      >
        <CardImage className="bg-stone-50 overflow-hidden h-40">
          {item.image_url ? (
            <Image
              src={getImageUrl(item.image_url)}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-200">
               <Icon name="bowl" size={64} strokeWidth={1} />
            </div>
          )}

          {!item.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px]">
              <Badge variant="default" className="bg-white/90 text-stone-900 border-none px-4 py-1.5 shadow-lg">
                Unavailable
              </Badge>
            </div>
          )}

          {item.is_bestseller && (
            <div className="absolute top-4 left-4">
              <Badge variant="premium" className="shadow-lg backdrop-blur-md bg-amber-100/90 py-1">
                <Icon name="star" size={12} strokeWidth={3} className="mr-1" />
                Bestseller
              </Badge>
            </div>
          )}
          
          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
             <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm border-none shadow-premium py-1 lowercase first-letter:uppercase text-stone-500">
               {item.calories} kcal
             </Badge>
          </div>
        </CardImage>

        <CardContent className="flex-1 gap-2 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-stone-900 tracking-tight leading-tight text-base h-10 line-clamp-2">
              {item.name}
            </h3>
            <span className="shrink-0 font-black text-amber-600 text-base tracking-tighter">
              {formatPrice(item.price)}
            </span>
          </div>

          <p className="text-[11px] font-medium text-stone-400 leading-relaxed line-clamp-2 italic min-h-[1.5rem]">
            {item.ingredients.join(', ')}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="info" className="shadow-none capitalize">
              {item.protein}g protein
            </Badge>
            <Badge variant="success" className="shadow-none capitalize">
              {item.carbs}g carbs
            </Badge>
             <Badge variant="premium" className="shadow-none capitalize">
              {item.fats}g fats
            </Badge>
          </div>
        </CardContent>

        {item.is_available && (
          <CardFooter className="px-4 pb-4 pt-0 gap-2">
            {qty === 0 ? (
              <>
                  <Button
                    onClick={() => addItem(item)}
                    variant="primary"
                    className="flex-[2] !rounded-xl py-2.5"
                  >
                    Add to Cart
                  </Button>
                  <Button
                    onClick={() => setShowSubscribe(true)}
                    variant="outline"
                    className="flex-1 !rounded-xl py-2.5"
                  >
                    Plan
                  </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full pt-1">
                <QuantityStepper
                  qty={qty}
                  onDecrement={() => updateQuantity(item.id, qty - 1)}
                  onIncrement={() => addItem(item)}
                />
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-stone-400 leading-none">Subtotal</span>
                  <span className="text-lg font-black text-amber-600 mt-1">
                    {formatPrice(item.price * qty)}
                  </span>
                </div>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </>
  )
}
