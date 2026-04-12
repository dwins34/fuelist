'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl, categoryLabel } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

type DeliverySlot = 'morning' | 'afternoon' | 'evening'
type Frequency    = 'daily' | 'weekdays' | 'weekends'
type Step         = 'items' | 'schedule' | 'confirm' | 'success'

interface SubscriptionModalProps {
  /** Pre-selected item (from MenuCard). If omitted, user starts with empty selection. */
  initialItem?: MenuItem
  onClose: () => void
  onSuccess?: () => void
}

// ── Config ───────────────────────────────────────────────────────────────────

const SLOTS: { value: DeliverySlot; label: string; time: string; icon: string }[] = [
  { value: 'morning',   label: 'Morning',   time: '8 – 10 AM', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', time: '12 – 2 PM', icon: '☀️' },
  { value: 'evening',   label: 'Evening',   time: '6 – 8 PM',  icon: '🌆' },
]

const FREQS: { value: Frequency; label: string; desc: string }[] = [
  { value: 'daily',    label: 'Every day', desc: '7 days/week' },
  { value: 'weekdays', label: 'Weekdays',  desc: 'Mon – Fri'   },
  { value: 'weekends', label: 'Weekends',  desc: 'Sat & Sun'   },
]

const DURATIONS: { value: number; label: string; badge: string }[] = [
  { value: 7,  label: '7 days',  badge: ''        },
  { value: 14, label: '14 days', badge: '5% off'  },
  { value: 30, label: '30 days', badge: '10% off' },
]

const DISCOUNT: Record<number, number> = { 7: 0, 14: 0.05, 30: 0.10 }

// ── Helpers ──────────────────────────────────────────────────────────────────

function deliveriesCount(freq: Frequency, duration: number) {
  const perWeek = freq === 'daily' ? 7 : freq === 'weekdays' ? 5 : 2
  return Math.round((perWeek * duration) / 7)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubscriptionModal({ initialItem, onClose, onSuccess }: SubscriptionModalProps) {
  const { profile } = useAuthContext()
  const router = useRouter()

  // ── Schedule state ────────────────────────────────────────────────────────
  const [slot,     setSlot]     = useState<DeliverySlot>('morning')
  const [freq,     setFreq]     = useState<Frequency>('daily')
  const [duration, setDuration] = useState<number>(7)

  // ── Item picker state ─────────────────────────────────────────────────────
  const [allItems,  setAllItems]  = useState<MenuItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [selected, setSelected]  = useState<Set<string>>(
    initialItem ? new Set([initialItem.id]) : new Set()
  )
  const [search, setSearch] = useState('')

  // ── Flow state ────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<Step>('items')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch all available menu items ────────────────────────────────────────
  useEffect(() => {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    fetch(`${sbUrl}/rest/v1/menu_items?is_available=eq.true&order=category.asc,name.asc`, {
      headers: { apikey: sbKey, 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((rows: MenuItem[]) => setAllItems(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setItemsLoading(false))
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedItems  = allItems.filter((i) => selected.has(i.id))
  const filteredItems  = allItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  const deliveries     = deliveriesCount(freq, duration)
  const discountRate   = DISCOUNT[duration]
  const baseTotal      = selectedItems.reduce((s, i) => s + i.price, 0) * deliveries
  const discountAmt    = Math.floor(baseTotal * discountRate)
  const finalTotal     = baseTotal - discountAmt

  const slotLabel     = SLOTS.find((s) => s.value === slot)!
  const freqLabel     = FREQS.find((f) => f.value === freq)!
  const durationLabel = DURATIONS.find((d) => d.value === duration)!

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    if (!profile) { router.push('/login'); return }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/subscriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          menu_item_ids: Array.from(selected),
          delivery_slot: slot,
          frequency:     freq,
          duration_days: duration,
          address: profile.address_line1 ? {
            name:          profile.name,
            phone:         profile.phone,
            address_line1: profile.address_line1,
            city:          profile.city,
            pincode:       profile.pincode,
          } : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to subscribe'); return }
      setStep('success')
      onSuccess?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step header labels ────────────────────────────────────────────────────
  const STEPS: Step[] = ['items', 'schedule', 'confirm']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">
              {step === 'items'    ? 'Choose items'       :
               step === 'schedule' ? 'Set your schedule'  :
               step === 'confirm'  ? 'Confirm subscription' :
                                     'Subscribed!'}
            </h2>
            {step !== 'success' && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.size === 0 ? 'Select items below' :
                 `${selected.size} item${selected.size !== 1 ? 's' : ''} selected`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            {step !== 'success' && (
              <div className="flex gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${
                    i <= stepIdx ? 'w-4 bg-green-500' : 'w-1.5 bg-gray-200'
                  }`} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ═══ STEP 1: Item picker ═══ */}
          {step === 'items' && (
            <div className="px-5 py-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Selected chips */}
              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItems.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2.5 py-1 text-xs font-medium text-green-800"
                    >
                      {item.name}
                      <button onClick={() => toggleItem(item.id)} className="ml-0.5 text-green-500 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Item list */}
              {itemsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const isSelected = selected.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-green-50">
                          {item.image_url ? (
                            <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xl">🥗</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            {categoryLabel(item.category)} · {formatPrice(item.price)}/delivery
                          </p>
                        </div>
                        {/* Checkbox */}
                        <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {filteredItems.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No items found.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Schedule ═══ */}
          {step === 'schedule' && (
            <div className="px-5 py-5 space-y-5">
              {/* Delivery slot */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Delivery time</p>
                <div className="grid grid-cols-3 gap-2">
                  {SLOTS.map((s) => (
                    <button key={s.value} onClick={() => setSlot(s.value)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        slot === s.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{s.icon}</div>
                      <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                      <p className="text-[10px] text-gray-400">{s.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Frequency</p>
                <div className="space-y-2">
                  {FREQS.map((f) => (
                    <button key={f.value} onClick={() => setFreq(f.value)}
                      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all ${
                        freq === f.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800 text-left">{f.label}</p>
                        <p className="text-xs text-gray-400">{f.desc}</p>
                      </div>
                      {freq === f.value && (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Duration</p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        duration === d.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-800">{d.label}</p>
                      <p className={`text-[10px] mt-0.5 ${d.badge ? 'font-semibold text-green-600' : 'text-gray-400'}`}>
                        {d.badge || 'standard'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price preview */}
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 space-y-1">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate max-w-[200px]">{item.name} ×{deliveries}</span>
                    <span>{formatPrice(item.price * deliveries)}</span>
                  </div>
                ))}
                {discountAmt > 0 && (
                  <div className="flex items-center justify-between text-xs text-green-600 border-t border-green-200 pt-1 mt-1">
                    <span>Duration discount</span>
                    <span>−{formatPrice(discountAmt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-green-200 pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Confirm ═══ */}
          {step === 'confirm' && (
            <div className="px-5 py-5 space-y-4">
              {/* Items */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Items ({selectedItems.length})</p>
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-white">
                        {item.image_url ? (
                          <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-lg">🥗</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatPrice(item.price)}/delivery</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule summary */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                {[
                  { label: 'Delivery time', value: `${slotLabel.icon} ${slotLabel.label} (${slotLabel.time})` },
                  { label: 'Frequency',     value: `${freqLabel.label} — ${freqLabel.desc}` },
                  { label: 'Duration',      value: `${durationLabel.label} · ${deliveries} deliveries` },
                  { label: 'Total amount',  value: formatPrice(finalTotal) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {!profile?.address_line1 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                  <span className="font-semibold">No saved address.</span>{' '}
                  We&apos;ll contact you to confirm.{' '}
                  <a href="/account" className="underline">Add one in Account settings.</a>
                </div>
              )}

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </div>
          )}

          {/* ═══ STEP 4: Success ═══ */}
          {step === 'success' && (
            <div className="px-5 py-8 text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">All subscriptions created!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} will be delivered{' '}
                  {freqLabel.desc.toLowerCase()} at {slotLabel.time} for {durationLabel.label}.
                </p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                Manage your subscriptions in{' '}
                <a href="/account" className="font-semibold underline">Account settings</a>.
              </div>
              <button onClick={onClose}
                className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Footer CTA ── */}
        {step === 'items' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
            <button
              onClick={() => setStep('schedule')}
              disabled={selected.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected.size === 0 ? 'Select at least 1 item' : `Continue with ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
              {selected.size > 0 && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        )}

        {step === 'schedule' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
            <button onClick={() => setStep('confirm')}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100">
              Review & confirm
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => setStep('items')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100 disabled:opacity-60"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : `Subscribe — ${formatPrice(finalTotal)}`}
            </button>
            <button onClick={() => setStep('schedule')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
