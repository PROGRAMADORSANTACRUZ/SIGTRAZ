import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type {
  InspeccionHigiene,
  NuevaInspeccionHigiene,
} from '../types.js'

export const inspeccionesHigieneRouter = Router()

// Normaliza las 4 semanas: array de 4 valores en {'', '0', '1'}.
function normalizarSemanas(v: unknown): string[] {
  const base = Array.isArray(v) ? v : []
  return Array.from({ length: 4 }, (_, i) => {
    const s = String(base[i] ?? '').trim()
    return s === '0' || s === '1' ? s : ''
  })
}

function map(r: Record<string, unknown>): InspeccionHigiene {
  return {
    id: String(r.id),
    operario: (r.operario as string) ?? undefined,
    evaluacion: (r.evaluacion as string) ?? undefined,
    mes: (r.mes as string) ?? undefined,
    anio: (r.anio as string) ?? undefined,
    semanas: normalizarSemanas(r.semanas),
    observacion: (r.observacion as string) ?? undefined,
    firma: (r.firma as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaInspeccionHigiene>): string[] {
  const errores: string[] = []
  if (!body.operario?.trim()) errores.push('operario es obligatorio')
  return errores
}

const COLS = `id, operario, evaluacion, mes, anio, semanas, observacion, firma, fecha_creacion`

inspeccionesHigieneRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM inspecciones_higiene WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

inspeccionesHigieneRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaInspeccionHigiene>
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
      `INSERT INTO inspecciones_higiene
         (operario, evaluacion, mes, anio, semanas, observacion, firma, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.operario!.trim(),
        body.evaluacion?.trim() || null,
        body.mes || null,
        body.anio?.trim() || null,
        JSON.stringify(normalizarSemanas(body.semanas)),
        body.observacion?.trim() || null,
        body.firma?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

inspeccionesHigieneRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaInspeccionHigiene>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE inspecciones_higiene SET
         operario=$2, evaluacion=$3, mes=$4, anio=$5,
         semanas=$6::jsonb, observacion=$7, firma=$8
        WHERE id=$1 AND ${condicionPdv(req.scope, 9).clause} RETURNING ${COLS}`,
      [
        id,
        body.operario!.trim(),
        body.evaluacion?.trim() || null,
        body.mes || null,
        body.anio?.trim() || null,
        JSON.stringify(normalizarSemanas(body.semanas)),
        body.observacion?.trim() || null,
        body.firma?.trim() || null,
        ...condicionPdv(req.scope, 9).params,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Inspeccion no encontrada' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

inspeccionesHigieneRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM inspecciones_higiene WHERE id=$1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Inspeccion no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
