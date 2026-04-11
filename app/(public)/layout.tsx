'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import CartDrawer from '@/components/CartDrawer'
import CartButton from '@/components/CartButton'
import { CartProvider } from '@/context/CartContext'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Fuelist — Fuel your body, love your food.
        </footer>
      </div>

      {/* Floating cart button */}
      <div className="fixed bottom-6 right-6 z-40">
        <CartButton onClick={() => setCartOpen(true)} />
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </CartProvider>
  )
}
