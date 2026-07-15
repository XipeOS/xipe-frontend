import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface InvitationStatus {
  valid: boolean
  email: string
  expiresAt: string
}

export const AcceptInvitationPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, login } = useAuth()

  const token = searchParams.get('token')

  const [step, setStep] = useState<'validating' | 'form' | 'success' | 'error'>('validating')
  const [invitation, setInvitation] = useState<InvitationStatus | null>(null)
  const [formData, setFormData] = useState({ password: '', fullName: '' })
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // Valida invitación al cargar
  useEffect(() => {
    if (!token) {
      setStep('error')
      setFormError('Token no proporcionado')
      return
    }

    const validateInvitation = async () => {
      try {
        const response = await fetch(`${API_URL}/invitations/validate?token=${token}`)
        const data = await response.json()

        if (!data.valid) {
          setStep('error')
          setFormError('Invitación inválida, expirada o ya utilizada')
          return
        }

        setInvitation(data)
        setStep('form')
      } catch (err) {
        setStep('error')
        setFormError(
          err instanceof Error ? err.message : 'Error al validar invitación',
        )
      }
    }

    validateInvitation()
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.password || !formData.fullName) {
      setFormError('Todos los campos son requeridos')
      return
    }

    if (formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          full_name: formData.fullName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setFormError(data.message || 'Error al crear cuenta')
        return
      }

      // Intenta login automático con las credenciales que acaba de crear
      const loginSuccess = await login(
        invitation?.email || '',
        formData.password,
      )

      if (loginSuccess) {
        setStep('success')
      } else {
        setStep('form')
        setFormError('Cuenta creada, pero login falló. Intenta en la página de login.')
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Error al crear cuenta',
      )
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <p>Ya estás autenticado. Redirigiendo...</p>
      </div>
    )
  }

  if (step === 'validating') {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <h2>Validando invitación...</h2>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <h2>Error</h2>
        <p style={{ color: 'crimson' }}>{formError}</p>
        <button onClick={() => navigate('/login')}>Volver a login</button>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <h2>¡Bienvenido!</h2>
        <p>Cuenta creada exitosamente. Redirigiendo al dashboard...</p>
      </div>
    )
  }

  return (
    <div
  style={{
    width: '100%',
    maxWidth: 600,
    margin: '80px auto',
    padding: '0 24px',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    textAlign: 'center',
  }}
>
      <h1
  style={{
    fontSize: '2.5rem',
    lineHeight: '1.2',
    margin: '0 0 24px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }}
>
  Aceptar invitación
</h1>
      <p>Email: <strong>{invitation?.email}</strong></p>
      <p style={{ fontSize: 12, color: '#666' }}>
        Expira: {new Date(invitation?.expiresAt || '').toLocaleString()}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>
            Nombre completo:
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
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
            Contraseña (mín. 6 caracteres):
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

        {formError && (
          <div style={{ color: 'crimson', marginBottom: 16 }}>
            {formError}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  )
}
