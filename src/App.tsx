import { useState } from 'react'
import './App.css'

// La URL del backend viene de una variable de entorno para que sea distinta
// en local (http://localhost:3000) y en producción (https://api.xipe.li).
// En Vercel esta variable se configura en Project Settings -> Environment Variables.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [resultado, setResultado] = useState<string>('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const probarConexion = async () => {
    setCargando(true)
    setError(null)
    setResultado('')
    try {
      const respuesta = await fetch(`${API_URL}/health`)
      if (!respuesta.ok) {
        throw new Error(`El backend respondió con estado ${respuesta.status}`)
      }
      const datos = await respuesta.json()
      setResultado(JSON.stringify(datos, null, 2))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el backend'
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>xipe-frontend</h1>
      <p>Fase 1: verificación de conexión con el backend.</p>
      <p style={{ color: '#666', fontSize: 14 }}>Backend configurado: {API_URL}</p>

      <button onClick={probarConexion} disabled={cargando}>
        {cargando ? 'Probando...' : 'Probar conexión con api.xipe.li'}
      </button>

      {resultado && (
        <pre style={{ background: '#f4f4f4', padding: 12, marginTop: 16 }}>
          {resultado}
        </pre>
      )}

      {error && (
        <p style={{ color: 'crimson', marginTop: 16 }}>
          Error: {error}
        </p>
      )}
    </div>
  )
}

export default App
