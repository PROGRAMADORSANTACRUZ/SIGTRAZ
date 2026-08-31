import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { CatalogoLyd, TipoCatalogoLyd } from '../types/trazabilidad'

const SECCIONES: { tipo: TipoCatalogoLyd; titulo: string; ph: string }[] = [
  {
    tipo: 'superficie',
    titulo: 'Superficies, utensilios y equipos a limpiar',
    ph: 'Ej. BARRILES',
  },
  { tipo: 'frecuencia', titulo: 'Frecuencia', ph: 'Ej. DIARIO' },
]

export function TiposLyd() {
  const [registros, setRegistros] = useState<CatalogoLyd[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<CatalogoLyd | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const datos = await api.getCatalogosLyd()
      setRegistros(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar catalogos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  function agregar(nuevo: CatalogoLyd) {
    setRegistros((prev) =>
      prev.some((r) => r.id === nuevo.id) ? prev : [...prev, nuevo],
    )
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarCatalogoLyd(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Tipos LYD</h2>
        <p className="text-slate-500">
          Catalogos de superficies/utensilios/equipos y frecuencias de limpieza
          y desinfeccion. Los valores se guardan en mayusculas y no se repiten.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {SECCIONES.map((s) => (
          <SeccionCatalogo
            key={s.tipo}
            tipo={s.tipo}
            titulo={s.titulo}
            placeholder={s.ph}
            registros={registros}
            cargando={cargando}
            onAgregado={agregar}
            onEliminar={(r) => {
              setErrorEliminar(null)
              setAEliminar(r)
            }}
          />
        ))}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function SeccionCatalogo({
  tipo,
  titulo,
  placeholder,
  registros,
  cargando,
  onAgregado,
  onEliminar,
}: {
  tipo: TipoCatalogoLyd
  titulo: string
  placeholder: string
  registros: CatalogoLyd[]
  cargando: boolean
  onAgregado: (r: CatalogoLyd) => void
  onEliminar: (r: CatalogoLyd) => void
}) {
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const items = useMemo(
    () =>
      registros
        .filter((r) => r.tipo === tipo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [registros, tipo],
  )

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio || guardando) return
    if (items.some((r) => r.nombre === limpio.toUpperCase())) {
      setErrorForm('Ya existe ese valor')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const creado = await api.crearCatalogoLyd(tipo, limpio)
      onAgregado(creado)
      setNombre('')
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo agregar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="font-semibold text-slate-800">{titulo}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {items.length}
        </span>
      </div>

      <form onSubmit={agregar} className="flex gap-2 px-4 py-3">
        <input
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value.toUpperCase())
            setErrorForm(null)
          }}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={nombre.trim() === '' || guardando}
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? '...' : 'Agregar'}
        </button>
      </form>

      {errorForm && (
        <p className="px-4 pb-2 text-sm text-red-600">{errorForm}</p>
      )}

      <div className="max-h-96 overflow-y-auto px-4 pb-4">
        {cargando ? (
          <p className="py-4 text-center text-sm text-slate-400">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            Sin registros.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-700">{r.nombre}</span>
                <button
                  onClick={() => onEliminar(r)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
