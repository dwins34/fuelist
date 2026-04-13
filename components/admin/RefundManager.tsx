'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface RefundSub {
  id: string
  user_name: string
  refund_amount: number
  payment_id: string
  payment_status: string
}

export default function RefundManager({ 
  initialSubs
}: { 
  initialSubs: RefundSub[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleRefund(id: string) {
    if (!confirm('Are you sure you want to initiate this refund via Razorpay?')) return
    
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/refund`, {
        method: 'POST'
      })
      const data = await res.json()
      if (res.ok) {
        alert('Refund initiated successfully!')
        router.refresh()
      } else {
        alert(data.error || 'Refund failed')
      }
    } catch (err) {
      console.error('Refund error:', err)
      alert('Network error')
    } finally {
      setLoading(null)
    }
  }

  if (initialSubs.length === 0) return (
    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed">
      <p className="text-gray-400">No pending refunds.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-6 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Payment ID</th>
            <th className="px-4 py-3 text-right">Refund Amount</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {initialSubs.map((sub) => (
            <tr key={sub.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium">{sub.user_name}</td>
              <td className="px-4 py-4 font-mono text-xs text-gray-400">{sub.payment_id}</td>
              <td className="px-4 py-4 text-right font-bold text-red-600">{formatPrice(sub.refund_amount)}</td>
              <td className="px-4 py-4 text-center">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  sub.payment_status === 'refunded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {sub.payment_status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {sub.payment_status !== 'refunded' && (
                  <button
                    onClick={() => handleRefund(sub.id)}
                    disabled={loading === sub.id}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all"
                  >
                    {loading === sub.id ? 'Processing...' : 'Initiate Refund'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
