import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type { MonitoreoAgua, NuevoMonitoreoAgua } from '../types.js'

export const monitoreoAguaRouter = Router()

function map(r: Record<string, unknown>): MonitoreoAgua {
  return {
    id: String(r.id),
    fecha: r.fecha
      ? typeof r.fecha === 'string'
        ? r.fecha.slice(0, 10)
        : (r.fecha as Date).toISOString().slice(0, 10)
      : undefined,
    lugar: (r.lugar as string) ?? undefined,
    cloroResidual: (r.cloro_residual as string) ?? undefined,
    ph: (r.ph as string) ?? undefined,
    accionesCorrectivas: (r.acciones_correctivas as string) ?? undefined,
    responsable: (r.responsable as string) ?? undefined,
    observaciones: (r.observaciones as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoMonitoreoAgua>): string[] {
  const errores: string[] = []
  if (!body.lugar?.trim()) errores.push('lugar es obligatorio')
  return errores
}

const COLS = `id, fecha, lugar, cloro_residual, ph, acciones_correctivas, responsable, observaciones, fecha_creacion`

monitoreoAguaRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM monitoreo_agua WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

monitoreoAguaRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoMonitoreoAgua>
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
      `INSERT INTO monitoreo_agua
        (fecha, lugar, cloro_residual, ph, acciones_correctivas, responsable, observaciones, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.lugar!.trim(),
        body.cloroResidual?.trim() || null,
        body.ph?.trim() || null,
        body.accionesCorrectivas?.trim() || null,
        body.responsable?.trim() || null,
        body.observaciones?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

monitoreoAguaRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoMonitoreoAgua>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE monitoreo_agua SET
        fecha=$2, lugar=$3, cloro_residual=$4, ph=$5,
        acciones_correctivas=$6, responsable=$7, observaciones=$8
        WHERE id=$1 AND ${condicionPdv(req.scope, 9).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.lugar!.trim(),
        body.cloroResidual?.trim() || null,
        body.ph?.trim() || null,
        body.accionesCorrectivas?.trim() || null,
        body.responsable?.trim() || null,
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

monitoreoAguaRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM monitoreo_agua WHERE id=$1 AND ' +
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
