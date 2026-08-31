import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getPuntoVentaActivo, type NuevoCuartoFrio } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ESTADOS_CUARTO,
  RANGO_TEMP_CUARTO,
  TIPOS_CUARTO,
  type CuartoFrio,
  type EstadoCuarto,
  type PuntoVenta,
  type TipoCuarto,
} from '../types/trazabilidad'

const UNIDADES_CAP = ['kg', 'm3', 'ton', 'cajas']

const estadoEstilos: Record<EstadoCuarto, string> = {
  Activo: 'bg-emerald-100 text-emerald-800',
  Inactivo: 'bg-red-100 text-red-800',
  Mantenimiento: 'bg-amber-100 text-amber-800',
}

const formVacio = (): NuevoCuartoFrio => ({
  nombre: '',
  tipo: 'Congelado',
  capacidad: undefined,
  capacidadUnidad: 'kg',
  ubicacion: '',
  responsable: '',
  estado: 'Activo',
  puntoVentaId: undefined,
})

export function CuartosFrios() {
  const [cuartos, setCuartos] = useState<CuartoFrio[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoCuartoFrio>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<CuartoFrio | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setCuartos(await api.getCuartosFrios())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuartos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
    api
      .getPuntosVenta()
      .then(setPuntosVenta)
      .catch(() => setPuntosVenta([]))
  }, [])

  const formValido = useMemo(
    () => form.nombre.trim() !== '' && form.puntoVentaId != null,
    [form],
  )

  function actualizar<K extends keyof NuevoCuartoFrio>(
    campo: K,
    valor: NuevoCuartoFrio[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    const activo = getPuntoVentaActivo()
    setForm({
      ...formVacio(),
      puntoVentaId: activo != null ? Number(activo) : undefined,
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(cuarto: CuartoFrio) {
    setEditandoId(cuarto.id)
    setForm({
      nombre: cuarto.nombre,
      tipo: cuarto.tipo,
      capacidad: cuarto.capacidad,
      capacidadUnidad: cuarto.capacidadUnidad,
      ubicacion: cuarto.ubicacion ?? '',
      responsable: cuarto.responsable ?? '',
      estado: cuarto.estado,
      puntoVentaId: cuarto.puntoVentaId,
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
      const datos: NuevoCuartoFrio = {
        ...form,
        nombre: form.nombre.trim().toUpperCase(),
        ubicacion: form.ubicacion?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarCuartoFrio(editandoId, datos)
        setCuartos((prev) =>
          prev
            .map((c) => (c.id === editandoId ? actualizado : c))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creado = await api.crearCuartoFrio(datos)
        setCuartos((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el cuarto',
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
      await api.eliminarCuartoFrio(aEliminar.id, password)
      setCuartos((prev) => prev.filter((c) => c.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = cuartos.filter((c) => c.estado === 'Activo').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cuartos frios</h2>
          <p className="text-slate-500">Catalogo de camaras de refrigeracion</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total cuartos" value={cuartos.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Fuera de servicio" value={cuartos.length - activos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar cuarto frio' : 'Nuevo cuarto frio'}
          </h3>

          <Campo label="Punto de venta">
            <select
              value={form.puntoVentaId ?? ''}
              onChange={(e) =>
                actualizar(
                  'puntoVentaId',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Selecciona un punto de venta</option>
              {puntosVenta.map((pv) => (
                <option key={pv.id} value={pv.id}>
                  {pv.pdv}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Nombre / identificador">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value.toUpperCase())}
              placeholder="CAMARA 1"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                actualizar('estado', e.target.value as EstadoCuarto)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ESTADOS_CUARTO.map((es) => (
                <option key={es} value={es}>
                  {es}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Tipo de conservacion">
            <select
              value={form.tipo}
              onChange={(e) =>
                actualizar('tipo', e.target.value as TipoCuarto)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {TIPOS_CUARTO.map((t) => (
                <option key={t} value={t}>
                  {t} ({RANGO_TEMP_CUARTO[t]})
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Capacidad">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={form.capacidad ?? ''}
                onChange={(e) =>
                  actualizar(
                    'capacidad',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="5000"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <select
                value={form.capacidadUnidad}
                onChange={(e) => actualizar('capacidadUnidad', e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {UNIDADES_CAP.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Campo>

          <Campo label="Ubicacion / sede">
            <input
              value={form.ubicacion ?? ''}
              onChange={(e) => actualizar('ubicacion', e.target.value)}
              placeholder="Planta principal"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Responsable">
            <input
              value={form.responsable ?? ''}
              onChange={(e) => actualizar('responsable', e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="flex items-center justify-end gap-3 md:col-span-2">
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
                  : 'Crear cuarto frio'}
            </button>
          </div>
        </form>
      )}

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Punto de venta</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Capacidad</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cuartos.map((cuarto) => (
              <tr key={cuarto.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {cuarto.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {cuarto.puntoVenta ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="font-medium text-slate-700">
                    {cuarto.tipo}
                  </span>{' '}
                  <span className="text-slate-400">
                    ({RANGO_TEMP_CUARTO[cuarto.tipo]})
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {cuarto.capacidad != null
                    ? `${cuarto.capacidad} ${cuarto.capacidadUnidad}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {cuarto.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {cuarto.responsable ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoEstilos[cuarto.estado]}`}
                  >
                    {cuarto.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(cuarto)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(cuarto)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cuartos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando cuartos frios...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin cuartos frios registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar cuarto frio"
          descripcion={`Vas a eliminar el cuarto frio "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
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
