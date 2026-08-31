import { Router } from 'express'
import { query } from '../db.js'
import type { EdicionLog } from '../types.js'

export const edicionesLogRouter = Router()

function map(r: Record<string, unknown>): EdicionLog {
  return {
    id: String(r.id),
    consecutivo: Number(r.consecutivo),
    modulo: r.modulo as string,
    registroId: (r.registro_id as string | null) ?? undefined,
    loteInterno: (r.lote_interno as string | null) ?? undefined,
    usuarioId: (r.usuario_id as string | null) ?? undefined,
    usuarioNombre: (r.usuario_nombre as string | null) ?? undefined,
    usuarioEmail: (r.usuario_email as string | null) ?? undefined,
    campo: r.campo as string,
    valorAnterior: (r.valor_anterior as string | null) ?? undefined,
    valorNuevo: (r.valor_nuevo as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

edicionesLogRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, consecutivo, modulo, registro_id, lote_interno, usuario_id,
              usuario_nombre, usuario_email, campo, valor_anterior, valor_nuevo,
              fecha_creacion
         FROM ediciones_log
        ORDER BY consecutivo DESC, id ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})
