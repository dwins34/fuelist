import { MenuItem, CreateMenuItemInput, UpdateMenuItemInput } from '@/types'

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const res = await fetch('/api/menu', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch menu items')
  return res.json()
}

export async function createMenuItem(data: CreateMenuItemInput): Promise<MenuItem> {
  const res = await fetch('/api/menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create item')
  }
  return res.json()
}

export async function updateMenuItem(
  id: string,
  data: UpdateMenuItemInput
): Promise<MenuItem> {
  const res = await fetch(`/api/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update item')
  }
  return res.json()
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete item')
  }
}
