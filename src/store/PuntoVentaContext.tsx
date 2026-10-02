import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  getPuntoVentaActivo,
  setPuntoVentaActivo,
} from '../services/api'
import type { PuntoVenta } from '../types/trazabilidad'
import { useAuth } from './AuthContext'
import { esperarGuardados } from '../services/almacenamientoDatos'

interface PuntoVentaContextValue {
  // Puntos de venta que el usuario puede ver/usar.
  disponibles: PuntoVenta[]
  // Id del punto de venta activo, o null = "todos" (solo Administrador).
  activo: number | null
  // Administrador: puede ver todos y elegir "Todos".
  esAdmin: boolean
  cargando: boolean
  cambiar: (id: number | null) => void
}

const PuntoVentaContext = createContext<PuntoVentaContextValue | undefined>(
  undefined,
)

export function PuntoVentaProvider({ children }: { children: ReactNode }) {
  const { usuario, autenticado } = useAuth()
  const [todos, setTodos] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [activo, setActivo] = useState<number | null>(() => {
    const v = getPuntoVentaActivo()
    return v ? Number(v) : null
  })

  const esAdmin = (usuario?.rol ?? '').toLowerCase() === 'administrador'

  useEffect(() => {
    if (!autenticado) {
      setTodos([])
      setCargando(false)
      return
    }
    setCargando(true)
    api
      .getPuntosVenta()
      .then((lista) => setTodos(lista))
      .catch(() => setTodos([]))
      .finally(() => setCargando(false))
  }, [autenticado])

  // Puntos de venta visibles: el Administrador ve todos; los demas solo los
  // que tengan asignados.
  const disponibles = useMemo(() => {
    if (esAdmin) return todos
    const permitidos = new Set((usuario?.puntosVenta ?? []).map((n) => Number(n)))
    return todos.filter((p) => permitidos.has(Number(p.id)))
  }, [todos, esAdmin, usuario])

  // Auto-selecciona el primer PDV disponible para usuarios no administradores
  // (para que siempre trabajen dentro de un punto de venta valido).
  useEffect(() => {
    if (cargando || !autenticado) return
    const ids = disponibles.map((p) => Number(p.id))
    if (activo != null && ids.includes(activo)) return
    if (!esAdmin && ids.length > 0) {
      setActivo(ids[0])
      setPuntoVentaActivo(ids[0])
    } else if (activo != null && !ids.includes(activo)) {
      // El PDV guardado ya no aplica (p. ej. admin sin acceso removido).
      setActivo(null)
      setPuntoVentaActivo(null)
    }
  }, [cargando, autenticado, disponibles, esAdmin, activo])

  const cambiar = useCallback(async (id: number | null) => {
    try {
      await esperarGuardados()
      setPuntoVentaActivo(id)
      await esperarGuardados()
      setActivo(id)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo cambiar el punto de venta')
    }
  }, [])

  const value = useMemo(
    () => ({ disponibles, activo, esAdmin, cargando, cambiar }),
    [disponibles, activo, esAdmin, cargando, cambiar],
  )

  return (
    <PuntoVentaContext.Provider value={value}>
      {children}
    </PuntoVentaContext.Provider>
  )
}

export function usePuntoVenta(): PuntoVentaContextValue {
  const ctx = useContext(PuntoVentaContext)
  if (!ctx) {
    throw new Error('usePuntoVenta debe usarse dentro de <PuntoVentaProvider>')
  }
  return ctx
}
