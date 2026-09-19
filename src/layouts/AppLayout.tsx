import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/search', label: 'Tafuta', icon: '🔍' },
  { to: '/sales', label: 'Uza', icon: '🛒' },
  { to: '/products', label: 'Bidhaa', icon: '📦', adminOnly: true },
  { to: '/services', label: 'Huduma', icon: '🖨️', adminOnly: true },
  { to: '/stock', label: 'Stock', icon: '🏷️', adminOnly: true },
  { to: '/prices', label: 'Bei', icon: '💰', adminOnly: true },
  { to: '/reports', label: 'Ripoti', icon: '📈', adminOnly: true },
  { to: '/staff', label: 'Wafanyakazi', icon: '👥', adminOnly: true },
  { to: '/settings', label: 'Mipangilio', icon: '⚙️', adminOnly: true },
  { to: '/audit-logs', label: 'Logs', icon: '📝', adminOnly: true },
  { to: '/backup', label: 'Backup', icon: '💾', adminOnly: true },
]

export default function AppLayout() {
  const { profile, loading, signOut } = useAuth()
  const [online, setOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const isAdmin = String(profile?.role ?? '').toUpperCase() === 'ADMIN'
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const roleLabel = isAdmin ? 'ADMIN' : profile ? 'STAFF' : ''

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">SURI STATIONARY</h1>
          {roleLabel && <p className="text-xs text-slate-500">{roleLabel}</p>}
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`text-xs font-semibold ${
              online ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {online ? '● ONLINE' : '● OFFLINE'}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm font-medium text-red-600"
          >
            Toka
          </button>
        </div>
      </header>

      <div className="md:flex">
        <aside className="hidden w-56 shrink-0 border-r bg-white md:block">
          <nav className="sticky top-14 flex flex-col gap-1 p-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-indigo-50 font-semibold text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-3 pb-28 md:p-6 md:pb-6">
          <div className="mx-auto max-w-5xl space-y-4">
            {!loading && !profile && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                Akaunti hii haina profile kwenye database, kwa hiyo sehemu za admin
                hazionekani. Weka profile yenye role ADMIN kwenye jedwali la profiles.
              </div>
            )}
            <Outlet />
            <p className="pt-4 text-center text-xs text-slate-400">
              Powered by Hagai Chrisanty Laitony · HITECH TECHNOLOGY
            </p>
          </div>
        </main>
      </div>

      <nav
        aria-label="Menyu kuu"
        className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t bg-white md:hidden"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-[76px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs ${
                isActive ? 'font-semibold text-indigo-600' : 'text-slate-600'
              }`
            }
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
