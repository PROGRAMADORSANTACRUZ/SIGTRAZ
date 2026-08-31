import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import { siguienteLoteInterno } from '../loteInterno.js'
import type { Devolucion, NuevaDevolucion } from '../types.js'

export const devolucionesRouter = Router()

function map(r: Record<string, unknown>): Devolucion {
  return {
    id: String(r.id),
    fecha: (r.fecha as string | null) ?? undefined,
    producto: r.producto as string,
    productoId: (r.producto_id as string | null) ?? undefined,
    lote: (r.lote as string | null) ?? undefined,
    cantidad: r.cantidad != null ? Number(r.cantidad) : undefined,
    unidad: (r.unidad as string | null) ?? undefined,
    origen: (r.origen as string | null) ?? undefined,
    motivo: (r.motivo as string | null) ?? undefined,
    responsable: (r.responsable as string | null) ?? undefined,
    documento: (r.documento as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    fechaVencimiento:
      r.fecha_vencimiento != null
        ? r.fecha_vencimiento instanceof Date
          ? r.fecha_vencimiento.toISOString().slice(0, 10)
          : String(r.fecha_vencimiento).slice(0, 10)
        : undefined,
    loteInterno: (r.lote_interno as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaDevolucion>): string[] {
  const errores: string[] = []
  if (!body.producto || !body.producto.trim())
    errores.push('producto es obligatorio')
  return errores
}

const COLS = `id, fecha, producto, producto_id, lote, cantidad, unidad,
              origen, motivo, responsable, documento, observaciones,
              fecha_vencimiento, lote_interno, fecha_creacion`

devolucionesRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM devoluciones WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

devolucionesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaDevolucion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const pv = pdvParaCrear(req.scope)
    if (pv == null) {
      res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
      return
    }
    // Genera el siguiente lote interno con formato {PREFIJO}-DV000001.
    const loteInterno = await siguienteLoteInterno('devoluciones', 'DV', pv)
    const ins = await query(
      `INSERT INTO devoluciones
         (fecha, producto, producto_id, lote, cantidad, unidad,
          origen, motivo, responsable, documento, observaciones,
          fecha_vencimiento, lote_interno, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidad === 'number' ? body.cantidad : null,
        body.unidad?.trim() || null,
        body.origen?.trim() || null,
        body.motivo?.trim() || null,
        body.responsable?.trim() || null,
        body.documento?.trim() || null,
        body.observaciones?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        loteInterno,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

devolucionesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaDevolucion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE devoluciones SET fecha=$2, producto=$3, producto_id=$4, lote=$5,
              cantidad=$6, unidad=$7, origen=$8, motivo=$9, responsable=$10,
              documento=$11, observaciones=$12, fecha_vencimiento=$13
        WHERE id=$1 AND ${condicionPdv(req.scope, 14).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidad === 'number' ? body.cantidad : null,
        body.unidad?.trim() || null,
        body.origen?.trim() || null,
        body.motivo?.trim() || null,
        body.responsable?.trim() || null,
        body.documento?.trim() || null,
        body.observaciones?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        ...condicionPdv(req.scope, 14).params,
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

devolucionesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM devoluciones WHERE id=$1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [id, ...condicionPdv(req.scope, 2).params],
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
