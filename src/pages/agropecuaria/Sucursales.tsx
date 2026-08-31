import { useMemo, useState } from 'react'
import { inputClase } from '../../components/ui'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { api } from '../../services/api'
import { useCatalogo } from './catalogosStore'
import { firmadoresSeed } from './datosCatalogos'
import {
  cargarSucursales,
  guardarSucursales,
  type Sucursal,
} from './sucursalesStore'

function formVacio(): Sucursal {
  return {
    id: '',
    nombre: '',
    empresa: 'CARNES SANTACRUZ',
    direccion: '',
    telefono: '',
  }
}

export function Sucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>(cargarSucursales)
  const firmadores = useCatalogo('Firmadores', firmadoresSeed)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<Sucursal>(formVacio)
  const [editando, setEditando] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState('')

  function persistir(lista: Sucursal[]) {
    setSucursales(lista)
    guardarSucursales(lista)
  }

  async function importarPuntosVenta() {
    setImportando(true)
    setAviso('')
    try {
      const pdvs = await api.getPuntosVenta()
      const existentes = new Set(
        sucursales.map((s) => s.nombre.trim().toUpperCase()),
      )
      const nuevas: Sucursal[] = []
      for (const p of pdvs) {
        const nombre = (p.pdv ?? '').trim().toUpperCase()
        if (!nombre || existentes.has(nombre)) continue
        existentes.add(nombre)
        nuevas.push({
          id: crypto.randomUUID(),
          nombre,
          empresa: 'CARNES SANTACRUZ SAS',
          direccion: (p.direccion ?? '').trim(),
          telefono: (p.telefono ?? '').trim(),
        })
      }
      if (nuevas.length === 0) {
        setAviso('Todos los puntos de venta ya estan como sucursales.')
        return
      }
      persistir(
        [...sucursales, ...nuevas].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      )
      setAviso(`Se importaron ${nuevas.length} sucursal(es).`)
    } catch {
      setAviso('No se pudieron cargar los puntos de venta.')
    } finally {
      setImportando(false)
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return sucursales
    return sucursales.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        s.empresa.toLowerCase().includes(q) ||
        s.direccion.toLowerCase().includes(q) ||
        s.telefono.toLowerCase().includes(q),
    )
  }, [sucursales, busqueda])

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    const nombre = form.nombre.trim().toUpperCase()
    if (!nombre) return
    const registro: Sucursal = {
      id: editando ?? crypto.randomUUID(),
      nombre,
      empresa: form.empresa.trim().toUpperCase(),
      direccion: form.direccion.trim(),
      telefono: form.telefono.trim(),
    }
    if (editando !== null) {
      persistir(sucursales.map((s) => (s.id === editando ? registro : s)))
    } else {
      persistir(
        [...sucursales, registro].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      )
    }
    setForm(formVacio())
    setEditando(null)
  }

  function editar(s: Sucursal) {
    setForm({ ...s, empresa: s.empresa ?? '' })
    setEditando(s.id)
  }

  function amarrarTodasCarnes() {
    const empresa = 'CARNES SANTACRUZ SAS'
    if (sucursales.length === 0) {
      setAviso('No hay sucursales para asignar.')
      return
    }
    persistir(sucursales.map((s) => ({ ...s, empresa })))
    setAviso(`Se asigno el firmador ${empresa} a todas las sucursales.`)
  }

  function eliminar(s: Sucursal) {
    persistir(sucursales.filter((x) => x.id !== s.id))
    if (editando === s.id) {
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Sucursales
            </h2>
            <p className="text-slate-500">
              Directorio de sucursales con direccion y telefono.
            </p>
          </div>
          <button
            type="button"
            onClick={importarPuntosVenta}
            disabled={importando}
            className="rounded-md border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
          >
            {importando ? 'Importando...' : 'Importar de puntos de venta'}
          </button>
          <button
            type="button"
            onClick={amarrarTodasCarnes}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Firmador Carnes Santacruz SAS a todas
          </button>
        </div>
        {aviso && <p className="mt-2 text-sm text-brand-700">{aviso}</p>}
      </header>

      <form
        onSubmit={guardar}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_10rem_auto] md:items-end"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Sucursal
          </span>
          <input
            className={`${inputClase} uppercase`}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Firmador</span>
          <SelectorBuscable
            opciones={firmadores}
            value={form.empresa}
            onChange={(v) => setForm({ ...form, empresa: v })}
            permitirLibre
            placeholder="Selecciona firmador..."
            buscarPlaceholder="Buscar firmador..."
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Direccion
          </span>
          <input
            className={`${inputClase} uppercase`}
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Telefono
          </span>
          <input
            className={inputClase}
            data-no-upper
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
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
            placeholder="Buscar por sucursal, firmador, direccion o telefono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {filtrados.length} de {sucursales.length}
          </span>
        </div>

        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">No.</th>
                <th className="px-4 py-2">Sucursal</th>
                <th className="px-4 py-2">Firmador</th>
                <th className="px-4 py-2">Direccion</th>
                <th className="px-4 py-2">Telefono</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Sin resultados
                  </td>
                </tr>
              ) : (
                filtrados.map((s, i) => (
                  <tr key={s.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2 text-slate-700">{s.nombre}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {s.empresa || (
                        <span className="text-slate-300">Sin firmador</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{s.direccion}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">
                      {s.telefono}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => editar(s)}
                          className="text-slate-300 hover:text-brand-600 group-hover:text-slate-400"
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(s)}
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
