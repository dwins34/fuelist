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

// ── Local storage helpers ──────────────────────────────────────────────────

function saveLocal(cartItems: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems)) } catch {}
}

function loadLocal(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/**
 * Returns true only when the key has NEVER been written.
 * An empty array `[]` written by clearCart() counts as "explicitly cleared"
 * and should NOT trigger a DB fallback — that would re-populate a cart the
 * user just cleared.
 */
function isLocalCartAbsent(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === null } catch { return true }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // ── Initialize items from localStorage immediately — no flash of empty cart ──
  const [items, setItems] = useState<CartItem[]>(() => loadLocal())
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

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

  async function syncToDB(uid: string, cartItems: CartItem[]) {
    if (cartItems.length === 0) {
      await supabase.from('carts').delete().eq('user_id', uid)
      return
    }

    const rows = cartItems.map((ci) => ({
      user_id: uid,
      item_id: ci.item.id,
      quantity: ci.quantity,
      updated_at: new Date().toISOString(),
    }))

    await supabase.from('carts').upsert(rows, { onConflict: 'user_id,item_id' })

    const currentIds = cartItems.map((ci) => ci.item.id)
    await supabase
      .from('carts')
      .delete()
      .eq('user_id', uid)
      .not('item_id', 'in', `(${currentIds.join(',')})`)
  }

  // ── Debounced DB sync ──────────────────────────────────────────────────────

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleSyncToDB(uid: string, cartItems: CartItem[]) {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => syncToDB(uid, cartItems), 800)
  }

  // ── Auth state ─────────────────────────────────────────────────────────────
  // authReady: true once we've processed the initial session, so the sync
  // effect below knows it's safe to write back to DB/localStorage.
  const authReady = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const uid = session?.user?.id ?? null

          if (event === 'SIGNED_OUT' || !uid) {
            authReady.current = true
            setUserId(null)
            setItems([])
            saveLocal([])
            return
          }

          if (event === 'SIGNED_IN') {
            // Fresh login — load cart from DB (source of truth after login)
            const dbCart = await loadFromDB(uid)
            authReady.current = true
            setUserId(uid)
            setItems(dbCart)
            saveLocal(dbCart)
            return
          }

          if (event === 'INITIAL_SESSION') {
            // Page reload — items are already loaded from localStorage by useState.
            // Only fall back to DB when the key has NEVER been written.
            // If the key exists but holds [] (i.e. clearCart() ran), we must NOT
            // overwrite it with stale DB data — the async DB delete may not have
            // completed before the page refreshed.
            setUserId(uid)
            if (isLocalCartAbsent()) {
              const dbCart = await loadFromDB(uid)
              setItems(dbCart)
              saveLocal(dbCart)
            }
            // Mark ready AFTER loading so the sync effect doesn't fire early
            authReady.current = true
            return
          }

          // TOKEN_REFRESHED or other events — just update userId
          setUserId(uid)
        } catch {
          authReady.current = true
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync to localStorage + DB whenever items change ────────────────────────
  // authReady guards against writing during initial load (would wipe the cart)

  useEffect(() => {
    if (!authReady.current) return
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
