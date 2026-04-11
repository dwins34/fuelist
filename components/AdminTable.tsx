'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MenuItem, CreateMenuItemInput, Category } from '@/types'
import { formatPrice, categoryLabel } from '@/lib/utils'
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

export default function AdminTable({ items, onRefresh }: AdminTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<CreateMenuItemInput>(EMPTY_FORM)
  const [ingredientsRaw, setIngredientsRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  async function handleToggle(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    })
    onRefresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Menu Items ({items.length})</h2>
        <Button onClick={openCreate} size="sm">
          + Add Item
        </Button>
      </div>

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
            {items.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-green-50 shrink-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg">🥗</span>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{categoryLabel(item.category)}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{formatPrice(item.price)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{item.calories}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(item)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.is_available ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        item.is_available ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={async () => {
                      await fetch(`/api/menu/${item.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_bestseller: !item.is_bestseller }),
                      })
                      onRefresh()
                    }}
                    className={`text-lg transition-transform hover:scale-110 ${item.is_bestseller ? 'opacity-100' : 'opacity-30'}`}
                    title={item.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
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
            ))}
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
