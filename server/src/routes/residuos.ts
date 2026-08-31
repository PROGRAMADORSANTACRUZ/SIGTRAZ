import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type { ResiduoSolido, NuevoResiduoSolido } from '../types.js'

export const residuosRouter = Router()

function map(r: Record<string, unknown>): ResiduoSolido {
  return {
    id: String(r.id),
    fecha: r.fecha
      ? typeof r.fecha === 'string'
        ? r.fecha.slice(0, 10)
        : (r.fecha as Date).toISOString().slice(0, 10)
      : undefined,
    horaRecaudo: (r.hora_recaudo as string) ?? undefined,
    placaVehiculo: (r.placa_vehiculo as string) ?? undefined,
    kgBolsas: (r.kg_bolsas as string) ?? undefined,
    firma: (r.firma as string) ?? undefined,
    firmaImagen: (r.firma_imagen as string) ?? undefined,
    observaciones: (r.observaciones as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoResiduoSolido>): string[] {
  const errores: string[] = []
  if (!body.fecha?.trim()) errores.push('fecha es obligatoria')
  if (!body.firma?.trim()) errores.push('el nombre de quien recauda es obligatorio')
  if (!body.firmaImagen?.trim()) errores.push('la firma es obligatoria')
  return errores
}

const COLS = `id, fecha, hora_recaudo, placa_vehiculo, kg_bolsas, firma, firma_imagen, observaciones, fecha_creacion`

residuosRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM residuos_solidos WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

residuosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoResiduoSolido>
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
      `INSERT INTO residuos_solidos
        (fecha, hora_recaudo, placa_vehiculo, kg_bolsas, firma, firma_imagen, observaciones, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.horaRecaudo?.trim() || null,
        body.placaVehiculo?.trim() || null,
        body.kgBolsas?.trim() || null,
        body.firma?.trim() || null,
        body.firmaImagen?.trim() || null,
        body.observaciones?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

residuosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoResiduoSolido>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE residuos_solidos SET
        fecha=$2, hora_recaudo=$3, placa_vehiculo=$4, kg_bolsas=$5,
        firma=$6, firma_imagen=$7, observaciones=$8
        WHERE id=$1 AND ${condicionPdv(req.scope, 9).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.horaRecaudo?.trim() || null,
        body.placaVehiculo?.trim() || null,
        body.kgBolsas?.trim() || null,
        body.firma?.trim() || null,
        body.firmaImagen?.trim() || null,
        body.observaciones?.trim() || null,
        ...condicionPdv(req.scope, 9).params,
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

residuosRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM residuos_solidos WHERE id=$1 AND ' +
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
