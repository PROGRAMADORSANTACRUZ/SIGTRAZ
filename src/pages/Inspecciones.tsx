import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaInspeccion } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ESTADOS_INSPECCION,
  type EstadoInspeccion,
  type Inspeccion,
  type Plantilla,
  type RespuestaInspeccion,
} from '../types/trazabilidad'

const formVacio = (): NuevaInspeccion => ({
  plantillaId: undefined,
  inspector: '',
  ubicacion: '',
  estado: 'Pendiente',
  fecha: undefined,
  respuestas: [],
})

const COLOR_ESTADO: Record<EstadoInspeccion, string> = {
  Pendiente: 'bg-red-100 text-red-800',
  'En progreso': 'bg-amber-100 text-amber-800',
  Completada: 'bg-emerald-100 text-emerald-800',
}

export function Inspecciones() {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaInspeccion>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | EstadoInspeccion>(
    'Todas',
  )

  const [detalle, setDetalle] = useState<Inspeccion | null>(null)
  const [aEliminar, setAEliminar] = useState<Inspeccion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [ins, pla] = await Promise.all([
        api.getInspecciones(),
        api.getPlantillas(),
      ])
      setInspecciones(ins)
      setPlantillas(pla)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar inspecciones',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const inspeccionesFiltradas = useMemo(() => {
    if (filtroEstado === 'Todas') return inspecciones
    return inspecciones.filter((i) => i.estado === filtroEstado)
  }, [inspecciones, filtroEstado])

  function actualizar<K extends keyof NuevaInspeccion>(
    campo: K,
    valor: NuevaInspeccion[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function elegirPlantilla(plantillaId: string) {
    if (!plantillaId) {
      setForm((prev) => ({ ...prev, plantillaId: undefined, respuestas: [] }))
      return
    }
    const plantilla = plantillas.find((p) => p.id === plantillaId)
    const respuestas: RespuestaInspeccion[] = (plantilla?.items ?? []).map(
      (it) => ({ texto: it.texto, tipo: it.tipo, valor: '' }),
    )
    setForm((prev) => ({ ...prev, plantillaId, respuestas }))
  }

  function actualizarRespuesta(indice: number, valor: string) {
    setForm((prev) => ({
      ...prev,
      respuestas: prev.respuestas.map((r, i) =>
        i === indice ? { ...r, valor } : r,
      ),
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(inspeccion: Inspeccion) {
    setEditandoId(inspeccion.id)
    setForm({
      plantillaId: inspeccion.plantillaId,
      inspector: inspeccion.inspector ?? '',
      ubicacion: inspeccion.ubicacion ?? '',
      estado: inspeccion.estado,
      fecha: inspeccion.fecha,
      respuestas: inspeccion.respuestas.map((r) => ({ ...r })),
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
    if (guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevaInspeccion = {
        plantillaId: form.plantillaId,
        inspector: form.inspector?.trim() || undefined,
        ubicacion: form.ubicacion?.trim() || undefined,
        estado: form.estado,
        fecha: form.fecha || undefined,
        respuestas: form.respuestas,
      }
      if (editandoId) {
        const actualizada = await api.actualizarInspeccion(editandoId, datos)
        setInspecciones((prev) =>
          prev.map((i) => (i.id === editandoId ? actualizada : i)),
        )
      } else {
        const creada = await api.crearInspeccion(datos)
        setInspecciones((prev) => [creada, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la inspeccion',
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
      await api.eliminarInspeccion(aEliminar.id, password)
      setInspecciones((prev) => prev.filter((i) => i.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la inspeccion',
      )
    } finally {
      setEliminando(false)
    }
  }

  const pendientes = inspecciones.filter(
    (i) => i.estado === 'Pendiente',
  ).length
  const completadas = inspecciones.filter(
    (i) => i.estado === 'Completada',
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inspecciones</h2>
          <p className="text-slate-500">
            Inspecciones realizadas a partir de plantillas
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total" value={inspecciones.length} />
        <Kpi label="Pendientes" value={pendientes} />
        <Kpi label="Completadas" value={completadas} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar inspeccion' : 'Nueva inspeccion'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Plantilla">
              <select
                value={form.plantillaId ?? ''}
                onChange={(e) => elegirPlantilla(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Sin plantilla</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Inspector">
              <input
                value={form.inspector ?? ''}
                onChange={(e) => actualizar('inspector', e.target.value)}
                placeholder="Nombre del inspector"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Ubicacion">
              <input
                value={form.ubicacion ?? ''}
                onChange={(e) => actualizar('ubicacion', e.target.value)}
                placeholder="Area / Planta"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Fecha">
              <input
                type="date"
                value={form.fecha ?? ''}
                onChange={(e) =>
                  actualizar('fecha', e.target.value || undefined)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoInspeccion)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {ESTADOS_INSPECCION.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {form.respuestas.length > 0 && (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <span className="text-sm font-medium text-slate-700">
                Checklist ({form.respuestas.length})
              </span>
              {form.respuestas.map((r, i) => (
                <div key={i} className="grid grid-cols-1 gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    {r.texto}
                  </label>
                  <RespuestaInput
                    respuesta={r}
                    plantillaId={form.plantillaId}
                    plantillas={plantillas}
                    indice={i}
                    onChange={(valor) => actualizarRespuesta(i, valor)}
                  />
                </div>
              ))}
            </div>
          )}

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
              disabled={guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : editandoId
                  ? 'Guardar cambios'
                  : 'Crear inspeccion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {(['Todas', ...ESTADOS_INSPECCION] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filtroEstado === estado
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Plantilla</th>
              <th className="px-4 py-3 font-medium">Inspector</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inspeccionesFiltradas.map((inspeccion) => (
              <tr key={inspeccion.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {inspeccion.plantillaNombre ?? 'Sin plantilla'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {inspeccion.inspector ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {inspeccion.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[inspeccion.estado]}`}
                  >
                    {inspeccion.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {inspeccion.fecha ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDetalle(inspeccion)}
                      className="text-slate-600 hover:underline"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => abrirEdicion(inspeccion)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(inspeccion)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {inspeccionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando inspecciones...'
                    : error
                      ? `Error: ${error}`
                      : filtroEstado === 'Todas'
                        ? 'Sin inspecciones registradas.'
                        : `Sin inspecciones en estado "${filtroEstado}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {detalle.plantillaNombre ?? 'Sin plantilla'}
                </h3>
                <p className="text-sm text-slate-500">
                  {detalle.inspector ?? 'Sin inspector'} ·{' '}
                  {detalle.fecha ?? 'Sin fecha'}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[detalle.estado]}`}
              >
                {detalle.estado}
              </span>
            </div>

            <dl className="mt-4 space-y-2">
              {detalle.respuestas.length === 0 && (
                <p className="text-sm text-slate-400">Sin respuestas.</p>
              )}
              {detalle.respuestas.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm"
                >
                  <dt className="text-slate-600">{r.texto}</dt>
                  <dd className="font-medium text-slate-800">
                    {r.valor || '-'}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetalle(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar inspeccion"
          descripcion={`Vas a eliminar la inspeccion "${aEliminar.plantillaNombre ?? 'sin plantilla'}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function RespuestaInput({
  respuesta,
  plantillaId,
  plantillas,
  indice,
  onChange,
}: {
  respuesta: RespuestaInspeccion
  plantillaId?: string
  plantillas: Plantilla[]
  indice: number
  onChange: (valor: string) => void
}) {
  const clase =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  if (respuesta.tipo === 'si_no') {
    return (
      <select
        value={respuesta.valor}
        onChange={(e) => onChange(e.target.value)}
        className={clase}
      >
        <option value="">-</option>
        <option value="Si">Si</option>
        <option value="No">No</option>
        <option value="N/A">N/A</option>
      </select>
    )
  }

  if (respuesta.tipo === 'numero') {
    return (
      <input
        type="number"
        value={respuesta.valor}
        onChange={(e) => onChange(e.target.value)}
        className={clase}
      />
    )
  }

  if (respuesta.tipo === 'seleccion') {
    const plantilla = plantillas.find((p) => p.id === plantillaId)
    const opciones = plantilla?.items[indice]?.opciones ?? []
    return (
      <select
        value={respuesta.valor}
        onChange={(e) => onChange(e.target.value)}
        className={clase}
      >
        <option value="">-</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      value={respuesta.valor}
      onChange={(e) => onChange(e.target.value)}
      className={clase}
    />
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
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
