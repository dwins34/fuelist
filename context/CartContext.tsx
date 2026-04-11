'use client'

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, useMemo, ReactNode,
} from 'react'
import { CartItem, MenuItem } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  addItem: (item: MenuItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'fuelist_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function saveLocal(cartItems: CartItem[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems)) } catch {}
  }

  function loadLocal(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  // ── DB sync ────────────────────────────────────────────────────────────────

  async function loadFromDB(uid: string): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from('carts')
      .select('quantity, menu_items(*)')
      .eq('user_id', uid)

    if (error || !data) return []

    return data
      .filter((row) => row.menu_items)
      .map((row) => ({
        item: row.menu_items as unknown as MenuItem,
        quantity: row.quantity,
      }))
  }

  // Full replace: upsert current items + delete removed ones
  async function syncToDB(uid: string, cartItems: CartItem[]) {
    if (cartItems.length === 0) {
      // Delete entire cart
      await supabase.from('carts').delete().eq('user_id', uid)
      return
    }

    const rows = cartItems.map((ci) => ({
      user_id: uid,
      item_id: ci.item.id,
      quantity: ci.quantity,
      updated_at: new Date().toISOString(),
    }))

    // Upsert all current items
    await supabase.from('carts').upsert(rows, { onConflict: 'user_id,item_id' })

    // Delete rows no longer in cart
    const currentIds = cartItems.map((ci) => ci.item.id)
    await supabase
      .from('carts')
      .delete()
      .eq('user_id', uid)
      .not('item_id', 'in', `(${currentIds.join(',')})`)
  }

  // ── Debounced sync ref ─────────────────────────────────────────────────────

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleSyncToDB(uid: string, cartItems: CartItem[]) {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => syncToDB(uid, cartItems), 800)
  }

  // ── Auth state — load/clear cart on login/logout ───────────────────────────

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const uid = session?.user?.id ?? null
          setUserId(uid)

          if (event === 'SIGNED_OUT' || !uid) {
            // Logout — clear local cart immediately (DB cart preserved for next login)
            setItems([])
            saveLocal([])
            return
          }

          if (event === 'SIGNED_IN') {
            // Fresh login — restore cart from DB
            const dbCart = await loadFromDB(uid)
            setItems(dbCart)
            saveLocal(dbCart)
            return
          }

          if (event === 'INITIAL_SESSION') {
            // Page reload while logged in — use localStorage (fast, already in sync)
            const local = loadLocal()
            if (local.length > 0) {
              setItems(local)
            } else {
              // localStorage empty (e.g. cleared by browser) — fall back to DB
              const dbCart = await loadFromDB(uid)
              setItems(dbCart)
              saveLocal(dbCart)
            }
          }
        } catch {
          // Cart errors must never affect the rest of the app
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync to localStorage + DB whenever items change ────────────────────────

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    saveLocal(items)
    if (userId) scheduleSyncToDB(userId, items)
  }, [items, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cart mutations ─────────────────────────────────────────────────────────

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id)
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.item.id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((ci) => ci.item.id !== itemId))
    } else {
      setItems((prev) =>
        prev.map((ci) => (ci.item.id === itemId ? { ...ci, quantity } : ci))
      )
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    saveLocal([])
    if (userId) syncToDB(userId, [])
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const count = items.reduce((s, ci) => s + ci.quantity, 0)
  const total = items.reduce((s, ci) => s + ci.item.price * ci.quantity, 0)

  return (
    <CartContext.Provider value={{ items, count, total, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
