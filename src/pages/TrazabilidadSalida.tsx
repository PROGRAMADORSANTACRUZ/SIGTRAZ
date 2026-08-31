import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

interface Traza {
  id: string
  fecha: string | null
  producto: string
  lote: string | null
  loteInterno: string | null
  cantidad: number | null
  unidad: string | null
  destino: string | null
  responsable: string | null
  documento: string | null
  observaciones: string | null
  fechaVencimiento: string | null
  productoInfo: {
    nombre: string | null
    sku: string | null
    categoria: string | null
    unidad: string | null
  }
}

function fmtFecha(valor?: string | null): string {
  if (!valor) return '—'
  const soloFecha = valor.slice(0, 10)
  const [a, m, d] = soloFecha.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

export function TrazabilidadSalida() {
  const { id } = useParams<{ id: string }>()
  const [traza, setTraza] = useState<Traza | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')

  useEffect(() => {
    let activo = true
    setEstado('cargando')
    fetch(`${API_URL}/trazabilidad/salida/${id}`)
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
            Trazabilidad de salida
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
                {traza.producto ?? 'Producto'}
              </h1>
              {traza.productoInfo.categoria && (
                <p className="text-sm text-slate-500">
                  {traza.productoInfo.categoria}
                </p>
              )}
            </div>

            {/* Lote y cantidad */}
            <div className="grid grid-cols-2 gap-3">
              <Dato
                etiqueta="Lote interno"
                valor={traza.loteInterno ?? '—'}
                mono
              />
              <Dato
                etiqueta="Cantidad"
                valor={
                  traza.cantidad != null
                    ? `${traza.cantidad} ${traza.unidad ?? ''}`.trim()
                    : '—'
                }
              />
            </div>

            {/* Salida */}
            <Seccion titulo="Salida">
              {traza.lote && <Dato etiqueta="Lote" valor={traza.lote} />}
              {traza.destino && (
                <Dato etiqueta="Destino" valor={traza.destino} />
              )}
              {traza.documento && (
                <Dato etiqueta="Documento" valor={traza.documento} />
              )}
              {traza.responsable && (
                <Dato etiqueta="Responsable" valor={traza.responsable} />
              )}
            </Seccion>

            {/* Fechas */}
            <Seccion titulo="Fechas">
              <Dato
                etiqueta="Fecha de salida"
                valor={
                  traza.fecha
                    ? new Date(traza.fecha).toLocaleDateString('es')
                    : fmtFecha(traza.fecha)
                }
              />
              <Dato
                etiqueta="Fecha de vencimiento"
                valor={fmtFecha(traza.fechaVencimiento)}
                destacado
              />
            </Seccion>

            {traza.observaciones && (
              <Seccion titulo="Observaciones">
                <Dato etiqueta="Notas" valor={traza.observaciones} />
              </Seccion>
            )}

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
