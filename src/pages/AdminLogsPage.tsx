/**
 * AdminLogsPage.tsx
 *
 * CORRECCIONES sobre v2:
 * - Usa getAccessToken() de useAuth (ya NO intenta user.getSession(), que no existía)
 * - Debounce de 400ms en campos de texto (service, event_name, search)
 * - initialLoading vs refreshing separados (evita parpadeo en auto-refresh)
 * - AbortController: cancela fetch anterior si llega uno nuevo, y al desmontar
 * - Tipo de respuesta como unión discriminada (ok | error)
 * - Cambiar "limit" resetea a página 1; ajusta página si queda fuera de rango tras refresh
 * - Botón "Limpiar filtros"
 * - Distingue 401 (llevar a login) de 403 (acceso denegado) de otros errores
 * - request_id copiable con botón
 * - Campos opcionales aceptan null (Supabase puede devolver null, no solo undefined)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface LogEvent {
  id: number
  log_level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  category: 'SYSTEM' | 'SECURITY' | 'AUDIT' | 'BUSINESS'
  service: string
  event_name: string | null
  message: string
  error_code: string | null
  user_email: string | null
  endpoint: string | null
  method: string | null
  http_status_code: number | null
  duration_ms: number | null
  created_at: string
  request_id: string | null
}

interface LogsData {
  items: LogEvent[]
  page: number
  limit: number
  total: number
  total_pages: number
}

type LogsResponse =
  | { status: 'ok'; data: LogsData }
  | { status: 'error'; message: string; requestId?: string }

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export const AdminLogsPage = () => {
  const { user, isAuthenticated, getAccessToken } = useAuth()

  const [logs, setLogs] = useState<LogEvent[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [service, setService] = useState('')
  const [eventName, setEventName] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const debouncedService = useDebouncedValue(service, 400)
  const debouncedEventName = useDebouncedValue(eventName, 400)
  const debouncedSearch = useDebouncedValue(search, 400)

  const [autoRefresh, setAutoRefresh] = useState(true)

  const abortControllerRef = useRef<AbortController | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated || user?.role_id !== 1) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      if (!hasLoadedOnceRef.current) {
        setInitialLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const token = await getAccessToken()
      if (!token) {
        setError('No hay una sesión activa. Inicia sesión nuevamente.')
        return
      }

      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('limit', String(limit))
      if (level) params.append('level', level)
      if (category) params.append('category', category)
      if (debouncedService) params.append('service', debouncedService)
      if (debouncedEventName) params.append('event_name', debouncedEventName)
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`${API_URL}/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      // El header es la fuente más confiable (lo pone el middleware en
      // TODA respuesta, incluida esta); el body es respaldo si por algún
      // motivo el header no llegara.
      const headerRequestId = response.headers.get('X-Request-ID')

      if (response.status === 401) {
        setError(`Tu sesión expiró. Inicia sesión nuevamente.${headerRequestId ? ` (Referencia: ${headerRequestId})` : ''}`)
        return
      }
      if (response.status === 403) {
        setAccessDenied(true)
        return
      }

      const data: LogsResponse = await response.json()

      if (data.status === 'ok') {
        setLogs(data.data.items)
        setTotal(data.data.total)
        setTotalPages(data.data.total_pages)

        // Si la página actual quedó fuera de rango (ej. cambiaron los filtros), ajustar
        if (data.data.total_pages > 0 && page > data.data.total_pages) {
          setPage(data.data.total_pages)
        }
      } else {
        const ref = headerRequestId || (data as any)?.requestId
        setError((data.message || 'Error al obtener logs') + (ref ? ` (Referencia: ${ref})` : ''))
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      hasLoadedOnceRef.current = true
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [
    isAuthenticated,
    user,
    getAccessToken,
    page,
    limit,
    level,
    category,
    debouncedService,
    debouncedEventName,
    debouncedSearch,
    startDate,
    endDate,
  ])

  useEffect(() => {
    fetchLogs()
    return () => abortControllerRef.current?.abort()
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      // No refrescar si la pestaña está en segundo plano (evita tráfico innecesario)
      if (document.visibilityState === 'visible') {
        fetchLogs()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleClearFilters = () => {
    setLevel('')
    setCategory('')
    setService('')
    setEventName('')
    setSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const copyRequestId = (requestId: string) => {
    navigator.clipboard?.writeText(requestId).catch(() => undefined)
  }

  const getLevelColor = (lvl: string): string => {
    switch (lvl) {
      case 'ERROR': return '#ffcccc'
      case 'WARN': return '#ffffcc'
      case 'INFO': return '#ccffcc'
      case 'DEBUG': return '#ccccff'
      default: return 'white'
    }
  }

  const getCategoryBgColor = (cat: string): string => {
    switch (cat) {
      case 'SYSTEM': return '#e8f4f8'
      case 'SECURITY': return '#ffe8e8'
      case 'AUDIT': return '#e8ffe8'
      case 'BUSINESS': return '#f8e8ff'
      default: return 'white'
    }
  }

  if (!isAuthenticated || user?.role_id !== 1 || accessDenied) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>❌ Acceso denegado</h2>
        <p>Solo administradores pueden acceder a este panel.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20, fontFamily: 'system-ui' }}>
      <h1>📊 Sistema de Logs (Admin)</h1>

      {error && (
        <div style={{ background: '#ffcccc', padding: 10, marginBottom: 20, borderRadius: 4, color: '#cc0000' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: '#f5f5f5', padding: 15, marginBottom: 20, borderRadius: 4 }}>
        <div style={{ marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label>
            <strong>Nivel:</strong>
            <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1) }} style={{ marginLeft: 5, padding: 5 }}>
              <option value="">Todos</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </label>

          <label>
            <strong>Categoría:</strong>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} style={{ marginLeft: 5, padding: 5 }}>
              <option value="">Todos</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="SECURITY">SECURITY</option>
              <option value="AUDIT">AUDIT</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
          </label>

          <label>
            <strong>Servicio:</strong>
            <input type="text" placeholder="auth, invitations..." value={service}
              onChange={(e) => setService(e.target.value)} style={{ marginLeft: 5, padding: 5, width: 150 }} />
          </label>

          <label>
            <strong>Evento:</strong>
            <input type="text" placeholder="USER_INVITED..." value={eventName}
              onChange={(e) => setEventName(e.target.value)} style={{ marginLeft: 5, padding: 5, width: 180 }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <label>
            <strong>Búsqueda:</strong>
            <input type="text" placeholder="Buscar en mensaje..." value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: 5, padding: 5, width: 300 }} />
          </label>

          <label>
            <strong>Desde:</strong>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} style={{ marginLeft: 5, padding: 5 }} />
          </label>

          <label>
            <strong>Hasta:</strong>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} style={{ marginLeft: 5, padding: 5 }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => fetchLogs()} style={{ padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            🔄 Refrescar
          </button>

          <button onClick={handleClearFilters} style={{ padding: '8px 16px', background: '#888', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            ✕ Limpiar filtros
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh (10s) {refreshing && '⏳'}
          </label>

          <label>
            Registros por página:
            <select value={limit} onChange={(e) => handleLimitChange(parseInt(e.target.value))} style={{ marginLeft: 5, padding: 5 }}>
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {initialLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>⏳ Cargando...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f5f5f5' }}>No hay logs que mostrar</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginBottom: 20, border: '1px solid #ddd', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#333', color: 'white' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Fecha/Hora</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Nivel</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Categoría</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Servicio</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Evento</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Mensaje</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Usuario</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Endpoint</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Dur. (ms)</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ background: getLevelColor(log.log_level), borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('es-MX')}
                    </td>
                    <td style={{ padding: 8, fontWeight: 'bold' }}>{log.log_level}</td>
                    <td style={{ padding: 8, background: getCategoryBgColor(log.category), fontWeight: 'bold' }}>{log.category}</td>
                    <td style={{ padding: 8 }}>{log.service}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{log.event_name ?? '-'}</td>
                    <td style={{ padding: 8, maxWidth: 300 }}>{log.message}</td>
                    <td style={{ padding: 8 }}>{log.user_email ?? '-'}</td>
                    <td style={{ padding: 8, fontSize: 11, fontFamily: 'monospace' }}>{log.endpoint ?? '-'}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{log.http_status_code ?? '-'}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{log.duration_ms != null ? `${log.duration_ms}ms` : '-'}</td>
                    <td style={{ padding: 8, fontSize: 10, fontFamily: 'monospace', maxWidth: 100 }}>
                      {log.request_id ? (
                        <button
                          onClick={() => copyRequestId(log.request_id!)}
                          title={log.request_id}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10 }}
                        >
                          {log.request_id.substring(0, 8)}... 📋
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: '#f5f5f5', borderRadius: 4 }}>
            <div>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> | Total: <strong>{total}</strong> registros
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                style={{ padding: '8px 12px', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.5 : 1, background: '#0066cc', color: 'white', border: 'none', borderRadius: 4 }}>
                ← Anterior
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                style={{ padding: '8px 12px', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.5 : 1, background: '#0066cc', color: 'white', border: 'none', borderRadius: 4 }}>
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
