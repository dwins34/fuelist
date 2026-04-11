import { createClient } from '@/lib/supabase/server'

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
    { label: 'Total Menu Items', value: totalItems ?? 0, icon: '🥗', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Available Now', value: availableItems ?? 0, icon: '✅', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Unavailable', value: (totalItems ?? 0) - (availableItems ?? 0), icon: '⏸', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Registered Users', value: totalUsers ?? 0, icon: '👤', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your Fuelist store.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5`}>
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items by Category</h2>
        <div className="space-y-3">
          {[
            { key: 'fruit', label: 'Fruit Bowls', emoji: '🍓' },
            { key: 'breakfast', label: 'Breakfast Bowls', emoji: '🥣' },
            { key: 'power', label: 'Power Bowls', emoji: '🥗' },
          ].map(({ key, label, emoji }) => {
            const count = categoryCounts[key] ?? 0
            const total = totalItems ?? 1
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {emoji} {label}
                  </span>
                  <span className="text-sm text-gray-500">{count} items</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
