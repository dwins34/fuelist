'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem, CreateMenuItemInput, Category } from '@/types'
import { formatPrice, categoryLabel, getImageUrl } from '@/lib/utils'
import { Icon, IconName } from '@/lib/icons'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    type: 'success' | 'error'
    message: string
    details?: string[]
  } | null>(null)

  const pendingCount = Object.keys(drafts).length

  function display(item: MenuItem) {
    return { ...item, ...drafts[item.id] }
  }

  function toggleField(item: MenuItem, field: 'is_available' | 'is_bestseller') {
    const current = display(item)[field]
    const original = item[field]
    const next = !current

    setDrafts((prev) => {
      const entry = { ...prev[item.id], [field]: next }
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
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-2 border-b border-stone-100">
        <div>
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-900 shadow-inner">
               <Icon name="bowl" size={24} />
             </div>
             <h2 className="text-2xl font-black text-stone-900 tracking-tighter">Kitchen Inventory</h2>
           </div>
           <p className="text-xs font-black uppercase tracking-widest text-stone-300 mt-2 ml-[52px]">
             {items.length} Active Menu Items
           </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={discardDrafts}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                >
                  Discard
                </button>
                <Button onClick={handleSaveDrafts} loading={saving} className="shadow-premium !rounded-2xl">
                  Sync Changes ({pendingCount})
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleBulkUpload} />
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group flex items-center gap-2 rounded-2xl border-2 border-stone-50 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-stone-500 hover:border-amber-200 hover:text-amber-600 transition-all disabled:opacity-50"
              title="Bulk upload from .xlsx"
            >
              {uploading ? <Icon name="spinner" className="animate-spin" size={14} /> : <Icon name="upload" size={14} strokeWidth={3} />}
              {uploading ? 'Processing' : 'Bulk Upload'}
            </button>
            <a
              href="/api/menu/sample"
              download
              className="flex items-center gap-2 rounded-2xl border-2 border-stone-50 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-stone-500 hover:border-stone-200 hover:text-stone-900 transition-all"
              title="Download template"
            >
              <Icon name="download" size={14} strokeWidth={3} />
              Template
            </a>
          </div>
          
          {!pendingCount && (
            <Button onClick={openCreate} className="!rounded-2xl py-3 shadow-premium">
              <Icon name="plus" size={16} strokeWidth={4} className="mr-2" />
              Add Bowl
            </Button>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      <AnimatePresence mode="popLayout">
        {uploadResult && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "flex items-start justify-between gap-4 rounded-3xl border-2 p-5 shadow-sm",
              uploadResult.type === 'success' ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-800"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn("mt-0.5 rounded-full p-1", uploadResult.type === 'success' ? "bg-emerald-100" : "bg-rose-100")}>
                <Icon name={uploadResult.type === 'success' ? 'success' : 'error'} size={14} strokeWidth={3} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black capitalize tracking-tight">{uploadResult.message}</p>
                {uploadResult.details && uploadResult.details.length > 0 && (
                  <ul className="space-y-0.5 list-disc list-inside text-[10px] font-bold opacity-70">
                    {uploadResult.details.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => setUploadResult(null)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
              <Icon name="close" size={16} strokeWidth={3} />
            </button>
          </motion.div>
        )}

        {pendingCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-3xl border-2 border-amber-100 bg-amber-50 p-5 shadow-sm"
          >
             <div className="rounded-full bg-amber-100 p-1.5 text-amber-600">
               <Icon name="warning" size={16} strokeWidth={3} />
             </div>
             <p className="text-sm font-black text-amber-900 tracking-tight capitalize">
                Synchronize requested: {pendingCount} Pending Change{pendingCount !== 1 ? 's' : ''}
             </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      <div className="rounded-[2.5rem] bg-white border border-stone-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-8 py-5 text-left text-xs font-black uppercase tracking-widest text-stone-400">Inventory Item</th>
                <th className="px-8 py-5 text-left text-xs font-black uppercase tracking-widest text-stone-400">Class</th>
                <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-stone-400">Revenue (₹)</th>
                <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-stone-400">Calories</th>
                <th className="px-8 py-5 text-center text-xs font-black uppercase tracking-widest text-stone-400">Live Status</th>
                <th className="px-8 py-5 text-center text-xs font-black uppercase tracking-widest text-stone-400">Premium</th>
                <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-stone-400">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map((item) => {
                const d = display(item)
                const isDirty = !!drafts[item.id]
                return (
                  <motion.tr 
                    layout
                    key={item.id} 
                    className={cn(
                      "group transition-all duration-300",
                      isDirty ? "bg-amber-50/30" : "hover:bg-stone-50/30"
                    )}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-100 shrink-0 group-hover:scale-110 transition-transform">
                          {item.image_url ? (
                            <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-200"><Icon name="bowl" size={24} /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-stone-900 tracking-tight capitalize truncate max-w-[140px]">{item.name}</p>
                          {isDirty && (
                            <div className="flex items-center gap-1.5 mt-1">
                               <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Sync</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <Badge variant="secondary" className="bg-stone-100 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                        {categoryLabel(item.category)}
                      </Badge>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <span className="text-base font-black text-stone-900 tracking-tighter">{formatPrice(item.price)}</span>
                    </td>
                     <td className="px-8 py-4 text-right">
                        <span className="text-xs font-bold text-stone-700 capitalize tracking-widest">{item.calories} kCal</span>
                     </td>
                    <td className="px-8 py-4 text-center">
                      <button
                        onClick={() => toggleField(item, 'is_available')}
                        className={cn(
                          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1.5 transition-all duration-300",
                          d.is_available ? "bg-amber-500" : "bg-stone-100"
                        )}
                      >
                        <motion.span
                          layout
                          className="h-5 w-5 rounded-full bg-white shadow-sm"
                          animate={{ x: d.is_available ? 24 : 0 }}
                        />
                      </button>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <button
                        onClick={() => toggleField(item, 'is_bestseller')}
                        className={cn(
                           "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-300 mx-auto",
                           d.is_bestseller ? "bg-amber-100 text-amber-600 shadow-inner" : "text-stone-200 hover:bg-stone-100"
                        )}
                        title={d.is_bestseller ? 'Remove Bestseller' : 'Mark Bestseller'}
                      >
                        <Icon name="star" size={20} strokeWidth={d.is_bestseller ? 3 : 2} />
                      </button>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="!rounded-xl p-2.5">
                          <Icon name="edit" size={16} strokeWidth={2.5} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deleteId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="!rounded-xl p-2.5"
                        >
                          <Icon name="delete" size={16} strokeWidth={2.5} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                )})}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="mx-auto w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-100 mb-4 opacity-50">
                       <Icon name="bowl" size={32} />
                    </div>
                    <p className="text-xs font-black capitalize tracking-widest text-stone-300">Warehouse Empty. Add some fuel.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Configure Item' : 'New Intake'}
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-1">
          <Input
            label="Name"
            placeholder="e.g., Power Balancer Bowl"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="!rounded-2xl"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-stone-400 ml-1">Meal Classification</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="w-full rounded-2xl border-2 border-stone-50 bg-stone-50/50 px-5 py-4 text-sm font-black text-stone-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner"
            >
              <option value="fruit">Fruit Bowls</option>
              <option value="breakfast">Breakfast Bowls</option>
              <option value="power">Power Bowls</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Revenue (₹)"
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Energy (kCal)"
              type="number"
              min={0}
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="p-6 rounded-[2rem] bg-stone-50/50 border border-stone-100 space-y-6">
            <p className="text-xs font-black uppercase tracking-widest text-stone-300 text-center border-b border-stone-100 pb-3">Macro Distribution (Grams)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Protein"
                labelClassName="text-blue-700 opacity-100"
                type="number"
                min={0}
                step={0.1}
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Carbs"
                labelClassName="text-emerald-700 opacity-100"
                type="number"
                min={0}
                step={0.1}
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Fats"
                labelClassName="text-amber-700 opacity-100"
                type="number"
                min={0}
                step={0.1}
                value={form.fats}
                onChange={(e) => setForm({ ...form, fats: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <Input
            label="Ingredient List"
            value={ingredientsRaw}
            onChange={(e) => setIngredientsRaw(e.target.value)}
            placeholder="Separate with commas..."
          />

          <Input
            label="Visual Deployment Url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />

          <div className="grid grid-cols-2 gap-4 pt-4">
             {[
               { id: 'available', label: 'Live Status', field: 'is_available' },
               { id: 'bestseller', label: 'Premium Badge', field: 'is_bestseller' }
             ].map(opt => (
               <div key={opt.id} className="flex items-center gap-4 bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <input
                    id={opt.id}
                    type="checkbox"
                    checked={form[opt.field as keyof CreateMenuItemInput] as boolean}
                    onChange={(e) => setForm({ ...form, [opt.field]: e.target.checked })}
                    className="h-5 w-5 rounded-lg border-2 border-stone-200 text-amber-500 focus:ring-amber-500/20 transition-all"
                  />
                  <label htmlFor={opt.id} className="text-xs font-black text-stone-400 uppercase tracking-widest cursor-pointer">
                    {opt.label}
                  </label>
               </div>
             ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)} className="!rounded-2xl px-8">
              Abort
            </Button>
            <Button type="submit" loading={loading} className="!rounded-2xl px-12 shadow-premium">
              {editItem ? 'Update Portfolio' : 'Authorize Release'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
