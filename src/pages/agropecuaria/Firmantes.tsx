import { useMemo, useState } from 'react'
import { inputClase } from '../../components/ui'
import {
  cargarFirmantes,
  cargarSucursales,
  guardarFirmantes,
  type Firmante,
} from './sucursalesStore'

function formVacio(): Firmante {
  return { id: '', nombre: '', cargo: '', sucursal: '' }
}

export function Firmantes() {
  const [firmantes, setFirmantes] = useState<Firmante[]>(cargarFirmantes)
  const [sucursales] = useState(cargarSucursales)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<Firmante>(formVacio)
  const [editando, setEditando] = useState<string | null>(null)

  function persistir(lista: Firmante[]) {
    setFirmantes(lista)
    guardarFirmantes(lista)
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return firmantes
    return firmantes.filter(
      (f) =>
        f.nombre.toLowerCase().includes(q) ||
        f.cargo.toLowerCase().includes(q) ||
        f.sucursal.toLowerCase().includes(q),
    )
  }, [firmantes, busqueda])

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    const nombre = form.nombre.trim().toUpperCase()
    if (!nombre) return
    const registro: Firmante = {
      id: editando ?? crypto.randomUUID(),
      nombre,
      cargo: form.cargo.trim(),
      sucursal: form.sucursal.trim(),
    }
    if (editando !== null) {
      persistir(firmantes.map((f) => (f.id === editando ? registro : f)))
    } else {
      persistir(
        [...firmantes, registro].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      )
    }
    setForm(formVacio())
    setEditando(null)
  }

  function editar(f: Firmante) {
    setForm(f)
    setEditando(f.id)
  }

  function eliminar(f: Firmante) {
    persistir(firmantes.filter((x) => x.id !== f.id))
    if (editando === f.id) {
      setForm(formVacio())
      setEditando(null)
    }
  }

  function cancelar() {
    setForm(formVacio())
    setEditando(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Firmantes
        </h2>
        <p className="text-slate-500">
          Firmantes del certificado de calidad con su cargo y sucursal.
        </p>
      </header>

      <form
        onSubmit={guardar}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Nombre
          </span>
          <input
            className={`${inputClase} uppercase`}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Cargo</span>
          <input
            className={`${inputClase} uppercase`}
            value={form.cargo}
            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Sucursal
          </span>
          <select
            data-no-upper
            className={inputClase}
            value={form.sucursal}
            onChange={(e) => setForm({ ...form, sucursal: e.target.value })}
          >
            <option value="">Sin sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.nombre}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {editando !== null ? 'Guardar' : 'Agregar'}
          </button>
          {editando !== null && (
            <button
              type="button"
              onClick={cancelar}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <input
            className={`${inputClase} max-w-xs`}
            placeholder="Buscar por nombre, cargo o sucursal..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {filtrados.length} de {firmantes.length}
          </span>
        </div>

        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">No.</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Cargo</th>
                <th className="px-4 py-2">Sucursal</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Sin resultados
                  </td>
                </tr>
              ) : (
                filtrados.map((f, i) => (
                  <tr key={f.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2 text-slate-700">{f.nombre}</td>
                    <td className="px-4 py-2 text-slate-500">{f.cargo}</td>
                    <td className="px-4 py-2 text-slate-500">{f.sucursal}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => editar(f)}
                          className="text-slate-300 hover:text-brand-600 group-hover:text-slate-400"
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(f)}
                          className="text-slate-300 hover:text-red-600 group-hover:text-slate-400"
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
