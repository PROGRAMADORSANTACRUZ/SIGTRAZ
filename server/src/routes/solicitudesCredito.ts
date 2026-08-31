import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type { NuevaSolicitudCredito, SolicitudCredito } from '../types.js'

export const solicitudesCreditoRouter = Router()

function map(r: Record<string, unknown>): SolicitudCredito {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha).slice(0, 10)
        : undefined,
    cliente: r.cliente as string,
    documento: (r.documento as string | null) ?? undefined,
    telefono: (r.telefono as string | null) ?? undefined,
    direccion: (r.direccion as string | null) ?? undefined,
    monto: r.monto != null ? Number(r.monto) : undefined,
    plazo: (r.plazo as string | null) ?? undefined,
    estado: (r.estado as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    consecutivo: (r.consecutivo as string | null) ?? undefined,
    datos:
      (r.datos as Record<string, unknown> | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaSolicitudCredito>): string[] {
  const errores: string[] = []
  if (!body.cliente || !body.cliente.trim())
    errores.push('cliente es obligatorio')
  return errores
}

const COLS = `id, fecha, cliente, documento, telefono, direccion, monto,
              plazo, estado, observaciones, consecutivo, datos, fecha_creacion`

solicitudesCreditoRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM solicitudes_credito ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

solicitudesCreditoRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaSolicitudCredito>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    // Genera el siguiente consecutivo con formato SC-1 (acepta SC000001 antiguo).
    const seq = await query(
      `SELECT COALESCE(
                MAX(CAST(SUBSTRING(consecutivo FROM '[0-9]+$') AS INTEGER)), 0
              ) + 1 AS next
         FROM solicitudes_credito
        WHERE consecutivo ~ '^SC-?[0-9]+$'`,
    )
    const next = Number((seq[0] as { next: number }).next) || 1
    const consecutivo = 'SC-' + next
    const ins = await query(
      `INSERT INTO solicitudes_credito
         (fecha, cliente, documento, telefono, direccion, monto,
          plazo, estado, observaciones, consecutivo, datos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.cliente!.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.direccion?.trim() || null,
        typeof body.monto === 'number' ? body.monto : null,
        body.plazo?.trim() || null,
        body.estado?.trim() || 'Pendiente',
        body.observaciones?.trim() || null,
        consecutivo,
        JSON.stringify(body.datos ?? {}),
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

solicitudesCreditoRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaSolicitudCredito>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE solicitudes_credito SET fecha=$2, cliente=$3, documento=$4,
              telefono=$5, direccion=$6, monto=$7, plazo=$8, estado=$9,
              observaciones=$10, datos=$11::jsonb
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.cliente!.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.direccion?.trim() || null,
        typeof body.monto === 'number' ? body.monto : null,
        body.plazo?.trim() || null,
        body.estado?.trim() || 'Pendiente',
        body.observaciones?.trim() || null,
        JSON.stringify(body.datos ?? {}),
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

solicitudesCreditoRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const password = ((req.body?.password as string | undefined) ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    if (!(await passwordUsuarioValida(req.usuario?.sub, password))) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }
    const rows = await query(
      'DELETE FROM solicitudes_credito WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
