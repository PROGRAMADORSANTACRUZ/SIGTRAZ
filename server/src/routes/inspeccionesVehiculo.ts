import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type { InspeccionVehiculo, NuevaInspeccionVehiculo } from '../types.js'

export const inspeccionesVehiculoRouter = Router()

function map(r: Record<string, unknown>): InspeccionVehiculo {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha).slice(0, 10)
        : undefined,
    tipoVehiculo: (r.tipo_vehiculo as string | null) ?? undefined,
    placa: (r.placa as string | null) ?? undefined,
    cliente: (r.cliente as string | null) ?? undefined,
    numeroFactura: (r.numero_factura as string | null) ?? undefined,
    producto: (r.producto as string | null) ?? undefined,
    lote: (r.lote as string | null) ?? undefined,
    estadoUnidad: (r.estado_unidad as string | null) ?? undefined,
    limpiezaInterior: (r.limpieza_interior as string | null) ?? undefined,
    limpiezaExterior: (r.limpieza_exterior as string | null) ?? undefined,
    ausenciaPlagas: (r.ausencia_plagas as string | null) ?? undefined,
    temperaturaVehiculo:
      r.temperatura_vehiculo != null
        ? Number(r.temperatura_vehiculo)
        : undefined,
    temperaturaProducto:
      r.temperatura_producto != null
        ? Number(r.temperatura_producto)
        : undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    firmaResponsable: (r.firma_responsable as string | null) ?? undefined,
    verificadoPor: (r.verificado_por as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaInspeccionVehiculo>): string[] {
  const errores: string[] = []
  if (!body.placa || !body.placa.trim())
    errores.push('placa es obligatoria')
  return errores
}

const COLS = `id, fecha, tipo_vehiculo, placa, cliente, numero_factura,
              producto, lote, estado_unidad, limpieza_interior,
              limpieza_exterior, ausencia_plagas, temperatura_vehiculo,
              temperatura_producto, observaciones, firma_responsable,
              verificado_por, fecha_creacion`

inspeccionesVehiculoRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM inspecciones_vehiculo WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

inspeccionesVehiculoRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaInspeccionVehiculo>
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
    const ins = await query(
      `INSERT INTO inspecciones_vehiculo
         (fecha, tipo_vehiculo, placa, cliente, numero_factura, producto,
          lote, estado_unidad, limpieza_interior, limpieza_exterior,
          ausencia_plagas, temperatura_vehiculo, temperatura_producto,
          observaciones, firma_responsable, verificado_por, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.tipoVehiculo?.trim() || null,
        body.placa!.trim(),
        body.cliente?.trim() || null,
        body.numeroFactura?.trim() || null,
        body.producto?.trim() || null,
        body.lote?.trim() || null,
        body.estadoUnidad?.trim() || null,
        body.limpiezaInterior?.trim() || null,
        body.limpiezaExterior?.trim() || null,
        body.ausenciaPlagas?.trim() || null,
        typeof body.temperaturaVehiculo === 'number'
          ? body.temperaturaVehiculo
          : null,
        typeof body.temperaturaProducto === 'number'
          ? body.temperaturaProducto
          : null,
        body.observaciones?.trim() || null,
        body.firmaResponsable?.trim() || null,
        body.verificadoPor?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

inspeccionesVehiculoRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaInspeccionVehiculo>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE inspecciones_vehiculo SET
              fecha=$2, tipo_vehiculo=$3, placa=$4, cliente=$5,
              numero_factura=$6, producto=$7, lote=$8, estado_unidad=$9,
              limpieza_interior=$10, limpieza_exterior=$11, ausencia_plagas=$12,
              temperatura_vehiculo=$13, temperatura_producto=$14,
              observaciones=$15, firma_responsable=$16, verificado_por=$17
        WHERE id=$1 AND ${condicionPdv(req.scope, 18).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.tipoVehiculo?.trim() || null,
        body.placa!.trim(),
        body.cliente?.trim() || null,
        body.numeroFactura?.trim() || null,
        body.producto?.trim() || null,
        body.lote?.trim() || null,
        body.estadoUnidad?.trim() || null,
        body.limpiezaInterior?.trim() || null,
        body.limpiezaExterior?.trim() || null,
        body.ausenciaPlagas?.trim() || null,
        typeof body.temperaturaVehiculo === 'number'
          ? body.temperaturaVehiculo
          : null,
        typeof body.temperaturaProducto === 'number'
          ? body.temperaturaProducto
          : null,
        body.observaciones?.trim() || null,
        body.firmaResponsable?.trim() || null,
        body.verificadoPor?.trim() || null,
        ...condicionPdv(req.scope, 18).params,
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

inspeccionesVehiculoRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM inspecciones_vehiculo WHERE id=$1 AND ' +
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
