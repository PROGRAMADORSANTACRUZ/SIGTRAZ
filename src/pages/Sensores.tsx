import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoSensor } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_SENSOR,
  type EstadoSensor,
  type Sensor,
} from '../types/trazabilidad'

const formVacio = (): NuevoSensor => ({
  codigo: '',
  nombre: '',
  tipo: '',
  ubicacion: '',
  unidad: '',
  valorActual: undefined,
  estado: 'Normal',
  ultimaLectura: undefined,
})

const COLOR: Record<EstadoSensor, string> = {
  Normal: 'bg-emerald-100 text-emerald-800',
  Alerta: 'bg-red-100 text-red-800',
  'Fuera de linea': 'bg-slate-100 text-slate-600',
}

export function Sensores() {
  const [items, setItems] = useState<Sensor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | EstadoSensor>('Todos')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoSensor>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Sensor | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getSensores())
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
    if (filtro === 'Todos') return items
    return items.filter((s) => s.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevoSensor>(
    campo: K,
    valor: NuevoSensor[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(s: Sensor) {
    setEditandoId(s.id)
    setForm({
      codigo: s.codigo ?? '',
      nombre: s.nombre,
      tipo: s.tipo ?? '',
      ubicacion: s.ubicacion ?? '',
      unidad: s.unidad ?? '',
      valorActual: s.valorActual,
      estado: s.estado,
      ultimaLectura: s.ultimaLectura,
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
      const datos: NuevoSensor = {
        codigo: form.codigo?.trim() || undefined,
        nombre: form.nombre.trim(),
        tipo: form.tipo?.trim() || undefined,
        ubicacion: form.ubicacion?.trim() || undefined,
        unidad: form.unidad?.trim() || undefined,
        valorActual: form.valorActual,
        estado: form.estado,
        ultimaLectura: form.ultimaLectura || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarSensor(editandoId, datos)
        setItems((prev) => prev.map((s) => (s.id === editandoId ? upd : s)))
      } else {
        const creado = await api.crearSensor(datos)
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
      await api.eliminarSensor(aEliminar.id, password)
      setItems((prev) => prev.filter((s) => s.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const enAlerta = items.filter((s) => s.estado === 'Alerta').length
  const fueraLinea = items.filter((s) => s.estado === 'Fuera de linea').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sensores</h2>
          <p className="text-slate-500">Monitoreo de sensores y lecturas</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total" value={items.length} />
        <Kpi
          label="Normales"
          value={items.filter((s) => s.estado === 'Normal').length}
        />
        <Kpi label="En alerta" value={enAlerta} />
        <Kpi label="Fuera de linea" value={fueraLinea} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar sensor' : 'Nuevo sensor'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Codigo">
              <input
                value={form.codigo ?? ''}
                onChange={(e) => actualizar('codigo', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Nombre *">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                required
                className={inputClase}
              />
            </Campo>
            <Campo label="Tipo">
              <input
                value={form.tipo ?? ''}
                onChange={(e) => actualizar('tipo', e.target.value)}
                placeholder="Temperatura, Humedad..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Ubicacion">
              <input
                value={form.ubicacion ?? ''}
                onChange={(e) => actualizar('ubicacion', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Unidad">
              <input
                value={form.unidad ?? ''}
                onChange={(e) => actualizar('unidad', e.target.value)}
                placeholder="C, %, ppm..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Valor actual">
              <input
                type="number"
                step="any"
                value={form.valorActual ?? ''}
                onChange={(e) =>
                  actualizar(
                    'valorActual',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                className={inputClase}
              />
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoSensor)
                }
                className={inputClase}
              >
                {ESTADOS_SENSOR.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Ultima lectura">
              <input
                type="date"
                value={form.ultimaLectura ?? ''}
                onChange={(e) =>
                  actualizar('ultimaLectura', e.target.value || undefined)
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

      <div className="flex items-center gap-2">
        {(['Todos', ...ESTADOS_SENSOR] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filtro === f
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Lectura</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{s.codigo ?? '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {s.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.tipo ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.valorActual != null
                    ? `${s.valorActual}${s.unidad ? ' ' + s.unidad : ''}`
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge texto={s.estado} color={COLOR[s.estado]} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(s)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(s)
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
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin sensores.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar sensor"
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
