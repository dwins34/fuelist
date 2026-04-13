'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/CartDrawer'
import CartButton from '@/components/CartButton'
// import ThemeSwitcher from '@/components/ui/ThemeSwitcher'  // re-enable when themes are active
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen">
          {/* Navbar — fuelist-nav class picks up CSS-variable glass styles */}
          <Navbar />

          <main className="flex-1">{children}</main>

          <Footer />
        </div>

        {/* Floating cart button */}
        <div className="fixed bottom-6 right-6 z-40">
          <CartButton onClick={() => setCartOpen(true)} />
        </div>

        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </CartProvider>
    </AuthProvider>
  )
}
