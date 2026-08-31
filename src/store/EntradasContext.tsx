import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type NuevaEntrada } from '../services/api'
import type { Entrada } from '../types/trazabilidad'

interface EntradasContextValue {
  entradas: Entrada[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  agregarEntrada: (entrada: NuevaEntrada) => Promise<Entrada>
  agregarEntradasLote: (
    cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
    productos: { productoId: string; cantidad: number }[],
  ) => Promise<Entrada[]>
  actualizarLoteEntradas: (
    loteInterno: string,
    cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
    productos: { productoId: string; cantidad: number }[],
    password: string,
  ) => Promise<Entrada[]>
  eliminarLoteEntradas: (loteInterno: string, password: string) => Promise<void>
  actualizarEntrada: (
    id: string,
    entrada: NuevaEntrada,
    password: string,
  ) => Promise<Entrada>
  eliminarEntrada: (id: string, password: string) => Promise<void>
}

const EntradasContext = createContext<EntradasContextValue | undefined>(
  undefined,
)

export function EntradasProvider({ children }: { children: ReactNode }) {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const datos = await api.getEntradas()
      setEntradas(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar entradas')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const agregarEntrada = useCallback(async (entrada: NuevaEntrada) => {
    const creada = await api.crearEntrada(entrada)
    setEntradas((prev) => [creada, ...prev])
    return creada
  }, [])

  const agregarEntradasLote = useCallback(
    async (
      cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
      productos: { productoId: string; cantidad: number }[],
    ) => {
      const creadas = await api.crearEntradasLote(cabecera, productos)
      setEntradas((prev) => [...creadas, ...prev])
      return creadas
    },
    [],
  )

  const actualizarLoteEntradas = useCallback(
    async (
      loteInterno: string,
      cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
      productos: { productoId: string; cantidad: number }[],
      password: string,
    ) => {
      const actualizadas = await api.actualizarEntradasLote(
        loteInterno,
        cabecera,
        productos,
        password,
      )
      setEntradas((prev) => [
        ...actualizadas,
        ...prev.filter((e) => e.loteInterno !== loteInterno),
      ])
      return actualizadas
    },
    [],
  )

  const eliminarLoteEntradas = useCallback(
    async (loteInterno: string, password: string) => {
      await api.eliminarEntradasLote(loteInterno, password)
      setEntradas((prev) => prev.filter((e) => e.loteInterno !== loteInterno))
    },
    [],
  )

  const actualizarEntrada = useCallback(
    async (id: string, entrada: NuevaEntrada, password: string) => {
      const actualizada = await api.actualizarEntrada(id, entrada, password)
      setEntradas((prev) =>
        prev.map((e) => (e.id === id ? actualizada : e)),
      )
      return actualizada
    },
    [],
  )

  const eliminarEntrada = useCallback(
    async (id: string, password: string) => {
      await api.eliminarEntrada(id, password)
      setEntradas((prev) => prev.filter((e) => e.id !== id))
    },
    [],
  )

  const value = useMemo(
    () => ({
      entradas,
      cargando,
      error,
      recargar,
      agregarEntrada,
      agregarEntradasLote,
      actualizarLoteEntradas,
      eliminarLoteEntradas,
      actualizarEntrada,
      eliminarEntrada,
    }),
    [
      entradas,
      cargando,
      error,
      recargar,
      agregarEntrada,
      agregarEntradasLote,
      actualizarLoteEntradas,
      eliminarLoteEntradas,
      actualizarEntrada,
      eliminarEntrada,
    ],
  )

  return (
    <EntradasContext.Provider value={value}>
      {children}
    </EntradasContext.Provider>
  )
}

export function useEntradas(): EntradasContextValue {
  const ctx = useContext(EntradasContext)
  if (!ctx) {
    throw new Error('useEntradas debe usarse dentro de <EntradasProvider>')
  }
  return ctx
}
