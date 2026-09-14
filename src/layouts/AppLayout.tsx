import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Search, ShoppingCart, Package, Wrench, Boxes,
  Tag, FileBarChart, Users, ScrollText, Settings, LogOut, Wifi, WifiOff,
} from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashibodi', icon: LayoutDashboard, adminOnly: false },
  { to: '/search', label: 'Tafuta', icon: Search, adminOnly: false },
  { to: '/sales', label: 'Mauzo', icon: ShoppingCart, adminOnly: false },
  { to: '/products', label: 'Bidhaa', icon: Package, adminOnly: true },
  { to: '/services', label: 'Huduma', icon: Wrench, adminOnly: true },
  { to: '/stock', label: 'Stock', icon: Boxes, adminOnly: true },
  { to: '/prices', label: 'Bei', icon: Tag, adminOnly: true },
  { to: '/reports', label: 'Ripoti', icon: FileBarChart, adminOnly: true },
  { to: '/staff', label: 'Wafanyakazi', icon: Users, adminOnly: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
  { to: '/settings', label: 'Mipangilio', icon: Settings, adminOnly: true },
]

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'ADMIN'
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-60 flex-col bg-brand text-white md:flex">
        <div className="px-5 py-5">
          <h2 className="text-lg font-bold">SURI STATIONARY</h2>
          <p className="text-xs text-slate-400">{profile?.full_name}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.filter((i) => !i.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive ? 'bg-brand-accent text-white' : 'text-slate-300 hover:bg-brand-light'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-brand-light"
        >
          <LogOut size={18} /> Toka
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
          <span className="font-bold text-brand">SURI STATIONARY</span>
          <button onClick={signOut} className="text-sm text-red-600">Toka</button>
        </header>
        <div className="flex items-center justify-end gap-2 px-4 pt-3 text-xs">
          {online ? (
            <span className="flex items-center gap-1 text-green-600"><Wifi size={14} /> ONLINE</span>
          ) : (
            <span className="flex items-center gap-1 text-red-600"><WifiOff size={14} /> OFFLINE</span>
          )}
        </div>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
