'use client'

import { useEffect, useState, useCallback } from 'react'
import { MenuItem } from '@/types'
import AdminTable from '@/components/AdminTable'

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <p className="text-gray-500 text-sm mt-1">Add, edit, or remove items from your menu.</p>
      </div>
      <AdminTable items={items} onRefresh={loadItems} />
    </div>
  )
}
