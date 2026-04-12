import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from "@/components/Logo"

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <Link href="/" className="font-bold text-lg text-green-600"><Logo size={20} /> Fuelist</Link>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <span>📊</span> Dashboard
          </Link>
          <Link
            href="/admin/menu"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <span><Logo size={20} /></span> Menu Items
          </Link>
          <Link
            href="/admin/subscriptions"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <span>🔄</span> Subscriptions
          </Link>
          <Link
            href="/kitchen"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>🍽</span> Live Orders ↗
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Signed in as</p>
          <p className="text-sm font-medium text-gray-700 truncate">{profile?.name}</p>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
