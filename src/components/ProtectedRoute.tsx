import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/store/AuthContext'
import type { Role } from '@/types'

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Inapakia...
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (profile?.status === 'DISABLED') {
    return (
      <div className="flex h-screen items-center justify-center text-red-600 font-semibold">
        Akaunti yako imezimwa. Wasiliana na Admin.
      </div>
    )
  }

  if (adminOnly && profile?.role !== ('ADMIN' as Role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-600 font-semibold">
        HUJA RUHUSIWA
      </div>
    )
  }

  return <>{children}</>
}
