import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import { siguienteLoteInterno } from '../loteInterno.js'
import { registrarEdicion } from '../auditoria.js'
import type { Salida, NuevaSalida } from '../types.js'

export const salidasRouter = Router()

// Columnas a auditar (columna_bd -> etiqueta legible en el log).
const ETIQUETAS_SALIDA: Record<string, string> = {
  fecha: 'Fecha',
  producto: 'Producto',
  producto_id: 'ID producto',
  lote: 'Lote',
  cantidad: 'Cantidad',
  unidad: 'Unidad',
  destino: 'Destino',
  responsable: 'Responsable',
  documento: 'Documento',
  observaciones: 'Observaciones',
  fecha_vencimiento: 'Fecha de vencimiento',
}

function map(r: Record<string, unknown>): Salida {
  return {
    id: String(r.id),
    fecha: (r.fecha as string | null) ?? undefined,
    producto: r.producto as string,
    productoId: (r.producto_id as string | null) ?? undefined,
    lote: (r.lote as string | null) ?? undefined,
    cantidad: r.cantidad != null ? Number(r.cantidad) : undefined,
    unidad: (r.unidad as string | null) ?? undefined,
    destino: (r.destino as string | null) ?? undefined,
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

function validar(body: Partial<NuevaSalida>): string[] {
  const errores: string[] = []
  if (!body.producto || !body.producto.trim())
    errores.push('producto es obligatorio')
  return errores
}

const COLS = `id, fecha, producto, producto_id, lote, cantidad, unidad,
              destino, responsable, documento, observaciones, fecha_vencimiento,
              lote_interno, fecha_creacion`

salidasRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM salidas WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

salidasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaSalida>
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
    // Genera el siguiente lote interno con formato {PREFIJO}-SA000001.
    const loteInterno = await siguienteLoteInterno('salidas', 'SA', pv)
    const ins = await query(
      `INSERT INTO salidas
         (fecha, producto, producto_id, lote, cantidad, unidad,
          destino, responsable, documento, observaciones, fecha_vencimiento,
          lote_interno, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidad === 'number' ? body.cantidad : null,
        body.unidad?.trim() || null,
        body.destino?.trim() || null,
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

salidasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaSalida>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const previos = await query(
      `SELECT ${COLS} FROM salidas WHERE id=$1 AND ${condicionPdv(req.scope, 2).clause}`,
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (previos.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    const upd = await query(
      `UPDATE salidas SET fecha=$2, producto=$3, producto_id=$4, lote=$5,
              cantidad=$6, unidad=$7, destino=$8, responsable=$9,
              documento=$10, observaciones=$11, fecha_vencimiento=$12
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidad === 'number' ? body.cantidad : null,
        body.unidad?.trim() || null,
        body.destino?.trim() || null,
        body.responsable?.trim() || null,
        body.documento?.trim() || null,
        body.observaciones?.trim() || null,
        body.fechaVencimiento?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    await registrarEdicion({
      modulo: 'Salida',
      registroId: String(id),
      loteInterno: (upd[0].lote_interno as string | null) ?? undefined,
      usuario: req.usuario,
      etiquetas: ETIQUETAS_SALIDA,
      antes: previos[0],
      despues: upd[0],
    })
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

salidasRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM salidas WHERE id=$1 AND ' + condicionPdv(req.scope, 2).clause + ' RETURNING id', [
      id,
      ...condicionPdv(req.scope, 2).params,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
