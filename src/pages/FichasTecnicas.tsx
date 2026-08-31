import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaFichaTecnica } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { FichaTecnica } from '../types/trazabilidad'

const CATEGORIAS = [
  '1 Res',
  '2 Cerdo',
  '3 Viscera',
  '4 Pollo',
  '5 Pescado',
  '6 Embutidos',
  '7 Otros',
]

const formVacio = (): NuevaFichaTecnica => ({
  nombre: '',
  ficha: '',
  diasVencimiento: undefined,
})

export function FichasTecnicas() {
  const [fichas, setFichas] = useState<FichaTecnica[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaFichaTecnica>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<FichaTecnica | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setFichas(await api.getFichas())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar fichas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.nombre.trim() !== '', [form])

  const grupos = useMemo(() => {
    const orden = [...CATEGORIAS, 'Sin categoria']
    const mapa = new Map<string, FichaTecnica[]>()
    for (const f of fichas) {
      const cat = f.ficha?.trim() || 'Sin categoria'
      if (!mapa.has(cat)) mapa.set(cat, [])
      mapa.get(cat)!.push(f)
    }
    return orden
      .filter((cat) => mapa.has(cat))
      .map((cat) => ({
        categoria: cat,
        fichas: mapa
          .get(cat)!
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
  }, [fichas])

  function actualizar<K extends keyof NuevaFichaTecnica>(
    campo: K,
    valor: NuevaFichaTecnica[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(ficha: FichaTecnica) {
    setEditandoId(ficha.id)
    setForm({
      nombre: ficha.nombre,
      ficha: ficha.ficha,
      diasVencimiento: ficha.diasVencimiento,
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
      const datos: NuevaFichaTecnica = {
        nombre: form.nombre.trim(),
        ficha: form.ficha.trim(),
        diasVencimiento: form.diasVencimiento,
      }
      if (editandoId) {
        const actualizada = await api.actualizarFicha(editandoId, datos)
        setFichas((prev) =>
          prev
            .map((f) => (f.id === editandoId ? actualizada : f))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creada = await api.crearFicha(datos)
        setFichas((prev) =>
          [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la ficha',
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
      await api.eliminarFicha(aEliminar.id, password)
      setFichas((prev) => prev.filter((f) => f.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fichas tecnicas</h2>
          <p className="text-slate-500">Catalogo de fichas tecnicas</p>
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
            {editandoId ? 'Editar ficha tecnica' : 'Nueva ficha tecnica'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Nombre">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                placeholder="Nombre de la ficha"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Dias de vencimiento">
              <input
                type="number"
                min="0"
                value={form.diasVencimiento ?? ''}
                onChange={(e) =>
                  actualizar(
                    'diasVencimiento',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="30"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <Campo label="Categoria">
            <select
              value={form.ficha}
              onChange={(e) => actualizar('ficha', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Selecciona una categoria</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>

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
                  : 'Crear ficha tecnica'}
            </button>
          </div>
        </form>
      )}

      <div className="max-h-[60vh] space-y-6 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {grupos.map(({ categoria, fichas: fichasCat }) => (
          <section key={categoria}>
            <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
                {categoria}
              </h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {fichasCat.length}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Dias de vencimiento</th>
                  <th className="px-4 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fichasCat.map((ficha) => (
                  <tr key={ficha.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {ficha.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ficha.diasVencimiento != null
                        ? `${ficha.diasVencimiento} dias`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => abrirEdicion(ficha)}
                          className="text-brand-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setErrorEliminar(null)
                            setAEliminar(ficha)
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {grupos.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400">
            {cargando
              ? 'Cargando fichas...'
              : error
                ? `Error: ${error}`
                : 'Sin fichas tecnicas registradas.'}
          </p>
        )}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar ficha tecnica"
          descripcion={`Vas a eliminar la ficha "${aEliminar.nombre}".`}
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
