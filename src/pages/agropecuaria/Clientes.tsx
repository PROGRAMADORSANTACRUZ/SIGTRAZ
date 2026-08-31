import { useMemo, useState } from 'react'
import { inputClase } from '../../components/ui'
import { clientesSeed, type ClienteAgro } from './clientesSeed'

const STORAGE_KEY = 'agro_clientes'

function cargar(): ClienteAgro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ClienteAgro[]
  } catch {
    // ignora datos corruptos
  }
  return clientesSeed
}

function formVacio(): ClienteAgro {
  return { codigo: '', nit: '', nombre: '' }
}

export function Clientes() {
  const [clientes, setClientes] = useState<ClienteAgro[]>(cargar)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<ClienteAgro>(formVacio)
  const [editando, setEditando] = useState<string | null>(null)

  function persistir(lista: ClienteAgro[]) {
    setClientes(lista)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.nit.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q),
    )
  }, [clientes, busqueda])

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    const nombre = form.nombre.trim().toUpperCase()
    if (!nombre) return
    const registro: ClienteAgro = {
      codigo: form.codigo.trim(),
      nit: form.nit.trim(),
      nombre,
    }
    if (editando !== null) {
      persistir(clientes.map((c) => (c.nit === editando ? registro : c)))
    } else {
      persistir(
        [...clientes, registro].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      )
    }
    setForm(formVacio())
    setEditando(null)
  }

  function editar(c: ClienteAgro) {
    setForm(c)
    setEditando(c.nit)
  }

  function eliminar(c: ClienteAgro) {
    persistir(clientes.filter((x) => x.nit !== c.nit))
    if (editando === c.nit) {
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
          Clientes
        </h2>
        <p className="text-slate-500">Directorio de clientes de Agropecuaria.</p>
      </header>

      <form
        onSubmit={guardar}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[10rem_10rem_1fr_auto] md:items-end"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Codigo</span>
          <input
            className={inputClase}
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            N.I.T / C.C
          </span>
          <input
            className={inputClase}
            value={form.nit}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Cliente</span>
          <input
            className={`${inputClase} uppercase`}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
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
            placeholder="Buscar por cliente, NIT o codigo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {filtrados.length} de {clientes.length}
          </span>
        </div>

        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">No.</th>
                <th className="px-4 py-2">Codigo</th>
                <th className="px-4 py-2">N.I.T / C.C</th>
                <th className="px-4 py-2">Cliente</th>
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
                filtrados.map((c, i) => (
                  <tr key={c.nit + c.codigo} className="group hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">
                      {c.codigo}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-500">
                      {c.nit}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{c.nombre}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => editar(c)}
                          className="text-slate-300 hover:text-brand-600 group-hover:text-slate-400"
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(c)}
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
