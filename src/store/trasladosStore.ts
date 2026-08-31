// Certificados de traslado entre puntos de venta. Cuando una salida tiene como
// destino otro punto de venta, se genera un traslado que aparece como aviso en
// el dashboard del punto destino. Se guarda con prefijo `agro_` para que
// agroSync lo sincronice entre dispositivos (igual que los certificados).

export interface Traslado {
  id: string
  origen: string
  origenDireccion?: string
  origenTelefono?: string
  destino: string
  producto: string
  lote?: string
  cantidad?: number
  unidad?: string
  documento?: string
  responsable?: string
  fecha: string
}

const TRASLADOS_KEY = 'agro_traslados'
const LEIDOS_KEY = 'agro_traslados_leidos'

export function cargarTraslados(): Traslado[] {
  try {
    const raw = localStorage.getItem(TRASLADOS_KEY)
    if (raw) return JSON.parse(raw) as Traslado[]
  } catch {
    // sin registros
  }
  return []
}

function cargarLeidos(): string[] {
  try {
    const raw = localStorage.getItem(LEIDOS_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    // sin registros
  }
  return []
}

export function guardarTraslado(traslado: Traslado): void {
  const lista = cargarTraslados()
  lista.push(traslado)
  localStorage.setItem(TRASLADOS_KEY, JSON.stringify(lista))
}

// Traslados dirigidos a un punto de venta (por nombre) que aun no se leyeron.
export function trasladosPendientes(tienda: string): Traslado[] {
  const destino = tienda.trim().toUpperCase()
  const leidos = new Set(cargarLeidos())
  return cargarTraslados().filter(
    (t) =>
      t.id &&
      !leidos.has(t.id) &&
      (t.destino ?? '').trim().toUpperCase() === destino,
  )
}

export function marcarTrasladoLeido(id: string): void {
  const leidos = cargarLeidos()
  if (!leidos.includes(id)) {
    leidos.push(id)
    localStorage.setItem(LEIDOS_KEY, JSON.stringify(leidos))
  }
}
