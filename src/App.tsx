import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { CartProvider } from '@/store/CartContext'
import AppLayout from '@/layouts/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Search from '@/pages/Search'
import Sales from '@/pages/Sales'
import Products from '@/pages/Products'
import Services from '@/pages/Services'
import Stock from '@/pages/Stock'
import Prices from '@/pages/Prices'
import Reports from '@/pages/Reports'
import Staff from '@/pages/Staff'
import AuditLogs from '@/pages/AuditLogs'
import SettingsPage from '@/pages/SettingsPage'
import Backup from '@/pages/Backup'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <CartProvider>
              <AppLayout />
            </CartProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/sales" element={<Sales />} />

        <Route path="/products" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute adminOnly><Services /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute adminOnly><Stock /></ProtectedRoute>} />
        <Route path="/prices" element={<ProtectedRoute adminOnly><Prices /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute adminOnly><Staff /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute adminOnly><Backup /></ProtectedRoute>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
