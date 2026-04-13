'use client'

import { useState, useEffect } from 'react'

interface Inquiry {
  id: string
  user_name: string
  user_email: string
  message: string
  status: 'new' | 'in_progress' | 'resolved'
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInquiries() {
      try {
        const res = await fetch('/api/admin/inquiries')
        const data = await res.json()
        if (data.success && data.inquiries) {
          setInquiries(data.inquiries)
        }
      } catch (error) {
        console.error('Failed to fetch inquiries:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchInquiries()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // Optimistic update
      setInquiries(prev => 
        prev.map(inq => inq.id === id ? { ...inq, status: newStatus as any } : inq)
      )

      const res = await fetch(`/api/admin/inquiries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update')
    } catch (error) {
      console.error('Error updating status:', error)
      // On failure, we could revert, but a page refresh will fix it for now
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-gray-500 text-sm mt-1">Manage contact messages from your users.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Loading inquiries...
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No inquiries found.
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs font-medium">
                      {new Date(inquiry.created_at).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{inquiry.user_name}</div>
                      <a href={`mailto:${inquiry.user_email}`} className="text-green-600 hover:underline">
                        {inquiry.user_email}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700 line-clamp-3 max-w-md" title={inquiry.message}>
                        {inquiry.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select 
                        value={inquiry.status || 'new'} 
                        onChange={(e) => handleStatusChange(inquiry.id, e.target.value)}
                        className={`text-xs font-bold rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-offset-1 focus:ring-green-500 cursor-pointer appearance-none ${STATUS_COLORS[inquiry.status || 'new']}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val} className="bg-white text-gray-900 font-medium">
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
