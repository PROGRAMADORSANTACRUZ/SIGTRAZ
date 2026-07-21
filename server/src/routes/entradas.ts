import { Router } from 'express'
import { query } from '../db.js'
import type { Entrada, NuevaEntrada } from '../types.js'

export const entradasRouter = Router()

function mapEntrada(r: Record<string, unknown>): Entrada {
  return {
    id: String(r.id),
    fecha: (r.fecha as Date).toISOString(),
    productoId: r.producto_id as string,
    loteCodigo: r.lote_codigo as string,
    cantidad: Number(r.cantidad),
    proveedor: r.proveedor as string,
    almacen: r.almacen as string,
    responsable: r.responsable as string,
    documento: (r.documento as string | null) ?? undefined,
    notas: (r.notas as string | null) ?? undefined,
    fechaVencimiento: (r.fecha_vencimiento as string | null) ?? undefined,
    fechaBeneficio: (r.fecha_beneficio as string | null) ?? undefined,
    fechaEmpaque: (r.fecha_empaque as string | null) ?? undefined,
    conservacion: (r.conservacion as string | null) ?? undefined,
    instrucciones: (r.instrucciones as string | null) ?? undefined,
    empresa: (r.empresa as string | null) ?? undefined,
  }
}

entradasRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, fecha, producto_id, lote_codigo, cantidad,
              proveedor, almacen, responsable, documento, notas,
              fecha_vencimiento, fecha_beneficio, fecha_empaque,
              conservacion, instrucciones, empresa
         FROM entradas
        ORDER BY fecha DESC, id DESC`,
    )
    res.json(rows.map(mapEntrada))
  } catch (err) {
    next(err)
  }
})

entradasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaEntrada>

    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const fecha = body.fecha ? new Date(body.fecha) : new Date()

    const rows = await query(
      `INSERT INTO entradas
          (fecha, producto_id, lote_codigo, cantidad, proveedor,
           almacen, responsable, documento, notas,
           fecha_vencimiento, fecha_beneficio, fecha_empaque,
           conservacion, instrucciones, empresa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               $10, $11, $12, $13, $14, $15)
       RETURNING id, fecha, producto_id, lote_codigo, cantidad,
                 proveedor, almacen, responsable, documento, notas,
                 fecha_vencimiento, fecha_beneficio, fecha_empaque,
                 conservacion, instrucciones, empresa`,
      [
        fecha,
        body.productoId!,
        body.loteCodigo!.trim(),
        body.cantidad!,
        body.proveedor!.trim(),
        body.almacen!.trim(),
        body.responsable!.trim(),
        body.documento?.trim() || null,
        body.notas?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        body.fechaBeneficio?.trim() || null,
        body.fechaEmpaque?.trim() || null,
        body.conservacion?.trim() || null,
        body.instrucciones?.trim() || null,
        body.empresa?.trim() || null,
      ],
    )

    res.status(201).json(mapEntrada(rows[0]))
  } catch (err) {
    next(err)
  }
})

function validar(body: Partial<NuevaEntrada>): string[] {
  const errores: string[] = []
  if (!body.productoId?.trim()) errores.push('productoId es obligatorio')
  if (!body.loteCodigo?.trim()) errores.push('loteCodigo es obligatorio')
  if (typeof body.cantidad !== 'number' || body.cantidad <= 0)
    errores.push('cantidad debe ser mayor a 0')
  if (!body.proveedor?.trim()) errores.push('proveedor es obligatorio')
  if (!body.almacen?.trim()) errores.push('almacen es obligatorio')
  if (!body.responsable?.trim()) errores.push('responsable es obligatorio')
  return errores
}
