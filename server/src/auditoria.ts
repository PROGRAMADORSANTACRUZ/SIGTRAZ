import { query } from './db.js'
import type { TokenPayload } from './auth.js'

// Ejecutor de consultas: por defecto usa el pool global, pero puede recibir
// el cliente de una transaccion (pool.connect()) para registrar el log dentro
// de la misma transaccion.
type Ejecutar = (
  text: string,
  params: unknown[],
) => Promise<Record<string, unknown>[]>

const ejecutarPorDefecto: Ejecutar = (text, params) => query(text, params)

// Convierte cualquier valor de la BD a una cadena comparable.
function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) return valor.toISOString()
  return String(valor).trim()
}

export interface RegistrarEdicionOpts {
  modulo: string
  registroId?: string | null
  loteInterno?: string | null
  usuario?: TokenPayload
  // Mapa columna_bd -> etiqueta legible que se mostrara en el log.
  etiquetas: Record<string, string>
  // Fila (u objeto) con los valores ANTES de editar.
  antes: Record<string, unknown>
  // Fila (u objeto) con los valores DESPUES de editar.
  despues: Record<string, unknown>
  ejecutar?: Ejecutar
}

/**
 * Registra en `ediciones_log` los cambios de una edicion.
 * - Compara columna por columna (segun `etiquetas`).
 * - Solo guarda las columnas que realmente cambiaron.
 * - Todas las columnas de un mismo evento comparten un unico consecutivo.
 */
export async function registrarEdicion(
  opts: RegistrarEdicionOpts,
): Promise<void> {
  const run = opts.ejecutar ?? ejecutarPorDefecto

  const cambios = Object.entries(opts.etiquetas)
    .map(([col, label]) => ({
      label,
      anterior: normalizar(opts.antes[col]),
      nuevo: normalizar(opts.despues[col]),
    }))
    .filter((c) => c.anterior !== c.nuevo)

  if (cambios.length === 0) return

  const seq = await run(
    'SELECT COALESCE(MAX(consecutivo), 0) + 1 AS next FROM ediciones_log',
    [],
  )
  const consecutivo = Number((seq[0] as { next: number }).next) || 1

  for (const c of cambios) {
    await run(
      `INSERT INTO ediciones_log
         (consecutivo, modulo, registro_id, lote_interno, usuario_id,
          usuario_nombre, usuario_email, campo, valor_anterior, valor_nuevo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        consecutivo,
        opts.modulo,
        opts.registroId ?? null,
        opts.loteInterno ?? null,
        opts.usuario?.sub ?? null,
        opts.usuario?.nombre ?? null,
        opts.usuario?.email ?? null,
        c.label,
        c.anterior || null,
        c.nuevo || null,
      ],
    )
  }
}
