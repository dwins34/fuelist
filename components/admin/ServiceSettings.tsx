'use client'

import { useState, useEffect } from 'react'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function ServiceSettings() {
  const { isEnabled: currentEnabled, message: currentMessage, refreshStatus } = useServiceStatus()
  
  const [enabled, setEnabled] = useState(currentEnabled)
  const [message, setMessage] = useState(currentMessage)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Sync with context if it changes
  useEffect(() => {
    setEnabled(currentEnabled)
    setMessage(currentMessage)
  }, [currentEnabled, currentMessage])

  async function handleSave() {
    setLoading(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message }),
      })
      if (res.ok) {
        setSuccess(true)
        await refreshStatus()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Save settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-stone-900 tracking-tighter">Operational Status</h2>
          <p className="text-xs font-medium text-stone-400">Global kill-switch for all logistics and transaction flows.</p>
        </div>
        
        <button
          onClick={() => setEnabled(!enabled)}
          className={cn(
            "relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 shadow-inner",
            enabled ? 'bg-amber-500 shadow-amber-200' : 'bg-stone-200 shadow-stone-100'
          )}
          role="switch"
          aria-checked={enabled}
        >
          <motion.span
            animate={{ x: enabled ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg shadow-black/5"
          />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 px-1">
            Downtime Communication Protocol
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={enabled}
            placeholder="e.g. Systems undergoing scheduled maintenance. Resuming at 14:00 IST."
            className={cn(
              "w-full rounded-[1.5rem] border px-5 py-4 text-sm font-bold transition-all focus:outline-none focus:ring-4 placeholder:text-stone-300",
              enabled 
                ? 'bg-stone-50 border-stone-50 text-stone-300' 
                : 'bg-white border-stone-200 focus:border-amber-500 focus:ring-amber-50 shadow-inner'
            )}
            rows={3}
          />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 mt-3 px-1">
             Visibility: Active on Global Banner and Checkout Gateway when OFFLINE.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"
              >
                <Icon name="success" size={14} strokeWidth={4} />
                Configuration Synced
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={handleSave}
            disabled={loading || (enabled === currentEnabled && message === currentMessage)}
            className="group flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3 text-sm font-black text-white hover:bg-stone-800 disabled:opacity-30 disabled:grayscale transition-all shadow-md active:scale-95"
          >
            <Icon name={loading ? "preparing" : "security"} size={16} strokeWidth={3} className={cn(loading && "animate-spin")} />
            {loading ? 'SYNCING...' : 'COMMIT CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}
