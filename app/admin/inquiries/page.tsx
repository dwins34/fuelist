'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Inquiry {
  id: string
  user_name: string
  user_email: string
  message: string
  status: 'new' | 'in_progress' | 'resolved'
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'premium' | 'secondary' | 'default'; icon: string }> = {
  new: { label: 'NEW ENTRY', variant: 'premium', icon: 'star' },
  in_progress: { label: 'ACTIVE', variant: 'secondary', icon: 'time' },
  resolved: { label: 'ARCHIVED', variant: 'default', icon: 'success' },
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
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-2 border-b border-stone-100">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Communications</h1>
          <p className="text-xs font-black uppercase tracking-widest text-stone-300 mt-2">Internal Message Stream & Resolution</p>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 rounded-2xl border border-stone-100 shadow-inner">
           <Icon name="mail" size={16} className="text-amber-500" />
           <span className="text-xs font-black uppercase tracking-widest text-stone-900">{inquiries.length} LOGGED MESSAGES</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-900 text-white font-black text-xs uppercase tracking-widest">
                <th className="px-8 py-6">TIMESTAMP</th>
                <th className="px-8 py-6">NAME / EMAIL</th>
                <th className="px-8 py-6">MESSAGE</th>
                <th className="px-8 py-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <div className="h-10 w-10 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                       <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-30">
                       <Icon name="mail" size={64} strokeWidth={1} />
                       <span className="text-xs font-black uppercase tracking-widest">No communication logs recorded</span>
                    </div>
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry, idx) => (
                  <motion.tr 
                    key={inquiry.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-stone-50/50 transition-colors group"
                  >
                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-stone-900 tracking-tight">
                          {new Date(inquiry.created_at).toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric' 
                          })}
                        </span>
                        <span className="text-xs font-black text-stone-300 uppercase tracking-widest mt-1">
                          {new Date(inquiry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="space-y-1">
                        <div className="text-sm font-black text-stone-900 tracking-tight">{inquiry.user_name}</div>
                        <a 
                          href={`mailto:${inquiry.user_email}`} 
                          className="text-xs font-black text-amber-500 hover:text-amber-600 transition-colors uppercase tracking-widest truncate block max-w-[180px]"
                        >
                          {inquiry.user_email}
                        </a>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="relative group/msg max-w-lg">
                        <p className="text-sm font-medium text-stone-500 leading-relaxed line-clamp-2 italic">
                          "{inquiry.message}"
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-8 whitespace-nowrap text-right">
                      <div className="relative inline-flex items-center gap-4">
                        <select 
                          value={inquiry.status || 'new'} 
                          onChange={(e) => handleStatusChange(inquiry.id, e.target.value)}
                          className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          )}
                        >
                          {Object.keys(STATUS_CONFIG).map((val) => (
                            <option key={val} value={val}>{STATUS_CONFIG[val].label}</option>
                          ))}
                        </select>
                        
                        <Badge 
                          variant={STATUS_CONFIG[inquiry.status || 'new'].variant}
                          className="px-5 py-2 !rounded-full text-[10px] font-black tracking-widest shadow-sm flex items-center gap-2 group-hover:scale-105 transition-transform"
                        >
                          <Icon name={STATUS_CONFIG[inquiry.status || 'new'].icon as any} size={10} strokeWidth={3} />
                          {STATUS_CONFIG[inquiry.status || 'new'].label}
                        </Badge>
                        <Icon name="chevronDown" size={14} className="text-stone-300" />
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
