// Notificaciones del dashboard de Carnes Santacruz derivadas de los
// certificados de calidad emitidos en Agropecuaria. Se leen directamente de la
// clave `agro_certificados` (sincronizada entre dispositivos por agroSync), de
// modo que cualquier certificado guardado genera un aviso hasta marcarlo leido.
// Los IDs leidos se guardan en `agro_certificados_leidos` (tambien agro_* para
// que se sincronicen).

export interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tienda: string
  numero: string
  fecha: string
  // true cuando el certificado ya se uso para registrar una entrada.
  usada: boolean
}

const CERT_KEY = 'agro_certificados'
const LEIDOS_KEY = 'agro_certificados_leidos'
const USADOS_KEY = 'agro_certificados_usados'

function cargarLeidos(): string[] {
  try {
    const raw = localStorage.getItem(LEIDOS_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    // sin registros
  }
  return []
}

// Numeros de certificado ya usados en una entrada (para mostrar "OK").
function cargarUsados(): string[] {
  try {
    const raw = localStorage.getItem(USADOS_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    // sin registros
  }
  return []
}

interface CertificadoMin {
  id: string
  numero?: string
  tienda?: string
  fecha?: string
}

export function cargarNotificaciones(): Notificacion[] {
  let certs: CertificadoMin[] = []
  try {
    const raw = localStorage.getItem(CERT_KEY)
    if (raw) certs = JSON.parse(raw) as CertificadoMin[]
  } catch {
    certs = []
  }
  const leidos = new Set(cargarLeidos())
  const usados = new Set(
    cargarUsados().map((n) => n.trim().toUpperCase()),
  )
  return certs
    .filter((c) => c && c.id && (c.tienda ?? '').trim() && !leidos.has(c.id))
    .map((c) => ({
      id: c.id,
      titulo: 'Certificado de calidad Disponible',
      mensaje: `Certificado ${c.numero || 'sin número'} disponible para ${c.tienda}.`,
      tienda: (c.tienda ?? '').trim(),
      numero: c.numero ?? '',
      fecha: c.fecha ?? '',
      usada: usados.has((c.numero ?? '').trim().toUpperCase()),
    }))
}

export function marcarLeida(id: string): Notificacion[] {
  const leidos = cargarLeidos()
  if (!leidos.includes(id)) {
    leidos.push(id)
    localStorage.setItem(LEIDOS_KEY, JSON.stringify(leidos))
  }
  return cargarNotificaciones()
}

// Marca un certificado como usado (por su numero) tras registrar una entrada.
export function marcarUsadaPorNumero(numero: string): Notificacion[] {
  const num = (numero ?? '').trim().toUpperCase()
  if (num) {
    const usados = cargarUsados()
    if (!usados.some((n) => n.trim().toUpperCase() === num)) {
      usados.push(num)
      localStorage.setItem(USADOS_KEY, JSON.stringify(usados))
    }
  }
  return cargarNotificaciones()
}
