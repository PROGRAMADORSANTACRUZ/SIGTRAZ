import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaPlantilla } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ETIQUETA_TIPO_ITEM,
  TIPOS_ITEM_PLANTILLA,
  type ItemPlantilla,
  type Plantilla,
  type TipoItemPlantilla,
} from '../types/trazabilidad'

const formVacio = (): NuevaPlantilla => ({
  nombre: '',
  descripcion: '',
  categoria: '',
  items: [],
})

export function Plantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaPlantilla>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<Plantilla | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setPlantillas(await api.getPlantillas())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantillas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.nombre.trim() !== '', [form])

  const plantillasFiltradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return plantillas
    return plantillas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(t) ||
        (p.categoria ?? '').toLowerCase().includes(t),
    )
  }, [plantillas, busqueda])

  function actualizar<K extends keyof NuevaPlantilla>(
    campo: K,
    valor: NuevaPlantilla[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function agregarItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { texto: '', tipo: 'texto' }],
    }))
  }

  function actualizarItem(indice: number, cambios: Partial<ItemPlantilla>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) =>
        i === indice ? { ...it, ...cambios } : it,
      ),
    }))
  }

  function quitarItem(indice: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== indice),
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(plantilla: Plantilla) {
    setEditandoId(plantilla.id)
    setForm({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion ?? '',
      categoria: plantilla.categoria ?? '',
      items: plantilla.items.map((it) => ({ ...it })),
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
      const datos: NuevaPlantilla = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        categoria: form.categoria?.trim() || undefined,
        items: form.items
          .filter((it) => it.texto.trim() !== '')
          .map((it) => ({
            texto: it.texto.trim(),
            tipo: it.tipo,
            opciones:
              it.tipo === 'seleccion'
                ? (it.opciones ?? []).map((o) => o.trim()).filter(Boolean)
                : undefined,
          })),
      }
      if (editandoId) {
        const actualizada = await api.actualizarPlantilla(editandoId, datos)
        setPlantillas((prev) =>
          prev
            .map((p) => (p.id === editandoId ? actualizada : p))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creada = await api.crearPlantilla(datos)
        setPlantillas((prev) =>
          [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la plantilla',
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
      await api.eliminarPlantilla(aEliminar.id, password)
      setPlantillas((prev) => prev.filter((p) => p.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la plantilla',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Plantillas</h2>
          <p className="text-slate-500">
            Formularios reutilizables para inspecciones
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
        <Kpi label="Total plantillas" value={plantillas.length} />
        <Kpi
          label="Total items"
          value={plantillas.reduce((n, p) => n + p.items.length, 0)}
        />
        <Kpi
          label="Categorias"
          value={
            new Set(plantillas.map((p) => p.categoria).filter(Boolean)).size
          }
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar plantilla' : 'Nueva plantilla'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Nombre">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                placeholder="Inspeccion de cuarto frio"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Categoria">
              <input
                value={form.categoria ?? ''}
                onChange={(e) => actualizar('categoria', e.target.value)}
                placeholder="Inocuidad / Calidad"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <Campo label="Descripcion">
            <textarea
              value={form.descripcion ?? ''}
              onChange={(e) => actualizar('descripcion', e.target.value)}
              rows={2}
              placeholder="Proposito de la plantilla"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Preguntas / items ({form.items.length})
              </span>
              <button
                type="button"
                onClick={agregarItem}
                className="rounded-md border border-brand-300 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                + Agregar item
              </button>
            </div>

            {form.items.length === 0 && (
              <p className="text-sm text-slate-400">
                Aun no hay items. Agrega la primera pregunta.
              </p>
            )}

            {form.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-12"
              >
                <input
                  value={item.texto}
                  onChange={(e) => actualizarItem(i, { texto: e.target.value })}
                  placeholder={`Pregunta ${i + 1}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:col-span-6"
                />
                <select
                  value={item.tipo}
                  onChange={(e) =>
                    actualizarItem(i, {
                      tipo: e.target.value as TipoItemPlantilla,
                    })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:col-span-3"
                >
                  {TIPOS_ITEM_PLANTILLA.map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETA_TIPO_ITEM[t]}
                    </option>
                  ))}
                </select>
                {item.tipo === 'seleccion' ? (
                  <input
                    value={(item.opciones ?? []).join(', ')}
                    onChange={(e) =>
                      actualizarItem(i, {
                        opciones: e.target.value.split(','),
                      })
                    }
                    placeholder="Opcion 1, Opcion 2"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:col-span-2"
                  />
                ) : (
                  <div className="md:col-span-2" />
                )}
                <button
                  type="button"
                  onClick={() => quitarItem(i)}
                  className="rounded-md text-sm font-medium text-red-600 hover:underline md:col-span-1"
                >
                  Quitar
                </button>
              </div>
            ))}
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
                  : 'Crear plantilla'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o categoria..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plantillasFiltradas.map((plantilla) => (
          <div
            key={plantilla.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {plantilla.nombre}
                </h3>
                {plantilla.categoria && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {plantilla.categoria}
                  </span>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {plantilla.items.length} items
              </span>
            </div>
            {plantilla.descripcion && (
              <p className="mt-2 text-sm text-slate-500">
                {plantilla.descripcion}
              </p>
            )}
            <div className="mt-auto flex justify-end gap-3 pt-4">
              <button
                onClick={() => abrirEdicion(plantilla)}
                className="text-sm text-brand-600 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  setErrorEliminar(null)
                  setAEliminar(plantilla)
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {plantillasFiltradas.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
            {cargando
              ? 'Cargando plantillas...'
              : error
                ? `Error: ${error}`
                : busqueda
                  ? `Sin resultados para "${busqueda}".`
                  : 'Sin plantillas registradas.'}
          </div>
        )}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar plantilla"
          descripcion={`Vas a eliminar la plantilla "${aEliminar.nombre}".`}
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
