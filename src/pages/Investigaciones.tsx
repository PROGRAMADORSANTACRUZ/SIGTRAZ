import { useEffect, useMemo, useState } from 'react'
import { api, type NuevaInvestigacion } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_INVESTIGACION,
  type Contratiempo,
  type EstadoInvestigacion,
  type Investigacion,
} from '../types/trazabilidad'

const formVacio = (): NuevaInvestigacion => ({
  titulo: '',
  contratiempoId: undefined,
  investigador: '',
  estado: 'Abierta',
  causaRaiz: '',
  conclusiones: '',
  fecha: undefined,
})

const COLOR: Record<EstadoInvestigacion, string> = {
  Abierta: 'bg-red-100 text-red-800',
  'En proceso': 'bg-amber-100 text-amber-800',
  Cerrada: 'bg-emerald-100 text-emerald-800',
}

export function Investigaciones() {
  const [items, setItems] = useState<Investigacion[]>([])
  const [contratiempos, setContratiempos] = useState<Contratiempo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todas' | EstadoInvestigacion>('Todas')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaInvestigacion>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Investigacion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [inv, cont] = await Promise.all([
        api.getInvestigaciones(),
        api.getContratiempos(),
      ])
      setItems(inv)
      setContratiempos(cont)
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
    if (filtro === 'Todas') return items
    return items.filter((i) => i.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevaInvestigacion>(
    campo: K,
    valor: NuevaInvestigacion[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(i: Investigacion) {
    setEditandoId(i.id)
    setForm({
      titulo: i.titulo,
      contratiempoId: i.contratiempoId,
      investigador: i.investigador ?? '',
      estado: i.estado,
      causaRaiz: i.causaRaiz ?? '',
      conclusiones: i.conclusiones ?? '',
      fecha: i.fecha,
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
      const datos: NuevaInvestigacion = {
        titulo: form.titulo.trim(),
        contratiempoId: form.contratiempoId,
        investigador: form.investigador?.trim() || undefined,
        estado: form.estado,
        causaRaiz: form.causaRaiz?.trim() || undefined,
        conclusiones: form.conclusiones?.trim() || undefined,
        fecha: form.fecha || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarInvestigacion(editandoId, datos)
        setItems((prev) => prev.map((i) => (i.id === editandoId ? upd : i)))
      } else {
        const creado = await api.crearInvestigacion(datos)
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
      await api.eliminarInvestigacion(aEliminar.id, password)
      setItems((prev) => prev.filter((i) => i.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const abiertas = items.filter((i) => i.estado !== 'Cerrada').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Investigaciones
          </h2>
          <p className="text-slate-500">
            Analisis de causa raiz de contratiempos
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
        <Kpi label="Total" value={items.length} />
        <Kpi label="Abiertas" value={abiertas} />
        <Kpi
          label="Cerradas"
          value={items.filter((i) => i.estado === 'Cerrada').length}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar investigacion' : 'Nueva investigacion'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Titulo *">
              <input
                value={form.titulo}
                onChange={(e) => actualizar('titulo', e.target.value)}
                required
                className={inputClase}
              />
            </Campo>
            <Campo label="Contratiempo relacionado">
              <select
                value={form.contratiempoId ?? ''}
                onChange={(e) =>
                  actualizar('contratiempoId', e.target.value || undefined)
                }
                className={inputClase}
              >
                <option value="">Sin relacionar</option>
                {contratiempos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Investigador">
              <input
                value={form.investigador ?? ''}
                onChange={(e) => actualizar('investigador', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoInvestigacion)
                }
                className={inputClase}
              >
                {ESTADOS_INVESTIGACION.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fecha">
              <input
                type="date"
                value={form.fecha ?? ''}
                onChange={(e) =>
                  actualizar('fecha', e.target.value || undefined)
                }
                className={inputClase}
              />
            </Campo>
          </div>
          <Campo label="Causa raiz">
            <textarea
              value={form.causaRaiz ?? ''}
              onChange={(e) => actualizar('causaRaiz', e.target.value)}
              rows={2}
              className={inputClase}
            />
          </Campo>
          <Campo label="Conclusiones">
            <textarea
              value={form.conclusiones ?? ''}
              onChange={(e) => actualizar('conclusiones', e.target.value)}
              rows={2}
              className={inputClase}
            />
          </Campo>
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
        {(['Todas', ...ESTADOS_INVESTIGACION] as const).map((f) => (
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
              <th className="px-4 py-3 font-medium">Titulo</th>
              <th className="px-4 py-3 font-medium">Contratiempo</th>
              <th className="px-4 py-3 font-medium">Investigador</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {i.titulo}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {i.contratiempoTitulo ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {i.investigador ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge texto={i.estado} color={COLOR[i.estado]} />
                </td>
                <td className="px-4 py-3 text-slate-600">{i.fecha ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(i)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(i)
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
                      : 'Sin investigaciones.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar investigacion"
          descripcion={`Vas a eliminar "${aEliminar.titulo}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}
