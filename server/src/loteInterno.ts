import { query } from './db.js'

// Devuelve el prefijo del PDV listo para anteponer (ej. "AL1-") o "" si no tiene.
async function prefijoDePdv(pvId: number): Promise<string> {
  const rows = await query('SELECT prefijo FROM puntos_venta WHERE id = $1', [
    pvId,
  ])
  const p = (rows[0]?.prefijo as string | undefined)?.trim()
  return p ? p + '-' : ''
}

// Escapa los metacaracteres para usar el texto como literal en una regex de Postgres.
function escaparRegex(texto: string): string {
  return texto.replace(/[.^$*+?()[\]{}|\\-]/g, '\\$&')
}

// Genera el siguiente lote interno con formato {PREFIJO}-{TIPO}{N} (sin ceros).
// La numeracion arranca en 1 para cada prefijo (punto de venta).
export async function siguienteLoteInterno(
  tabla: string,
  tipo: string,
  pvId: number,
): Promise<string> {
  const prefijo = await prefijoDePdv(pvId)
  const patron = '^' + escaparRegex(prefijo + tipo) + '[0-9]+$'
  const rows = await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(lote_interno FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS next
       FROM ${tabla}
      WHERE punto_venta_id = $1 AND lote_interno ~ $2`,
    [pvId, patron],
  )
  const next = Number(rows[0].next)
  return prefijo + tipo + String(next)
}
