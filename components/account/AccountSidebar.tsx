'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Icon, IconName } from '@/lib/icons'
import PointsBadge from './PointsBadge'

export type AccountTab = 'personal' | 'address' | 'subscriptions' | 'security'

interface AccountSidebarProps {
  activeTab: AccountTab
  onTabChange: (tab: AccountTab) => void
  profile: {
    name: string
    email: string
    reward_points: number
  } | null
}

const MENU_ITEMS: { id: AccountTab; label: string; icon: IconName }[] = [
  { id: 'personal',      label: 'Personal Information', icon: 'user' },
  { id: 'address',       label: 'Delivery Addresses',   icon: 'location' },
  { id: 'subscriptions', label: 'My Subscriptions',    icon: 'subscriptions' },
  { id: 'security',      label: 'Login & Security',     icon: 'security' },
]

export default function AccountSidebar({ activeTab, onTabChange, profile }: AccountSidebarProps) {
  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'U'

  return (
    <aside className="shrink-0 w-16 sm:w-20 lg:w-72 space-y-4 lg:space-y-6">
      {/* Profile Header — hidden on mobile, shown on lg */}
      <div className="hidden lg:flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 text-white font-black text-xl flex items-center justify-center shadow-premium border-2 border-white rotate-3">
            {initials}
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-lg bg-amber-500 border-2 border-white shadow-sm flex items-center justify-center text-white">
            <Icon name="success" size={12} strokeWidth={4} />
          </div>
        </div>
        <div className="mb-4">
          <h2 className="text-lg font-black text-stone-900 tracking-tight leading-none">
            {profile?.name ?? 'Loading...'}
          </h2>
          <p className="text-[10px] font-bold text-stone-400 mt-1 capitalize tracking-widest">{profile?.email}</p>
        </div>
        <div className="w-full">
          <PointsBadge points={profile?.reward_points ?? 0} />
        </div>
      </div>

      {/* Avatar — mobile only */}
      <div className="lg:hidden flex justify-center pt-1">
        <div className="relative">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-stone-800 to-stone-950 text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-white rotate-3">
            {initials}
          </div>
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-md bg-amber-500 border border-white shadow-sm flex items-center justify-center text-white">
            <Icon name="success" size={8} strokeWidth={4} />
          </div>
        </div>
      </div>

      {/* Navigation — icon-only on mobile, full label on desktop */}
      <nav className="flex flex-col gap-1.5">
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-300 group',
                'justify-center lg:justify-between',
                'p-2.5 lg:px-4 lg:py-2.5',
                isActive
                  ? 'bg-white text-amber-700 shadow-premium border border-amber-100/50'
                  : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 shrink-0',
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'bg-stone-50 text-stone-300 group-hover:bg-amber-50 group-hover:text-amber-500'
                )}>
                  <Icon name={item.icon} size={18} strokeWidth={2.5} />
                </div>
                <span className="hidden lg:block text-sm font-black tracking-tight">{item.label}</span>
              </div>

              {isActive && (
                <motion.div layoutId="activeTabIndicator" className="hidden lg:block h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
