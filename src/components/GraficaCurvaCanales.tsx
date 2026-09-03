import { useMemo, useState } from 'react'

// Cada canal aporta sus lecturas; se unen todas en una sola curva en orden cronologico.
interface LecturaGrafica {
  fecha: string
  hora: string
  tcCanal: string
}

interface CanalGrafica {
  numero: string
  lecturas: LecturaGrafica[]
}

interface Props {
  titulo: string
  canales: CanalGrafica[]
  onCerrar: () => void
}

const W = 1140
const H = 540
const M = { top: 24, right: 24, bottom: 52, left: 48 }
const plotW = W - M.left - M.right
const plotH = H - M.top - M.bottom
const yMin = 0
const yMax = 42
const yStep = 3
const COLOR = '#0e7490'

// Clave ordenable: fecha ISO + hora normalizada a HH:MM.
function claveOrden(fecha: string, hora: string): string {
  const [h, m] = (hora || '').split(':')
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0')
  const mm = String(parseInt(m, 10) || 0).padStart(2, '0')
  return `${fecha} ${hh}:${mm}`
}

// Construye un trazo suave (Catmull-Rom -> Bezier) que pasa por todos los puntos.
function lineaSuave(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  if (pts.length < 3) return 'M ' + pts.map((p) => `${p[0]},${p[1]}`).join(' L ')
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

export function GraficaCurvaCanales({ titulo, canales, onCerrar }: Props) {
  const [limite, setLimite] = useState('7')

  // Todas las lecturas de todos los canales, ordenadas por fecha/hora.
  const puntos = useMemo(() => {
    const todas = canales
      .flatMap((c) =>
        c.lecturas.map((l) => ({
          canal: c.numero,
          fecha: l.fecha || '',
          hora: l.hora || '',
          t: parseFloat((l.tcCanal || '').replace(',', '.')),
        })),
      )
      .filter((p) => Number.isFinite(p.t))
    todas.sort((a, b) => claveOrden(a.fecha, a.hora).localeCompare(claveOrden(b.fecha, b.hora)))
    return todas
  }, [canales])

  const n = puntos.length
  const x = (i: number) => M.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (t: number) => M.top + plotH - ((t - yMin) / (yMax - yMin)) * plotH

  const lim = parseFloat(limite.replace(',', '.'))
  const gridY: number[] = []
  for (let t = yMin; t <= yMax; t += yStep) gridY.push(t)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCerrar}>
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800">{titulo}</h3>
          <button
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Límite (°C)
            <input
              type="number"
              step="0.5"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none"
            />
          </label>
          <span className="text-xs text-slate-500">
            Una sola línea con todas las lecturas en orden cronológico; cada punto muestra su temperatura.
          </span>
        </div>

        {n === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No hay temperaturas de canal registradas para graficar.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
              <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="#ffffff" stroke="#e2e8f0" />

              {gridY.map((t) => (
                <g key={`gy-${t}`}>
                  <line x1={M.left} y1={y(t)} x2={M.left + plotW} y2={y(t)} stroke="#eef2f7" />
                  <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                    {t.toFixed(1)}
                  </text>
                </g>
              ))}

              {puntos.map((_p, i) => (
                <g key={`gx-${i}`}>
                  <line x1={x(i)} y1={M.top + plotH} x2={x(i)} y2={M.top + plotH + 5} stroke="#cbd5e1" />
                  <text x={x(i)} y={M.top + plotH + 20} textAnchor="middle" fontSize="10" fill="#94a3b8">
                    {i + 1}
                  </text>
                </g>
              ))}
              <text x={M.left + plotW / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#64748b">
                Lectura
              </text>
              <text
                x={14}
                y={M.top + plotH / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
                transform={`rotate(-90 14 ${M.top + plotH / 2})`}
              >
                Temperatura (°C)
              </text>

              {Number.isFinite(lim) && lim >= yMin && lim <= yMax && (
                <g>
                  <line
                    x1={M.left}
                    y1={y(lim)}
                    x2={M.left + plotW}
                    y2={y(lim)}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <text x={M.left + plotW - 4} y={y(lim) - 5} textAnchor="end" fontSize="11" fill="#b45309">
                    Límite {lim.toFixed(1)}°C
                  </text>
                </g>
              )}

              <path
                d={lineaSuave(puntos.map((p, i) => [x(i), y(p.t)]))}
                fill="none"
                stroke={COLOR}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {puntos.map((p, i) => {
                const py = y(p.t)
                const arriba = py > 60
                return (
                  <g key={`pt-${i}`}>
                    <circle cx={x(i)} cy={py} r={3.5} fill="#fff" stroke={COLOR} strokeWidth={2} />
                    <text
                      x={x(i)}
                      y={arriba ? py - 8 : py + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#0f172a"
                    >
                      {p.t.toFixed(1)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
