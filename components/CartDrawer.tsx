'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import { whatsAppOrderUrl } from '@/lib/whatsapp'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, count, total, updateQuantity, removeItem, clearCart } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleWhatsAppOrder() {
    if (items.length === 0) return
    const url = whatsAppOrderUrl(items, total)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
            {count > 0 && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close cart"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="text-6xl">🥗</div>
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add some bowls to get started!</p>
            </div>
          ) : (
            items.map(({ item, quantity }) => (
              <div key={item.id} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                {/* Image */}
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-green-50">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🥗</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.calories} kcal · P {item.protein}g</p>

                  <div className="flex items-center justify-between mt-auto">
                    {/* Qty controls */}
                    <div className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-1">
                      <button
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        className="h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm font-bold text-gray-700">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, quantity + 1)}
                        className="h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-green-600 text-sm">
                      {formatPrice(item.price * quantity)}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="self-start rounded-full p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  aria-label={`Remove ${item.name}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{count} item{count !== 1 ? 's' : ''}</span>
              <span className="font-bold text-gray-900 text-base">{formatPrice(total)}</span>
            </div>

            {/* WhatsApp CTA */}
            <button
              onClick={handleWhatsAppOrder}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-white font-bold text-base hover:bg-[#20b858] active:scale-95 transition-all shadow-md shadow-green-200"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Order via WhatsApp
            </button>

            <p className="text-center text-xs text-gray-400">
              Opens WhatsApp with your order pre-filled
            </p>
          </div>
        )}
      </div>
    </>
  )
}
