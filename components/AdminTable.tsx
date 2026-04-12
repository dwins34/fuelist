'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { MenuItem, CreateMenuItemInput, Category } from '@/types'
import { formatPrice, categoryLabel, getImageUrl } from '@/lib/utils'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'

interface AdminTableProps {
  items: MenuItem[]
  onRefresh: () => void
}

const EMPTY_FORM: CreateMenuItemInput = {
  name: '',
  category: 'fruit',
  price: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  ingredients: [],
  image_url: '',
  is_available: true,
  is_bestseller: false,
}

// Pending toggle changes: id → partial overrides
type Drafts = Record<string, { is_available?: boolean; is_bestseller?: boolean }>

export default function AdminTable({ items, onRefresh }: AdminTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<CreateMenuItemInput>(EMPTY_FORM)
  const [ingredientsRaw, setIngredientsRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [saving, setSaving] = useState(false)

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    type: 'success' | 'error'
    message: string
    details?: string[]
  } | null>(null)

  const pendingCount = Object.keys(drafts).length

  // Merge live item with any local draft overrides
  function display(item: MenuItem) {
    return { ...item, ...drafts[item.id] }
  }

  function toggleField(item: MenuItem, field: 'is_available' | 'is_bestseller') {
    const current = display(item)[field]
    const original = item[field]
    const next = !current

    setDrafts((prev) => {
      const entry = { ...prev[item.id], [field]: next }
      // If back to original value on both fields, drop from drafts entirely
      const otherField = field === 'is_available' ? 'is_bestseller' : 'is_available'
      const otherValue = entry[otherField]
      if (next === original && (otherValue === undefined || otherValue === item[otherField])) {
        const { [item.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [item.id]: entry }
    })
  }

  async function handleSaveDrafts() {
    if (!pendingCount) return
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(drafts).map(([id, patch]) =>
          fetch(`/api/menu/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
        )
      )
      setDrafts({})
      onRefresh()
    } catch {
      alert('Failed to save some changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function discardDrafts() {
    setDrafts({})
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so the same file can be re-selected after fixing errors
    e.target.value = ''
    setUploadResult(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/menu/bulk', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setUploadResult({
          type: 'error',
          message: json.error ?? 'Upload failed.',
          details: json.details,
        })
      } else {
        setUploadResult({
          type: 'success',
          message: `Successfully added ${json.inserted} item${json.inserted !== 1 ? 's' : ''}.`,
        })
        onRefresh()
      }
    } catch {
      setUploadResult({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setIngredientsRaw('')
    setModalOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      ingredients: item.ingredients,
      image_url: item.image_url,
      is_available: item.is_available,
      is_bestseller: item.is_bestseller,
    })
    setIngredientsRaw(item.ingredients.join(', '))
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      ingredients: ingredientsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    }

    try {
      if (editItem) {
        const res = await fetch(`/api/menu/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update')
      } else {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create')
      }
      setModalOpen(false)
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    setDeleteId(id)
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Menu Items ({items.length})</h2>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <>
              <button
                onClick={discardDrafts}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Discard
              </button>
              <Button onClick={handleSaveDrafts} size="sm" loading={saving}>
                Save changes ({pendingCount})
              </Button>
            </>
          )}
          {/* Bulk upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleBulkUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Bulk upload from .xlsx"
          >
            {uploading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {uploading ? 'Uploading…' : 'Bulk upload'}
          </button>
          <a
            href="/api/menu/sample"
            download
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title="Download sample .xlsx template"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Sample file
          </a>
          <Button onClick={openCreate} size="sm" variant={pendingCount > 0 ? 'secondary' : undefined}>
            + Add Item
          </Button>
        </div>
      </div>

      {/* Upload result banner */}
      {uploadResult && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
          uploadResult.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">{uploadResult.type === 'success' ? '✓' : '✕'}</span>
            <div>
              <p className="font-medium">{uploadResult.message}</p>
              {uploadResult.details && uploadResult.details.length > 0 && (
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs opacity-80">
                  {uploadResult.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          </div>
          <button onClick={() => setUploadResult(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Unsaved changes banner */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>
            You have <strong>{pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}</strong>. Click <strong>Save changes</strong> to apply them.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Price</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Calories</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Available</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Bestseller</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const d = display(item)
              const isDirty = !!drafts[item.id]
              return (
              <tr key={item.id} className={`bg-white hover:bg-gray-50 transition-colors ${isDirty ? 'ring-1 ring-inset ring-amber-200' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-green-50 shrink-0">
                      {item.image_url ? (
                        <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg">🥗</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{categoryLabel(item.category)}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{formatPrice(item.price)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{item.calories}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleField(item, 'is_available')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      d.is_available ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        d.is_available ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleField(item, 'is_bestseller')}
                    className={`text-lg transition-transform hover:scale-110 ${d.is_bestseller ? 'opacity-100' : 'opacity-30'}`}
                    title={d.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
                  >
                    ⭐
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={deleteId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            )})}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No menu items yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none"
            >
              <option value="fruit">Fruit Bowls</option>
              <option value="breakfast">Breakfast Bowls</option>
              <option value="power">Power Bowls</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (₹)"
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Calories (kcal)"
              type="number"
              min={0}
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Protein (g)"
              type="number"
              min={0}
              step={0.1}
              value={form.protein}
              onChange={(e) => setForm({ ...form, protein: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Carbs (g)"
              type="number"
              min={0}
              step={0.1}
              value={form.carbs}
              onChange={(e) => setForm({ ...form, carbs: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Fats (g)"
              type="number"
              min={0}
              step={0.1}
              value={form.fats}
              onChange={(e) => setForm({ ...form, fats: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <Input
            label="Ingredients (comma-separated)"
            value={ingredientsRaw}
            onChange={(e) => setIngredientsRaw(e.target.value)}
            placeholder="Mango, Banana, Granola, Honey…"
          />

          <Input
            label="Image URL"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://images.unsplash.com/…"
          />

          <div className="flex items-center gap-3">
            <input
              id="available"
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <label htmlFor="available" className="text-sm font-medium text-gray-700">
              Available for ordering
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="bestseller"
              type="checkbox"
              checked={form.is_bestseller}
              onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="bestseller" className="text-sm font-medium text-gray-700">
              ⭐ Mark as Bestseller
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
