import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { usePuntoVenta } from '../store/PuntoVentaContext'
import {
  cargarNotificaciones,
  type Notificacion,
} from '../store/notificacionesStore'
import {
  trasladosPendientes,
  marcarTrasladoLeido,
  type Traslado,
} from '../store/trasladosStore'
import { imprimirCertificadoTraslado } from '../utils/certificadoTraslado'

function AvisosCertificados() {
  const navigate = useNavigate()
  const { esAdmin, disponibles, activo } = usePuntoVenta()
  const [notis, setNotis] = useState<Notificacion[]>(cargarNotificaciones)

  useEffect(() => {
    const refrescar = () => setNotis(cargarNotificaciones())
    window.addEventListener('focus', refrescar)
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener('focus', refrescar)
      window.removeEventListener('storage', refrescar)
    }
  }, [])

  const pdvActivo = disponibles.find((p) => Number(p.id) === activo)
  const tiendaActiva = (pdvActivo?.pdv ?? '').trim().toUpperCase()

  const visibles = notis.filter((n) => {
    // Administrador viendo "Todos": ve todas las notificaciones.
    if (esAdmin && activo == null) return true
    return (n.tienda ?? '').trim().toUpperCase() === tiendaActiva
  })

  const pendientes = visibles.filter((n) => !n.usada)
  const ingresadas = visibles.filter((n) => n.usada)

  return (
    <section className="space-y-2">
      {pendientes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Sin certificados pendientes.
        </div>
      ) : (
        pendientes.map((n) => (
          <div
            key={n.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </span>
              <div>
                <p className="font-semibold text-emerald-900">{n.titulo}</p>
                <p className="text-sm text-emerald-800">{n.mensaje}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/entradas?cert=${encodeURIComponent(n.numero)}`)
              }
              className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Ingresar
            </button>
          </div>
        ))
      )}

      {ingresadas.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Certificados ingresados
          </p>
          {ingresadas.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{n.titulo}</p>
                  <p className="text-sm text-slate-600">{n.mensaje}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">
                OK
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA')
}

interface CertificadoPunto {
  id: string
  numero?: string
  tienda?: string
  fecha?: string
}

function CertificadosPorPunto() {
  const { disponibles } = usePuntoVenta()
  const [certs, setCerts] = useState<CertificadoPunto[]>([])

  useEffect(() => {
    const leer = () => {
      try {
        const raw = localStorage.getItem('agro_certificados')
        setCerts(raw ? (JSON.parse(raw) as CertificadoPunto[]) : [])
      } catch {
        setCerts([])
      }
    }
    leer()
    window.addEventListener('focus', leer)
    window.addEventListener('storage', leer)
    return () => {
      window.removeEventListener('focus', leer)
      window.removeEventListener('storage', leer)
    }
  }, [])

  // Solo los puntos de venta asignados al usuario (el Administrador los ve todos).
  const puntosPermitidos = useMemo(
    () => new Set(disponibles.map((p) => (p.pdv ?? '').trim().toUpperCase())),
    [disponibles],
  )

  const porPunto = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const c of certs) {
      const punto = (c.tienda ?? '').trim()
      if (!punto) continue
      if (!puntosPermitidos.has(punto.toUpperCase())) continue
      mapa.set(punto, (mapa.get(punto) ?? 0) + 1)
    }
    return Array.from(mapa.entries())
      .map(([punto, total]) => ({ punto, total }))
      .sort((a, b) => b.total - a.total)
  }, [certs, puntosPermitidos])

  const maxTotal = Math.max(1, ...porPunto.map((p) => p.total))
  const totalGeneral = porPunto.reduce((a, p) => a + p.total, 0)

  return (
    <section className="space-y-6">
      <header>
        <h3 className="text-xl font-bold text-slate-900">
          Certificados de calidad por puntos de ventas
        </h3>
        <p className="text-slate-500">
          {totalGeneral} certificado{totalGeneral === 1 ? '' : 's'} emitido
          {totalGeneral === 1 ? '' : 's'} en total
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {porPunto.length === 0 ? (
          <p className="text-sm text-slate-400">Sin certificados registrados.</p>
        ) : (
          <div className="space-y-4">
            {porPunto.map((p) => (
              <div key={p.punto} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {p.punto}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700 tabular-nums">
                    {p.total}
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(p.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

interface ConFecha {
  fecha?: string
}

const MODULOS = [
  { clave: 'entradas', titulo: 'Entradas', color: '#2563eb' },
  { clave: 'acondicionamientos', titulo: 'Acondicionamientos', color: '#d97706' },
  { clave: 'salidas', titulo: 'Salidas', color: '#16a34a' },
  { clave: 'devoluciones', titulo: 'Devoluciones', color: '#dc2626' },
] as const

function ResumenMovimientos() {
  const [datos, setDatos] = useState<Record<string, ConFecha[]>>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    async function cargar() {
      try {
        const [entradas, acondicionamientos, salidas, devoluciones] =
          await Promise.all([
            api.getEntradas(),
            api.getAcondicionamientos(),
            api.getSalidas(),
            api.getDevoluciones(),
          ])
        if (!vivo) return
        setDatos({ entradas, acondicionamientos, salidas, devoluciones })
      } catch {
        if (vivo) setDatos({})
      } finally {
        if (vivo) setCargando(false)
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
  }, [])

  const hoy = hoyISO()

  const resumen = useMemo(
    () =>
      MODULOS.map((m) => {
        const lista = datos[m.clave] ?? []
        const deHoy = lista.filter(
          (r) => String(r.fecha ?? '').slice(0, 10) === hoy,
        ).length
        return { ...m, total: lista.length, hoy: deHoy }
      }),
    [datos, hoy],
  )

  const maxTotal = Math.max(1, ...resumen.map((r) => r.total))

  // Actividad de los ultimos 7 dias por modulo.
  const dias = useMemo(() => {
    const base = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() - (6 - i))
      return d.toLocaleDateString('en-CA')
    })
  }, [])

  const actividad = useMemo(
    () =>
      dias.map((dia) => {
        const conteos: Record<string, number> = {}
        for (const m of MODULOS) {
          conteos[m.clave] = (datos[m.clave] ?? []).filter(
            (r) => String(r.fecha ?? '').slice(0, 10) === dia,
          ).length
        }
        const total = Object.values(conteos).reduce((a, b) => a + b, 0)
        return { dia, conteos, total }
      }),
    [dias, datos],
  )

  const maxDia = Math.max(1, ...actividad.map((a) => a.total))

  return (
    <section className="space-y-6">
      <header>
        <h3 className="text-xl font-bold text-slate-900">Movimientos</h3>
        <p className="text-slate-500">
          Entradas, acondicionamientos, salidas y devoluciones
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {resumen.map((m) => (
          <div
            key={m.clave}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <p className="text-sm text-slate-500">{m.titulo}</p>
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {cargando ? '…' : m.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">Hoy: {cargando ? '…' : m.hoy}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 font-semibold text-slate-800">Total por módulo</p>
          <div className="space-y-3">
            {resumen.map((m) => (
              <div key={m.clave} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-slate-600">
                  {m.titulo}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(m.total / maxTotal) * 100}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-700 tabular-nums">
                  {m.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 font-semibold text-slate-800">
            Actividad últimos 7 días
          </p>
          <div className="flex h-40 items-end justify-between gap-2">
            {actividad.map((a) => (
              <div
                key={a.dia}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${a.total} movimientos`}
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t bg-brand-500 transition-all"
                    style={{ height: `${(a.total / maxDia) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-600 tabular-nums">
                  {a.total}
                </span>
                <span className="text-[10px] text-slate-400">
                  {a.dia.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrasladosRecibidos() {
  const { esAdmin, disponibles, activo } = usePuntoVenta()
  const [traslados, setTraslados] = useState<Traslado[]>([])

  const pdvActivo = disponibles.find((p) => Number(p.id) === activo)
  const tiendaActiva = (pdvActivo?.pdv ?? '').trim()

  useEffect(() => {
    const refrescar = () =>
      setTraslados(tiendaActiva ? trasladosPendientes(tiendaActiva) : [])
    refrescar()
    window.addEventListener('focus', refrescar)
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener('focus', refrescar)
      window.removeEventListener('storage', refrescar)
    }
  }, [tiendaActiva])

  // Los traslados van dirigidos a un punto concreto; el admin en "Todos" no
  // tiene punto activo, por lo que no se muestran hasta elegir uno.
  if (esAdmin && activo == null) return null
  if (traslados.length === 0) return null

  function verCertificado(t: Traslado) {
    imprimirCertificadoTraslado(t)
    marcarTrasladoLeido(t.id)
    setTraslados((prev) => prev.filter((x) => x.id !== t.id))
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Traslados recibidos
      </p>
      {traslados.map((t) => (
        <div
          key={t.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              ⇄
            </span>
            <div>
              <p className="font-semibold text-indigo-900">
                Certificado de traslado
              </p>
              <p className="text-sm text-indigo-800">
                {t.producto}
                {t.cantidad != null
                  ? ` · ${t.cantidad}${t.unidad ? ` ${t.unidad}` : ''}`
                  : ''}{' '}
                desde {t.origen}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => verCertificado(t)}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ver certificado
          </button>
        </div>
      ))}
    </section>
  )
}

export function Dashboard() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Resumen de la trazabilidad</p>
      </header>

      <AvisosCertificados />

      <TrasladosRecibidos />

      <CertificadosPorPunto />

      <ResumenMovimientos />
    </div>
  )
}
