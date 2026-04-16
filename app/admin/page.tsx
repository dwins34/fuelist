import { createClient } from '@/lib/supabase/server'
import ServiceSettings from '@/components/admin/ServiceSettings'
import DeliveryZoneSettings from '@/components/admin/DeliveryZoneSettings'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalItems },
    { count: availableItems },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('menu_items').select('*', { count: 'exact', head: true }),
    supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ])

  const { data: categories } = await supabase
    .from('menu_items')
    .select('category')

  const categoryCounts = (categories ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + 1
      return acc
    },
    {}
  )

  const STATS = [
    { label: 'Total Inventory', value: totalItems ?? 0, icon: 'bowl' as IconName, accent: 'stone' },
    { label: 'Live Products', value: availableItems ?? 0, icon: 'checkCircle' as IconName, accent: 'amber' },
    { label: 'Archived / Sold Out', value: (totalItems ?? 0) - (availableItems ?? 0), icon: 'pause' as IconName, accent: 'stone' },
    { label: 'Active Personnel', value: totalUsers ?? 0, icon: 'users' as IconName, accent: 'amber' },
  ]

  return (
    <div className="space-y-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-2 border-b border-stone-100">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Admin Dashboard</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-300 mt-2">Store Overview & Metrics</p>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 rounded-2xl border border-stone-100 shadow-inner">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-200" />
           <span className="text-[10px] font-black uppercase tracking-widest text-stone-900">Store Online</span>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        <ServiceSettings />
        <DeliveryZoneSettings />
      </div>

      {/* ── High-Density Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat) => (
          <Card key={stat.label} className={cn(
            "p-8 rounded-[2.5rem] bg-white border-stone-50 transition-all hover:-translate-y-1 hover:shadow-premium group",
            stat.accent === 'amber' ? "hover:border-amber-100" : "hover:border-stone-100"
          )}>
            <div className={cn(
              "h-14 w-14 rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm shadow-stone-50",
              stat.accent === 'amber' ? "bg-amber-50 text-amber-500 border border-amber-100" : "bg-stone-50 text-stone-400 border border-stone-100"
            )}>
              <Icon name={stat.icon} size={28} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-black text-stone-900 tracking-tighter">{stat.value}</p>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-tight">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Distribution Metrics ── */}
      <div className="bg-stone-900 rounded-[3rem] p-12 text-white shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-16 items-start">
          <div className="max-w-xs space-y-4">
             <Badge variant="premium" className="px-4 py-1">In-Stock Analysis</Badge>
             <h2 className="text-3xl font-black tracking-tighter">Inventory Breakdown</h2>
             <p className="text-sm font-medium text-stone-400 leading-relaxed">
               Strategic distribution metrics across and categories for current active menu releases.
             </p>
          </div>
          
          <div className="flex-1 w-full space-y-8">
            {[
              { key: 'fruit', label: 'Fruit Bowls', icon: 'points' as IconName },
              { key: 'breakfast', label: 'Morning Fuel', icon: 'time' as IconName },
              { key: 'power', label: 'Power Performance', icon: 'bowl' as IconName },
            ].map(({ key, label, icon }) => {
              const count = categoryCounts[key] ?? 0
              const totalItemsCount = totalItems ?? 1
              const pct = totalItemsCount > 0 ? Math.round((count / totalItemsCount) * 100) : 0
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500">
                        <Icon name={icon} size={16} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-200">{label}</span>
                    </div>
                    <span className="text-xs font-black text-amber-500">{count} UNITS • {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
