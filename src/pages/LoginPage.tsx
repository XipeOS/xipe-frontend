import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, error, loading } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [formError, setFormError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.email || !formData.password) {
      setFormError('Email y contraseña son requeridos')
      return
    }

    const success = await login(formData.email, formData.password)

    if (success) {
      navigate('/dashboard')
    } else {
      setFormError(error || 'Error al iniciar sesión')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>xipe-frontend</h1>
      <p>Fase 3: Autenticación con Supabase</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                marginTop: '4px',
                boxSizing: 'border-box',
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Contraseña:
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                marginTop: '4px',
                boxSizing: 'border-box',
              }}
            />
          </label>
        </div>

        {(formError || error) && (
          <div style={{ color: 'crimson', marginBottom: 16 }}>
            {formError || error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <hr style={{ margin: '32px 0' }} />
      <p style={{ fontSize: 12, color: '#666' }}>
        ¿No tienes cuenta?{' '}
        <a href="mailto:admin@wico.mx">Pide una invitación al administrador</a>
      </p>
    </div>
  )
}
