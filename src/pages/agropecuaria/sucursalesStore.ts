// Catalogos de Sucursales y Firmantes de Agropecuaria. Se guardan en
// localStorage con prefijo agro_ para que se sincronicen entre dispositivos
// (ver src/services/agroSync.ts). El Certificado de calidad usa ambos.

export interface Sucursal {
  id: string
  nombre: string
  empresa: string
  direccion: string
  telefono: string
}

export interface Firmante {
  id: string
  nombre: string
  cargo: string
  sucursal: string
}

const SUCURSALES_KEY = 'agro_sucursales'
const FIRMANTES_KEY = 'agro_firmantes'

export function cargarSucursales(): Sucursal[] {
  try {
    const raw = localStorage.getItem(SUCURSALES_KEY)
    if (raw) {
      const lista = JSON.parse(raw) as Sucursal[]
      return lista.map((s) => ({ ...s, empresa: s.empresa ?? '' }))
    }
  } catch {
    // datos corruptos: se ignora
  }
  return []
}

export function guardarSucursales(lista: Sucursal[]): void {
  localStorage.setItem(SUCURSALES_KEY, JSON.stringify(lista))
}

export function cargarFirmantes(): Firmante[] {
  try {
    const raw = localStorage.getItem(FIRMANTES_KEY)
    if (raw) return JSON.parse(raw) as Firmante[]
  } catch {
    // datos corruptos: se ignora
  }
  return []
}

export function guardarFirmantes(lista: Firmante[]): void {
  localStorage.setItem(FIRMANTES_KEY, JSON.stringify(lista))
}
