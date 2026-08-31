import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { registrarEdicion } from '../auditoria.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import { siguienteLoteInterno } from '../loteInterno.js'
import type { Acondicionamiento, NuevoAcondicionamiento } from '../types.js'

export const acondicionamientoRouter = Router()

// Columnas a auditar (columna_bd -> etiqueta legible en el log).
const ETIQUETAS_ACOND: Record<string, string> = {
  fecha: 'Fecha',
  producto: 'Producto',
  producto_id: 'ID producto',
  lote: 'Lote',
  cantidad_entrada: 'Kilos de entrada',
  unidad: 'Unidad',
  producto_resultante: 'Producto resultante',
  cantidad_resultante: 'Kilos resultantes',
  proceso: 'Proceso',
  responsable: 'Responsable',
  observaciones: 'Observaciones',
  ficha_id: 'Vida util (ficha)',
  empresa: 'Empacado por',
  conservacion: 'Conservacion',
  instrucciones: 'Instrucciones',
  fecha_vencimiento: 'Fecha de vencimiento',
  fecha_empaque: 'Fecha de empaque',
  destino: 'Destino',
  placa_vehiculo: 'Placa del vehiculo',
  temperatura_vehiculo: 'Temperatura vehiculo',
  temperatura_producto: 'Temperatura producto',
}

function map(r: Record<string, unknown>): Acondicionamiento {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString()
          : String(r.fecha)
        : undefined,
    producto: r.producto as string,
    productoId: (r.producto_id as string | null) ?? undefined,
    lote: (r.lote as string | null) ?? undefined,
    loteInterno: (r.lote_interno as string | null) ?? undefined,
    cantidadEntrada:
      r.cantidad_entrada != null ? Number(r.cantidad_entrada) : undefined,
    unidad: (r.unidad as string | null) ?? undefined,
    productoResultante: (r.producto_resultante as string | null) ?? undefined,
    cantidadResultante:
      r.cantidad_resultante != null ? Number(r.cantidad_resultante) : undefined,
    proceso: (r.proceso as string | null) ?? undefined,
    responsable: (r.responsable as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    fichaId: (r.ficha_id as string | null) ?? undefined,
    empresa: (r.empresa as string | null) ?? undefined,
    conservacion: (r.conservacion as string | null) ?? undefined,
    instrucciones: (r.instrucciones as string | null) ?? undefined,
    fechaVencimiento:
      r.fecha_vencimiento != null
        ? r.fecha_vencimiento instanceof Date
          ? r.fecha_vencimiento.toISOString().slice(0, 10)
          : String(r.fecha_vencimiento).slice(0, 10)
        : undefined,
    fechaEmpaque:
      r.fecha_empaque != null
        ? r.fecha_empaque instanceof Date
          ? r.fecha_empaque.toISOString().slice(0, 10)
          : String(r.fecha_empaque).slice(0, 10)
        : undefined,
    destino: (r.destino as string | null) ?? undefined,
    placaVehiculo: (r.placa_vehiculo as string | null) ?? undefined,
    temperaturaVehiculo:
      (r.temperatura_vehiculo as string | null) ?? undefined,
    temperaturaProducto:
      (r.temperatura_producto as string | null) ?? undefined,
    editado: Boolean(r.editado),
    puntoVenta: (r.punto_venta as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoAcondicionamiento>): string[] {
  const errores: string[] = []
  if (!body.producto || !body.producto.trim())
    errores.push('producto es obligatorio')
  return errores
}

const COLS = `id, fecha, producto, producto_id, lote, cantidad_entrada, unidad,
              producto_resultante, cantidad_resultante, proceso, responsable,
              observaciones, ficha_id, empresa, conservacion, instrucciones,
              fecha_vencimiento, fecha_empaque, destino, placa_vehiculo,
              temperatura_vehiculo, temperatura_producto, editado, lote_interno, fecha_creacion`

acondicionamientoRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS},
              (SELECT pdv FROM puntos_venta pv WHERE pv.id = acondicionamiento.punto_venta_id) AS punto_venta
         FROM acondicionamiento WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

acondicionamientoRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoAcondicionamiento>
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
    // Genera el siguiente lote interno con formato {PREFIJO}-AC000001.
    const loteInterno = await siguienteLoteInterno('acondicionamiento', 'AC', pv)
    const ins = await query(
      `INSERT INTO acondicionamiento
         (fecha, producto, producto_id, lote, cantidad_entrada, unidad,
          producto_resultante, cantidad_resultante, proceso, responsable,
          observaciones, ficha_id, empresa, conservacion, instrucciones,
          fecha_vencimiento, fecha_empaque, destino, placa_vehiculo,
          temperatura_vehiculo, temperatura_producto, lote_interno, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidadEntrada === 'number' ? body.cantidadEntrada : null,
        body.unidad?.trim() || null,
        body.productoResultante?.trim() || null,
        typeof body.cantidadResultante === 'number'
          ? body.cantidadResultante
          : null,
        body.proceso?.trim() || null,
        body.responsable?.trim() || null,
        body.observaciones?.trim() || null,
        body.fichaId?.trim() || null,
        body.empresa?.trim() || null,
        body.conservacion?.trim() || null,
        body.instrucciones?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        body.fechaEmpaque?.trim() || null,
        body.destino?.trim() || null,
        body.placaVehiculo?.trim() || null,
        body.temperaturaVehiculo?.trim() || null,
        body.temperaturaProducto?.trim() || null,
        loteInterno,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

acondicionamientoRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoAcondicionamiento> & {
      password?: string
    }
    const password = (body.password ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    if (!(await passwordUsuarioValida(req.usuario?.sub, password))) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const previos = await query(
      `SELECT ${COLS} FROM acondicionamiento WHERE id=$1 AND ${condicionPdv(req.scope, 2).clause}`,
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (previos.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    const upd = await query(
      `UPDATE acondicionamiento SET fecha=$2, producto=$3, producto_id=$4,
              lote=$5, cantidad_entrada=$6, unidad=$7, producto_resultante=$8,
              cantidad_resultante=$9, proceso=$10, responsable=$11,
              observaciones=$12, ficha_id=$13, empresa=$14, conservacion=$15,
              instrucciones=$16, fecha_vencimiento=$17, fecha_empaque=$18,
              destino=$19, placa_vehiculo=$20, temperatura_vehiculo=$21,
              temperatura_producto=$22, editado=TRUE
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.producto!.trim(),
        body.productoId?.trim() || null,
        body.lote?.trim() || null,
        typeof body.cantidadEntrada === 'number' ? body.cantidadEntrada : null,
        body.unidad?.trim() || null,
        body.productoResultante?.trim() || null,
        typeof body.cantidadResultante === 'number'
          ? body.cantidadResultante
          : null,
        body.proceso?.trim() || null,
        body.responsable?.trim() || null,
        body.observaciones?.trim() || null,
        body.fichaId?.trim() || null,
        body.empresa?.trim() || null,
        body.conservacion?.trim() || null,
        body.instrucciones?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        body.fechaEmpaque?.trim() || null,
        body.destino?.trim() || null,
        body.placaVehiculo?.trim() || null,
        body.temperaturaVehiculo?.trim() || null,
        body.temperaturaProducto?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    await registrarEdicion({
      modulo: 'Acondicionamiento',
      registroId: String(id),
      loteInterno: (upd[0].lote_interno as string | null) ?? undefined,
      usuario: req.usuario,
      etiquetas: ETIQUETAS_ACOND,
      antes: previos[0],
      despues: upd[0],
    })
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

acondicionamientoRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM acondicionamiento WHERE id=$1 AND ' +
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
