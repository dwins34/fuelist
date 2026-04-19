'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/lib/icons'

interface StaffUser {
  id: string
  name: string
  email: string
  role: 'user' | 'kitchen' | 'delivery' | 'admin'
  created_at: string
}

const ROLES = ['user', 'kitchen', 'delivery', 'admin'] as const

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  user:     { label: 'Customer',  color: 'text-stone-600',   bg: 'bg-stone-100 border-stone-200'   },
  kitchen:  { label: 'Kitchen',   color: 'text-amber-700',   bg: 'bg-amber-50  border-amber-200'   },
  delivery: { label: 'Delivery',  color: 'text-blue-700',    bg: 'bg-blue-50   border-blue-200'    },
  admin:    { label: 'Admin',     color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200'  },
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState<string | null>(null) // userId being saved
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  async function handleRoleChange(userId: string, role: string) {
    setSaving(userId)
    const res = await fetch('/api/admin/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as StaffUser['role'] } : u))
      showToast('Role updated — user must re-login to reflect changes', true)
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Failed to update role', false)
    }
    setSaving(null)
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const staff = filtered.filter(u => u.role !== 'user')
  const customers = filtered.filter(u => u.role === 'user')

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-stone-900 tracking-tighter">Users & Roles</h1>
        <p className="text-xs font-medium text-stone-400 mt-0.5">
          Assign kitchen, delivery, or admin roles. Changes take effect after the user logs out and back in.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Icon name="warning" size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
          <span className="font-black">Role changes take effect on next login.</span> After you assign a role, ask the user to sign out and sign back in — their JWT will refresh and they'll be redirected to the correct page automatically.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="search" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 placeholder-stone-300 outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-stone-400 text-sm">
          <div className="h-4 w-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          Loading users…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Staff section */}
          {staff.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">
                Staff ({staff.length})
              </h2>
              <div className="rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
                {staff.map(u => (
                  <UserRow key={u.id} user={u} saving={saving} onRoleChange={handleRoleChange} />
                ))}
              </div>
            </section>
          )}

          {/* Customers section */}
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">
              Customers ({customers.length})
            </h2>
            {customers.length === 0 ? (
              <p className="text-sm font-medium text-stone-400 py-4">No customers found</p>
            ) : (
              <div className="rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
                {customers.map(u => (
                  <UserRow key={u.id} user={u} saving={saving} onRoleChange={handleRoleChange} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-[11px] font-black shadow-xl max-w-sm text-center',
          toast.ok ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.ok ? <Icon name="checkCircle" size={14} className="text-amber-400 shrink-0" /> : <Icon name="error" size={14} className="shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, saving, onRoleChange }: {
  user: StaffUser
  saving: string | null
  onRoleChange: (id: string, role: string) => void
}) {
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.user
  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-stone-50/50 transition-colors">
      {/* Avatar */}
      <div className="h-9 w-9 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center text-[11px] font-black text-stone-500">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-stone-900 truncate">{user.name || '—'}</p>
        <p className="text-[10px] font-medium text-stone-400 truncate">{user.email}</p>
      </div>

      {/* Current role badge */}
      <span className={cn('shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', cfg.bg, cfg.color)}>
        {cfg.label}
      </span>

      {/* Role selector */}
      <div className="flex items-center gap-1 shrink-0">
        {saving === user.id ? (
          <div className="h-4 w-4 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
        ) : (
          ROLES.map(role => (
            <button
              key={role}
              onClick={() => role !== user.role && onRoleChange(user.id, role)}
              disabled={role === user.role}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all',
                role === user.role
                  ? `${ROLE_CONFIG[role].bg} ${ROLE_CONFIG[role].color} border cursor-default`
                  : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
              )}
            >
              {ROLE_CONFIG[role].label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
