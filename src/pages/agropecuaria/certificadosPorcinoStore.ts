import { useSyncExternalStore } from 'react'

export interface HallazgoCertificado {
  organo: string
  patologia: string
  dictamen: string
  cantidad: string
  gancho: string
}

export interface CertificadoDecomiso {
  id: string
  consecutivo: number
  fechaEmision: string
  fechaCertificado: string
  fechaSacrificio: string
  cliente: string
  lote: string
  totalAnimales: number
  tipoAnimales: string
  hallazgos: HallazgoCertificado[]
  imagenes: string[]
  contenido: string
  usuario: string
}

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

// Datos fijos del certificado de decomiso (segun modelo del frigorifico).
const FRIGORIFICO = 'Frigorifico Agropecuaria Santacruz'
const CIUDAD_CERT = 'Malambo'

export function mesDe(fecha: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m) return ''
  return MESES[Number(m[2]) - 1] ?? ''
}

// Convierte 2026-08-18 en "18 de agosto de 2026".
export function fechaLarga(fecha: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m) return fecha
  const dia = Number(m[3])
  const mes = (MESES[Number(m[2]) - 1] ?? '').toLowerCase()
  return `${dia} de ${mes} de ${m[1]}`
}

export interface DatosContenido {
  consecutivo: number
  fechaCertificado: string
  fechaSacrificio: string
  cliente: string
  lote: string
  totalAnimales: number
  tipoAnimales: string
  hallazgos: HallazgoCertificado[]
  imagenes?: string[]
}

// Construye el HTML editable del certificado a partir de los datos estructurados.
export function construirContenido(d: DatosContenido): string {
  const escapar = (v: unknown) =>
    String(v ?? '').replace(/[&<>]/g, (c) =>
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;',
    )
  const sexo = (d.tipoAnimales || '').replace(/S$/, '')
  const totalTxt = d.totalAnimales > 0 ? `${d.totalAnimales} ` : ''
  const filas = d.hallazgos
    .map(
      (r) =>
        `<tr><td class="c">${escapar(d.lote)}</td><td>${escapar(
          d.cliente,
        )}</td><td class="c">${escapar(r.gancho)}</td><td>${escapar(
          r.organo,
        )}</td><td>${escapar(r.patologia)}</td><td class="c">${escapar(
          r.cantidad,
        )}</td><td class="c">${escapar(sexo)}</td><td class="c">${escapar(
          r.dictamen,
        )}</td></tr>`,
    )
    .join('')
  const diaCert =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.fechaCertificado)?.[3]?.replace(
      /^0/,
      '',
    ) ?? ''
  return (
    `<div class="consecutivo">Certificado N° ${formatoConsecutivo(
      d.consecutivo,
    )}</div>` +
    `<div class="fecha">${CIUDAD_CERT}, ${fechaLarga(d.fechaCertificado)}.</div>` +
    `<p class="intro">El suscrito Médico Veterinario de ${FRIGORIFICO} Ltda.</p>` +
    `<p class="subintro">certifica que</p>` +
    `<p>El día ${fechaLarga(
      d.fechaSacrificio,
    )}, ingresan a la planta ${totalTxt}${escapar(
      d.tipoAnimales,
    )} del cliente <strong>${escapar(
      d.cliente,
    )}</strong> y se realizaron decomisos con los siguientes hallazgos:</p>` +
    `<table><thead><tr><th>LOTE</th><th>CLIENTE</th><th>TURNO</th><th>ÓRGANO</th><th>PATOLOGÍA</th><th class="c">CANTIDAD</th><th>SEXO</th><th>DICTAMEN</th></tr></thead><tbody>${filas}</tbody></table>` +
    `<p>Se hace constancia a los ${diaCert} días del mes de ${mesDe(
      d.fechaCertificado,
    ).toLowerCase()} de ${d.fechaCertificado.slice(0, 4)}.</p>` +
    ((d.imagenes ?? []).length
      ? `<div class="fotos"><div class="fotos-titulo">EVIDENCIA FOTOGRÁFICA</div><div class="fotos-grid">${(
          d.imagenes ?? []
        )
          .map((src) => `<img src="${src}" alt="evidencia"/>`)
          .join('')}</div></div>`
      : '')
  )
}

const STORAGE_KEY = 'agro_certificados_decomiso_porcino'

let certificados: CertificadoDecomiso[] = leerInicial()
const listeners = new Set<() => void>()

function leerInicial(): CertificadoDecomiso[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function persistir() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certificados))
  listeners.forEach((l) => l())
}

// Devuelve el siguiente consecutivo (maximo actual + 1).
export function siguienteConsecutivo(): number {
  return certificados.reduce((max, c) => Math.max(max, c.consecutivo), 0) + 1
}

export function agregarCertificado(
  datos: Omit<CertificadoDecomiso, 'id' | 'consecutivo' | 'fechaEmision'>,
): CertificadoDecomiso {
  const nuevo: CertificadoDecomiso = {
    ...datos,
    id: crypto.randomUUID(),
    consecutivo: siguienteConsecutivo(),
    fechaEmision: new Date().toLocaleString('es-CO'),
  }
  certificados = [nuevo, ...certificados]
  persistir()
  return nuevo
}

export function actualizarContenido(id: string, contenido: string) {
  certificados = certificados.map((c) =>
    c.id === id ? { ...c, contenido } : c,
  )
  persistir()
}

type DatosEditables = Pick<
  CertificadoDecomiso,
  | 'fechaCertificado'
  | 'fechaSacrificio'
  | 'cliente'
  | 'lote'
  | 'totalAnimales'
  | 'tipoAnimales'
  | 'hallazgos'
  | 'imagenes'
>

// Actualiza los datos estructurados y regenera el contenido del certificado.
export function actualizarCertificado(
  id: string,
  datos: DatosEditables,
): CertificadoDecomiso | undefined {
  certificados = certificados.map((c) =>
    c.id === id
      ? {
          ...c,
          ...datos,
          contenido: construirContenido({
            consecutivo: c.consecutivo,
            fechaCertificado: datos.fechaCertificado,
            fechaSacrificio: datos.fechaSacrificio,
            cliente: datos.cliente,
            lote: datos.lote,
            totalAnimales: datos.totalAnimales,
            tipoAnimales: datos.tipoAnimales,
            hallazgos: datos.hallazgos,
            imagenes: datos.imagenes,
          }),
        }
      : c,
  )
  persistir()
  return certificados.find((c) => c.id === id)
}

// Busca un certificado ya emitido para un lote y fecha de sacrificio dados.
export function buscarCertificadoPorLote(
  lote: string,
  fechaSacrificio: string,
): CertificadoDecomiso | undefined {
  return certificados.find(
    (c) => c.lote === lote && c.fechaSacrificio === fechaSacrificio,
  )
}

export function eliminarCertificados(ids: Set<string>) {
  certificados = certificados.filter((c) => !ids.has(c.id))
  persistir()
}

export function useCertificados() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => certificados,
  )
}

// Formatea el consecutivo como CDP-1.
export function formatoConsecutivo(n: number): string {
  return `CDP-${n}`
}
