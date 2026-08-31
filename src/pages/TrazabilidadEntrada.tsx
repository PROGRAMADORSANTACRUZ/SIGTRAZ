import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

interface Traza {
  id: string
  fecha: string
  loteCodigo: string
  loteExterno: string | null
  cantidad: number
  almacen: string
  responsable: string
  documento: string | null
  notas: string | null
  fechaVencimiento: string | null
  fechaBeneficio: string | null
  fechaEmpaque: string | null
  vehPisos: string | null
  vehParedes: string | null
  vehTechos: string | null
  vehCortinas: string | null
  organolepticas: string | null
  tempProducto: number | null
  tempVehiculo: number | null
  placa: string | null
  producto: {
    nombre: string | null
    sku: string | null
    categoria: string | null
    unidad: string | null
  }
  proveedor: {
    nombre: string
    nit: string | null
    telefono: string | null
    direccion: string | null
    email: string | null
    contacto: string | null
  }
}

function fmtFecha(valor?: string | null): string {
  if (!valor) return '—'
  const soloFecha = valor.slice(0, 10)
  const [a, m, d] = soloFecha.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

export function TrazabilidadEntrada() {
  const { id } = useParams<{ id: string }>()
  const [traza, setTraza] = useState<Traza | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')

  useEffect(() => {
    let activo = true
    setEstado('cargando')
    fetch(`${API_URL}/trazabilidad/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('no encontrado')
        return r.json()
      })
      .then((datos: Traza) => {
        if (activo) {
          setTraza(datos)
          setEstado('ok')
        }
      })
      .catch(() => {
        if (activo) setEstado('error')
      })
    return () => {
      activo = false
    }
  }, [id])

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        {/* Encabezado de marca */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-5 text-center text-white">
          <img
            src="/logo.jpg"
            alt="Carnes Santacruz"
            className="mx-auto mb-2 h-16 w-auto rounded bg-white/90 p-1 object-contain"
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
            Trazabilidad del producto
          </p>
        </div>

        {estado === 'cargando' && (
          <p className="px-6 py-10 text-center text-slate-500">
            Cargando información…
          </p>
        )}

        {estado === 'error' && (
          <p className="px-6 py-10 text-center text-slate-500">
            No se encontró el registro solicitado.
          </p>
        )}

        {estado === 'ok' && traza && (
          <div className="space-y-5 px-6 py-6">
            {/* Producto */}
            <div className="text-center">
              <h1 className="text-2xl font-extrabold uppercase leading-tight text-slate-800">
                {traza.producto.nombre ?? 'Producto'}
              </h1>
              {traza.producto.categoria && (
                <p className="text-sm text-slate-500">
                  {traza.producto.categoria}
                </p>
              )}
            </div>

            {/* Lote y cantidad */}
            <div className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Lote" valor={traza.loteCodigo} mono />
              <Dato
                etiqueta="Cantidad"
                valor={`${traza.cantidad} ${traza.producto.unidad ?? ''}`.trim()}
              />
            </div>

            {/* Fechas */}
            <Seccion titulo="Fechas">
              <Dato
                etiqueta="Fecha de procesamiento"
                valor={fmtFecha(traza.fechaEmpaque)}
              />
              <Dato
                etiqueta="Fecha de sacrificio"
                valor={fmtFecha(traza.fechaBeneficio)}
              />
              <Dato
                etiqueta="Fecha de vencimiento"
                valor={fmtFecha(traza.fechaVencimiento)}
                destacado
              />
              <Dato
                etiqueta="Fecha de registro"
                valor={new Date(traza.fecha).toLocaleDateString('es')}
              />
            </Seccion>

            {/* Empresa que lo procesó */}
            <Seccion titulo="Procesado por">
              <Dato etiqueta="Empresa" valor={traza.proveedor.nombre} />
              {traza.proveedor.nit && (
                <Dato etiqueta="NIT" valor={traza.proveedor.nit} />
              )}
              {traza.proveedor.direccion && (
                <Dato etiqueta="Dirección" valor={traza.proveedor.direccion} />
              )}
              {traza.proveedor.telefono && (
                <Dato etiqueta="Teléfono" valor={traza.proveedor.telefono} />
              )}
              {traza.proveedor.email && (
                <Dato etiqueta="Email" valor={traza.proveedor.email} />
              )}
            </Seccion>

            {/* Recepción */}
            <Seccion titulo="Recepción">
              {traza.loteExterno && (
                <Dato etiqueta="Lote externo" valor={traza.loteExterno} />
              )}
              <Dato etiqueta="Almacén" valor={traza.almacen} />
              <Dato etiqueta="Responsable" valor={traza.responsable} />
              {traza.placa && <Dato etiqueta="Placa" valor={traza.placa} />}
              {traza.tempProducto != null && (
                <Dato
                  etiqueta="Temp. producto"
                  valor={`${traza.tempProducto} °C`}
                />
              )}
              {traza.tempVehiculo != null && (
                <Dato
                  etiqueta="Temp. vehículo"
                  valor={`${traza.tempVehiculo} °C`}
                />
              )}
              {traza.notas && (
                <Dato etiqueta="Observaciones" valor={traza.notas} />
              )}
            </Seccion>

            <p className="pt-2 text-center text-[11px] text-slate-400">
              Registro #{traza.id} · SIGTRAZ
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function Dato({
  etiqueta,
  valor,
  mono = false,
  destacado = false,
}: {
  etiqueta: string
  valor: string
  mono?: boolean
  destacado?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-xs text-slate-500">{etiqueta}</span>
      <span
        className={`text-right text-sm font-semibold ${
          destacado ? 'text-red-600' : 'text-slate-800'
        } ${mono ? 'font-mono' : ''}`}
      >
        {valor}
      </span>
    </div>
  )
}
