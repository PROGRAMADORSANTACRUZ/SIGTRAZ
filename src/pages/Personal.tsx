import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoPersonal } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorBuscable } from '../components/SelectorBuscable'
import type { Personal as PersonalTipo, PuntoVenta } from '../types/trazabilidad'

interface FormPersonal {
  cedula: string
  nombres: string
  puntoVenta: string
}

const formVacio = (): FormPersonal => ({
  cedula: '',
  nombres: '',
  puntoVenta: '',
})

export function Personal() {
  const [registros, setRegistros] = useState<PersonalTipo[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormPersonal>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<PersonalTipo | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, pdv] = await Promise.all([
        api.getPersonal(),
        api.getPuntosVenta(),
      ])
      setRegistros(datos)
      setPuntosVenta(pdv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar personal')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(
    () => form.cedula.trim() !== '' && form.nombres.trim() !== '',
    [form],
  )

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.cedula ?? '').toLowerCase().includes(t) ||
        (r.nombres ?? '').toLowerCase().includes(t) ||
        (r.puntoVenta ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormPersonal>(
    campo: K,
    valor: FormPersonal[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: PersonalTipo) {
    setEditandoId(r.id)
    setForm({
      cedula: r.cedula ?? '',
      nombres: r.nombres ?? '',
      puntoVenta: r.puntoVenta ?? '',
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
      const datos: NuevoPersonal = {
        cedula: form.cedula.trim(),
        nombres: form.nombres.trim(),
        puntoVenta: form.puntoVenta.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarPersonal(editandoId, datos)
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearPersonal(datos)
        setRegistros((prev) => [...prev, creado])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el personal',
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
      await api.eliminarPersonal(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el personal',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Personal</h2>
          <p className="text-slate-500">
            Directorio de personal por punto de venta.
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
            {editandoId ? 'Editar personal' : 'Nuevo personal'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Cedula *">
              <input
                value={form.cedula}
                onChange={(e) => actualizar('cedula', e.target.value)}
                placeholder="Numero de cedula"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Nombres y apellidos *">
              <input
                value={form.nombres}
                onChange={(e) => actualizar('nombres', e.target.value)}
                placeholder="Nombres y apellidos"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Punto de venta">
              <SelectorBuscable
                opciones={puntosVenta.map((p) => p.pdv)}
                value={form.puntoVenta}
                onChange={(v) => actualizar('puntoVenta', v)}
                placeholder="Selecciona un PDV"
                buscarPlaceholder="Buscar punto de venta..."
                permitirLibre
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
                  : 'Crear personal'}
            </button>
          </div>
        </form>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cedula, nombre o punto de venta..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
      />

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Cedula</th>
              <th className="px-4 py-3 font-medium">Nombres y apellidos</th>
              <th className="px-4 py-3 font-medium">Punto de venta</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrosFiltrados.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.cedula ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.nombres ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.puntoVenta ?? '-'}
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
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando personal...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin personal registrado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar personal"
          descripcion={`Vas a eliminar a "${aEliminar.nombres ?? aEliminar.cedula}".`}
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
