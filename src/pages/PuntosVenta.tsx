import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoPuntoVenta } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { PuntoVenta } from '../types/trazabilidad'

interface FormPdv {
  pdv: string
  prefijo: string
  direccion: string
  telefono: string
}

const formVacio = (): FormPdv => ({
  pdv: '',
  prefijo: '',
  direccion: '',
  telefono: '',
})

export function PuntosVenta() {
  const [registros, setRegistros] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormPdv>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<PuntoVenta | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const datos = await api.getPuntosVenta()
      setRegistros(datos)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar puntos de venta',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.pdv.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        r.pdv.toLowerCase().includes(t) ||
        (r.prefijo ?? '').toLowerCase().includes(t) ||
        (r.direccion ?? '').toLowerCase().includes(t) ||
        (r.telefono ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormPdv>(campo: K, valor: FormPdv[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: PuntoVenta) {
    setEditandoId(r.id)
    setForm({
      pdv: r.pdv,
      prefijo: r.prefijo ?? '',
      direccion: r.direccion ?? '',
      telefono: r.telefono ?? '',
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoPuntoVenta = {
        pdv: form.pdv.trim(),
        prefijo: form.prefijo.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarPuntoVenta(editandoId, datos)
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearPuntoVenta(datos)
        setRegistros((prev) => [...prev, creado])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el punto de venta',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarPuntoVenta(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el punto de venta',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Puntos de venta</h2>
          <p className="text-slate-500">
            Directorio de PDV con direccion y telefono.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar punto de venta' : 'Nuevo punto de venta'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="PDV *">
              <input
                value={form.pdv}
                onChange={(e) => actualizar('pdv', e.target.value)}
                placeholder="Nombre del punto de venta"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Prefijo">
              <input
                value={form.prefijo}
                onChange={(e) => actualizar('prefijo', e.target.value)}
                placeholder="Ej: ALA1"
                maxLength={20}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Direccion">
              <input
                value={form.direccion}
                onChange={(e) => actualizar('direccion', e.target.value)}
                placeholder="Direccion"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Telefono">
              <input
                value={form.telefono}
                onChange={(e) => actualizar('telefono', e.target.value)}
                placeholder="Telefono"
                data-no-upper
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <div className="flex items-center justify-end gap-3">
            {errorForm && (
              <span className="mr-auto text-sm text-red-600">{errorForm}</span>
            )}
            <button
              type="button"
              onClick={cerrarForm}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formValido || guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : editandoId
                  ? 'Guardar cambios'
                  : 'Crear punto de venta'}
            </button>
          </div>
        </form>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por PDV, direccion o telefono..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
      />

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">PDV</th>
              <th className="px-4 py-3 font-medium">Prefijo</th>
              <th className="px-4 py-3 font-medium">Direccion</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrosFiltrados.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.pdv}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.prefijo ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.direccion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.telefono ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(r)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(r)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {registrosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando puntos de venta...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin puntos de venta registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar punto de venta"
          descripcion={`Vas a eliminar "${aEliminar.pdv}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
