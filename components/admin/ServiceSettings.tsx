'use client'

import { useState, useEffect } from 'react'
import { useServiceStatus } from '@/context/ServiceStatusContext'

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
      } else {
        alert('Failed to update service status')
      }
    } catch (err) {
      console.error('Save settings error:', err)
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Service Status</h2>
          <p className="text-sm text-gray-500 mt-0.5">Global toggle for all ordering and subscriptions.</p>
        </div>
        
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-green-500' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Public Status Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={enabled}
            placeholder="e.g. Back in 1 hour..."
            className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
              enabled 
                ? 'bg-gray-50 border-gray-100 text-gray-400' 
                : 'bg-white border-gray-200 focus:border-green-500 focus:ring-green-100'
            }`}
            rows={2}
          />
          <p className="text-[10px] text-gray-400 mt-1.5">
            This message appears on the home banner and at checkout when the service is OFF.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {success && (
              <span className="text-xs text-green-600 font-medium animate-in fade-in slide-in-from-left duration-300">
                ✓ Settings saved successfully
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={loading || (enabled === currentEnabled && message === currentMessage)}
            className="rounded-full bg-gray-900 px-6 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
