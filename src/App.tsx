/**
 * App.tsx
 *
 * CAMBIOS sobre tu archivo original:
 * - ProtectedRoute ahora acepta requiredRoleId opcional (para /admin/logs)
 * - Nueva ruta /admin/logs protegida (role_id = 1)
 * - Navigate usa `replace` (evita que "Atrás" regrese a una ruta no autorizada —
 *   tu propia revisión, punto 13.4)
 * - Ruta comodín (*) agregada (punto 13.5) — redirige a login por ahora
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminLogsPage } from './pages/AdminLogsPage'
import { useAuth } from './hooks/useAuth'
import './App.css'

/**
 * Componente que protege rutas: solo usuarios autenticados pueden acceder.
 * Si se pasa requiredRoleId, además exige que el usuario tenga ese role_id.
 */
const ProtectedRoute = ({
  children,
  requiredRoleId,
}: {
  children: React.ReactNode
  requiredRoleId?: number
}) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <div style={{ maxWidth: 600, margin: '80px auto' }}>Cargando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoleId !== undefined && user?.role_id !== requiredRoleId) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute requiredRoleId={1}>
              <AdminLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Redirecciona raíz a login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Ruta comodín: cualquier otra URL no reconocida */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
