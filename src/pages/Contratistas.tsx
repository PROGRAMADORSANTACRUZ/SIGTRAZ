import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoContratista } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_CONTRATISTA,
  type Contratista,
  type EstadoContratista,
} from '../types/trazabilidad'

const formVacio = (): NuevoContratista => ({
  nombre: '',
  empresa: '',
  documento: '',
  contacto: '',
  especialidad: '',
  estado: 'Activo',
  fechaInicio: undefined,
  fechaFin: undefined,
})

const COLOR: Record<EstadoContratista, string> = {
  Activo: 'bg-emerald-100 text-emerald-800',
  Inactivo: 'bg-slate-100 text-slate-600',
  Suspendido: 'bg-red-100 text-red-800',
}

export function Contratistas() {
  const [items, setItems] = useState<Contratista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoContratista>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Contratista | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getContratistas())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) =>
      [c.nombre, c.empresa, c.especialidad, c.documento]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [items, busqueda])

  function actualizar<K extends keyof NuevoContratista>(
    campo: K,
    valor: NuevoContratista[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(c: Contratista) {
    setEditandoId(c.id)
    setForm({
      nombre: c.nombre,
      empresa: c.empresa ?? '',
      documento: c.documento ?? '',
      contacto: c.contacto ?? '',
      especialidad: c.especialidad ?? '',
      estado: c.estado,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoContratista = {
        nombre: form.nombre.trim(),
        empresa: form.empresa?.trim() || undefined,
        documento: form.documento?.trim() || undefined,
        contacto: form.contacto?.trim() || undefined,
        especialidad: form.especialidad?.trim() || undefined,
        estado: form.estado,
        fechaInicio: form.fechaInicio || undefined,
        fechaFin: form.fechaFin || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarContratista(editandoId, datos)
        setItems((prev) => prev.map((c) => (c.id === editandoId ? upd : c)))
      } else {
        const creado = await api.crearContratista(datos)
        setItems((prev) => [creado, ...prev])
      }
      setMostrarForm(false)
      setEditandoId(null)
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarContratista(aEliminar.id, password)
      setItems((prev) => prev.filter((c) => c.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = items.filter((c) => c.estado === 'Activo').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contratistas</h2>
          <p className="text-slate-500">Empresas y personal externo</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total" value={items.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Inactivos/Suspendidos" value={items.length - activos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar contratista' : 'Nuevo contratista'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Nombre *">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                required
                className={inputClase}
              />
            </Campo>
            <Campo label="Empresa">
              <input
                value={form.empresa ?? ''}
                onChange={(e) => actualizar('empresa', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Documento">
              <input
                value={form.documento ?? ''}
                onChange={(e) => actualizar('documento', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Contacto">
              <input
                value={form.contacto ?? ''}
                onChange={(e) => actualizar('contacto', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Especialidad">
              <input
                value={form.especialidad ?? ''}
                onChange={(e) => actualizar('especialidad', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoContratista)
                }
                className={inputClase}
              >
                {ESTADOS_CONTRATISTA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fecha inicio">
              <input
                type="date"
                value={form.fechaInicio ?? ''}
                onChange={(e) =>
                  actualizar('fechaInicio', e.target.value || undefined)
                }
                className={inputClase}
              />
            </Campo>
            <Campo label="Fecha fin">
              <input
                type="date"
                value={form.fechaFin ?? ''}
                onChange={(e) =>
                  actualizar('fechaFin', e.target.value || undefined)
                }
                className={inputClase}
              />
            </Campo>
          </div>
          <div className="flex items-center justify-end gap-3">
            {errorForm && (
              <span className="mr-auto text-sm text-red-600">{errorForm}</span>
            )}
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, empresa, especialidad..."
        className={inputClase}
      />

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Especialidad</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.empresa ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.especialidad ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.contacto ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge texto={c.estado} color={COLOR[c.estado]} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(c)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin contratistas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar contratista"
          descripcion={`Vas a eliminar a "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}
