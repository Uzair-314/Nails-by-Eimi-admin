import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './pages/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import AdminProducts from './pages/AdminProducts'
import AdminCategories from './pages/AdminCategories'
import AdminOrders from './pages/AdminOrders'
import AdminDiscounts from './pages/AdminDiscounts'
import AdminHistory from './pages/AdminHistory'
import AdminCustomers from './pages/AdminCustomers'
import AdminMessages from './pages/AdminMessages'
import AdminSettings from './pages/AdminSettings'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

/**
 * The whole app is the admin panel, so the routes sit at the root rather than
 * under /admin. AdminLayout still carries its own guard.
 */
export default function App() {
  const { loading, isSignedIn } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <p className="text-sm text-muted">Checking your access…</p>
      </div>
    )
  }

  if (!isSignedIn) return <Login />

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="discounts" element={<AdminDiscounts />} />
        <Route path="history" element={<AdminHistory />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
