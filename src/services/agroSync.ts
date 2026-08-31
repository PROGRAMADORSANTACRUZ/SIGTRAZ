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
    let parsed: unknown = valor
    try {
      parsed = JSON.parse(valor)
    } catch {
      // valor no-JSON: se envia tal cual
    }
    // Fire and forget: la UI no debe esperar a la red.
    api.putAgroKv(clave, parsed).catch(() => {
      // Sin conexion: el valor queda en localStorage y se reintentara al
      // proximo guardado.
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
    aplicandoRemoto = true
    try {
      for (const { clave, valor } of items) {
        if (!esClaveAgro(clave)) continue
        localStorage.setItem(clave, JSON.stringify(valor))
      }
    } finally {
      aplicandoRemoto = false
    }
  } catch {
    // Sin conexion: se usan los datos locales existentes.
  }
}
