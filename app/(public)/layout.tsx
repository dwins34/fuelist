'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/CartDrawer'
import CartButton from '@/components/CartButton'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAccountPage = pathname.startsWith('/account')

  useEffect(() => {
    if (searchParams.get('cart') === 'open') {
      setCartOpen(true)
    }
  }, [searchParams])

  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen">
          {/* Navbar — fuelist-nav class picks up CSS-variable glass styles */}
          <Navbar />

          <main className="flex-1">{children}</main>

          {!isAccountPage && <Footer />}
        </div>

        {/* Floating cart button */}
        {!isAccountPage && (
          <div className="fixed bottom-6 right-6 z-40">
            <CartButton onClick={() => setCartOpen(true)} />
          </div>
        )}

        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </CartProvider>
    </AuthProvider>
  )
}
