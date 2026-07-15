import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const { user, logout, loading } = useAuth()

  if (loading) {
    return <div style={{ maxWidth: 600, margin: '80px auto' }}>Cargando...</div>
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>

      <div style={{ background: '#f4f4f4', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <h2>Bienvenido, {user.full_name}</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Rol:</strong> {user.role_name}</p>
        <p><strong>User ID:</strong> {user.id}</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p>Fase 3 completada: Autenticación con Supabase</p>
        <ul>
          <li>✅ Invitaciones de un solo uso</li>
          <li>✅ JWT validado en cada request</li>
          <li>✅ Sesión administrada por Supabase</li>
          <li>✅ Perfiles con roles</li>
          <li>✅ RLS en BD</li>
        </ul>
      </div>

      <button onClick={() => logout()} disabled={loading}>
        {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
