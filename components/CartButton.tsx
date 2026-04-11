'use client'

import { useCart } from '@/context/CartContext'

interface CartButtonProps {
  onClick: () => void
}

export default function CartButton({ onClick }: CartButtonProps) {
  const { count, total } = useCart()

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white font-semibold text-sm hover:bg-green-600 active:scale-95 transition-all shadow-md shadow-green-200"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 ? (
        <>
          <span>{count} item{count !== 1 ? 's' : ''}</span>
          <span className="font-bold">₹{total.toFixed(0)}</span>
        </>
      ) : (
        <span>Cart</span>
      )}
    </button>
  )
}
