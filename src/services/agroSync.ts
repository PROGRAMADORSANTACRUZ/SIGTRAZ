import { api, getToken } from './api'

// Sincronizacion de los modulos de Agropecuaria entre dispositivos (PC <-> cel).
//
// Estos modulos guardan sus datos en localStorage con claves que empiezan por
// `agro_` o por `sigtraz_agro_catalogo_`. localStorage es local a cada
// navegador, por lo que sin esta capa cada dispositivo veria datos distintos.
//
// Estrategia:
//  1) Al iniciar la app (o al iniciar sesion) se descargan del servidor todas
//     las claves y se vuelcan en localStorage  -> precargarAgro().
//  2) Se intercepta localStorage.setItem para que, cada vez que un modulo
//     guarde una clave agro_*, tambien se envie al servidor -> instalarSyncAgro().

const PREFIJOS = ['agro_', 'sigtraz_agro_catalogo_']

function esClaveAgro(clave: string): boolean {
  return PREFIJOS.some((p) => clave.startsWith(p))
}

// Mientras se aplican valores que llegan del servidor no debemos reenviarlos.
let aplicandoRemoto = false

let instalado = false

// Ultimo valor conocido del servidor por clave (string JSON). Sirve para:
//  - no reenviar el "eco" que escribe cada pagina al montarse (mismo valor), y
//  - distinguir un cambio real del usuario de una escritura accidental.
const snapshotServidor = new Map<string, string>()

// Un valor se considera "vacio" cuando no aporta datos: array/objeto vacios,
// cadena vacia o null. Nunca debemos pisar datos buenos del servidor con esto.
function esVacio(valor: string): boolean {
  const v = valor.trim()
  return v === '' || v === '[]' || v === '{}' || v === 'null'
}

// Reemplaza localStorage.setItem por una version que ademas empuja al servidor
// las claves de Agropecuaria. Idempotente.
export function instalarSyncAgro(): void {
  if (instalado) return
  instalado = true

  const original = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (clave: string, valor: string) => {
    original(clave, valor)
    if (aplicandoRemoto || !esClaveAgro(clave)) return
    if (!getToken()) return

    const previo = snapshotServidor.get(clave)
    // Eco de montaje: la pagina reescribe el mismo valor que llego del servidor.
    if (previo === valor) return
    // No pisar el estado del servidor (aun desconocido) con un valor vacio.
    // Esto evita que, al montar una pagina con la lista vacia, se envie "[]"
    // y se borren los datos compartidos entre dispositivos.
    if (esVacio(valor) && previo === undefined) return

    let parsed: unknown = valor
    try {
      parsed = JSON.parse(valor)
    } catch {
      // valor no-JSON: se envia tal cual
    }
    snapshotServidor.set(clave, valor)
    // Fire and forget: la UI no debe esperar a la red. Si falla, se revierte el
    // snapshot para reintentar en el proximo guardado y se deja rastro en consola.
    api.putAgroKv(clave, parsed).catch((err) => {
      snapshotServidor.delete(clave)
      console.error(`No se pudo sincronizar "${clave}" con el servidor:`, err)
    })
  }
}

// Descarga del servidor todas las claves de Agropecuaria y las vuelca en
// localStorage. Debe llamarse antes de montar las paginas para que sus estados
// iniciales lean los datos ya sincronizados.
export async function precargarAgro(): Promise<void> {
  if (!getToken()) return
  try {
    const items = await api.getAgroKv()
    const clavesServidor = new Set(items.map((i) => i.clave))
    aplicandoRemoto = true
    try {
      for (const { clave, valor } of items) {
        if (!esClaveAgro(clave)) continue
        // El servidor es la fuente de verdad para las claves que ya conoce
        // (incluye listas vacias tras una eliminacion). Aplicamos siempre su
        // valor para que las eliminaciones hechas en otro equipo se reflejen
        // aqui y no reaparezcan registros borrados.
        const remoto = JSON.stringify(valor)
        snapshotServidor.set(clave, remoto)
        localStorage.setItem(clave, remoto)
      }
      // Recupera datos huerfanos: claves agro_ que existen SOLO en este
      // navegador y el servidor nunca vio (p.ej. capturadas antes de tener
      // sincronizacion). Se suben para que no se pierdan al cambiar de equipo.
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i)
        if (!clave || !esClaveAgro(clave) || clavesServidor.has(clave)) continue
        const local = localStorage.getItem(clave)
        if (local == null || esVacio(local)) continue
        try {
          const parsed = JSON.parse(local)
          snapshotServidor.set(clave, local)
          api.putAgroKv(clave, parsed).catch((err) => {
            snapshotServidor.delete(clave)
            console.error(`No se pudo subir "${clave}" al servidor:`, err)
          })
        } catch {
          // valor local corrupto: se ignora
        }
      }
    } finally {
      aplicandoRemoto = false
    }
  } catch {
    // Sin conexion: se usan los datos locales existentes.
  }
}
