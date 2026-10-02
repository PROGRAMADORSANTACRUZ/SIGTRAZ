import { api } from './api'

const valores = new Map<string, string>()
const confirmados = new Map<string, string>()
const pendientes = new Map<string, string>()
const errores = new Map<string, string>()
const heredados = new Map<string, string>()
let cola: Promise<void> = Promise.resolve()
let cargado = false
let generacion = 0
let carga: Promise<void> | null = null

export const EVENTO_GUARDADO = 'sigtraz-guardado'

function notificar() {
  window.dispatchEvent(new Event(EVENTO_GUARDADO))
}

export function estadoGuardado() {
  return { pendientes: pendientes.size, errores: [...errores.entries()], heredados: heredados.size }
}

function interpretar(valor: string): unknown {
  try {
    return JSON.parse(valor)
  } catch {
    return valor
  }
}

function serializar(valor: unknown): string {
  return typeof valor === 'string' ? valor : JSON.stringify(valor)
}

function encolar(clave: string, valor: string) {
  const actual = generacion
  pendientes.set(clave, valor)
  errores.delete(clave)
  notificar()
  cola = cola.then(async () => {
    if (actual !== generacion || pendientes.get(clave) !== valor) return
    try {
      const previo = confirmados.get(clave)
      await api.putAgroKv(clave, interpretar(valor), previo === undefined ? undefined : interpretar(previo))
      if (actual !== generacion) return
      confirmados.set(clave, valor)
      if (pendientes.get(clave) === valor) pendientes.delete(clave)
      errores.delete(clave)
      try {
        if (localStorage.getItem(clave) === valor) localStorage.removeItem(clave)
      } catch {}
    } catch (error) {
      if (actual !== generacion) return
      errores.set(clave, error instanceof Error ? error.message : 'No se pudo guardar')
    }
    notificar()
  })
}

export const almacenamientoDatos = {
  getItem(clave: string): string | null {
    return valores.get(clave) ?? null
  },
  setItem(clave: string, valor: string): void {
    if (!cargado) throw new Error('Los datos de la base de datos no se han cargado')
    if (valores.get(clave) === valor && !errores.has(clave)) return
    valores.set(clave, valor)
    if (confirmados.get(clave) !== valor || pendientes.has(clave)) encolar(clave, valor)
  },
  removeItem(clave: string): void {
    this.setItem(clave, 'null')
  },
  key(indice: number): string | null {
    return [...valores.keys()][indice] ?? null
  },
  get length(): number {
    return valores.size
  },
}

export function reintentarGuardados(): void {
  for (const [clave, valor] of pendientes) encolar(clave, valor)
}

export async function esperarGuardados(): Promise<void> {
  let esperando: Promise<void>
  do {
    esperando = cola
    await esperando
  } while (esperando !== cola)
  if (errores.size) throw new Error('Hay cambios que no se han guardado en la base de datos')
}

export function limpiarDatos(): void {
  generacion += 1
  cargado = false
  valores.clear()
  confirmados.clear()
  pendientes.clear()
  errores.clear()
  heredados.clear()
  notificar()
}

export function cargarDatos(): Promise<void> {
  if (!carga) carga = precargarDatos().finally(() => { carga = null })
  return carga
}

async function precargarDatos(): Promise<void> {
  const actual = generacion
  const items = await api.getAgroKv()
  if (actual !== generacion) throw new Error('La sesion cambio durante la carga de datos')
  limpiarDatos()
  for (const { clave, valor } of items) {
    const serializado = serializar(valor)
    valores.set(clave, serializado)
    confirmados.set(clave, serializado)
  }
  cargado = true
  try {
    const claves = Object.keys(localStorage).filter((clave) =>
      clave.startsWith('agro_') || clave.startsWith('sigtraz_agro_catalogo_') ||
      clave.startsWith('sigtraz_seed_') ||
      ['sigtraz_tema', 'sigtraz_vista', 'sigtraz_pdv', 'sigtraz_bascula_baud'].includes(clave),
    )
    for (const clave of claves) {
      const local = localStorage.getItem(clave)
      if (local === null) continue
      if (clave.startsWith('agro_') || clave.startsWith('sigtraz_agro_catalogo_')) {
        try {
          JSON.parse(local)
        } catch {
          heredados.set(clave, local)
          continue
        }
      }
      const normalizado = serializar(interpretar(local))
      const remoto = confirmados.get(clave)
      if (remoto === normalizado) localStorage.removeItem(clave)
      else if (remoto === undefined && !['[]', '{}', 'null', ''].includes(local)) {
        almacenamientoDatos.setItem(clave, normalizado)
      } else if (remoto !== undefined && !['[]', '{}', 'null', ''].includes(local)) {
        heredados.set(clave, local)
      }
    }
  } catch {}
  notificar()
}

export function descargarCambios(): void {
  const contenido = JSON.stringify({ pendientes: Object.fromEntries(pendientes), localesAntiguos: Object.fromEntries(heredados) }, null, 2)
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'sigtraz-recuperacion.json'
  enlace.click()
  URL.revokeObjectURL(url)
}