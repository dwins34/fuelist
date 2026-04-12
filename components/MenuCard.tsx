'use client'

import Image from 'next/image'
import { MenuItem } from '@/types'
import { formatPrice, categoryLabel, getImageUrl } from '@/lib/utils'
import { whatsAppSingleItemUrl } from '@/lib/whatsapp'
import { useCart } from '@/context/CartContext'

interface MenuCardProps {
  item: MenuItem
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function MenuCard({ item }: MenuCardProps) {
  const { items: cartItems, addItem, updateQuantity } = useCart()
  const cartEntry = cartItems.find((ci) => ci.item.id === item.id)
  const qty = cartEntry?.quantity ?? 0
  

  return (
    <div className="group flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image */}
      <div className="relative h-48 w-full bg-green-50 overflow-hidden">
        {item.image_url ? (
          <Image
            src={getImageUrl(item.image_url)}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🥗</div>
        )}

        {/* Unavailable overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700">
              Unavailable
            </span>
          </div>
        )}

        {/* Badges row */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            {categoryLabel(item.category)}
          </span>
          {item.is_bestseller && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-white">
              ⭐ Bestseller
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
          <span className="shrink-0 font-bold text-green-600 text-lg">{formatPrice(item.price)}</span>
        </div>

        {/* Macro pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 font-medium">
            {item.calories} kcal
          </span>
          <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 font-medium">
            P {item.protein}g
          </span>
          <span className="rounded-full bg-purple-50 text-purple-700 px-2.5 py-1 font-medium">
            C {item.carbs}g
          </span>
          <span className="rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 font-medium">
            F {item.fats}g
          </span>
        </div>

        {/* Ingredients */}
        <p className="text-xs text-gray-400 line-clamp-2">
          {item.ingredients.join(', ')}
        </p>

        {/* Actions */}
        {item.is_available && (
          <div className="mt-auto pt-2 flex items-center gap-2">
            {qty === 0 ? (
              <>
                <button
                  onClick={() => addItem(item)}
                  className="flex-1 rounded-full bg-green-500 text-white text-sm font-semibold py-2 hover:bg-green-600 active:scale-95 transition-all"
                >
                  Add to Cart
                </button>
                <a
                  href={whatsAppSingleItemUrl(item.name, item.price)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-full border border-green-500 text-green-600 px-3 py-2 text-xs font-semibold hover:bg-green-50 transition-colors shrink-0"
                >
                  <WhatsAppIcon />
                  Order
                </a>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-1">
                  <button
                    onClick={() => updateQuantity(item.id, qty - 1)}
                    className="h-7 w-7 rounded-full text-green-600 font-bold hover:bg-green-100 flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-green-700">{qty}</span>
                  <button
                    onClick={() => addItem(item)}
                    className="h-7 w-7 rounded-full text-green-600 font-bold hover:bg-green-100 flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="flex-1 text-right text-sm font-bold text-green-600">
                  {formatPrice(item.price * qty)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
