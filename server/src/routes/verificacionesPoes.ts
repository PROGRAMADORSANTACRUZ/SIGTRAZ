import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type { VerificacionPoes, NuevaVerificacionPoes } from '../types.js'

export const verificacionesPoesRouter = Router()

function map(r: Record<string, unknown>): VerificacionPoes {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha).slice(0, 10)
        : undefined,
    hora: (r.hora as string | null) ?? undefined,
    superficie: (r.superficie as string | null) ?? undefined,
    sustancia: (r.sustancia as string | null) ?? undefined,
    dosificacion: (r.dosificacion as string | null) ?? undefined,
    verificacion: (r.verificacion as string | null) ?? undefined,
    realizo: (r.realizo as string | null) ?? undefined,
    verifico: (r.verifico as string | null) ?? undefined,
    accionCorrectiva: (r.accion_correctiva as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaVerificacionPoes>): string[] {
  const errores: string[] = []
  if (!body.superficie || !body.superficie.trim())
    errores.push('superficie es obligatoria')
  return errores
}

const COLS = `id, fecha, hora, superficie, sustancia, dosificacion,
              verificacion, realizo, verifico, accion_correctiva,
              fecha_creacion`

verificacionesPoesRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM verificaciones_poes WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

verificacionesPoesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaVerificacionPoes>
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
      `INSERT INTO verificaciones_poes
         (fecha, hora, superficie, sustancia, dosificacion, verificacion,
          realizo, verifico, accion_correctiva, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.hora?.trim() || null,
        body.superficie!.trim(),
        body.sustancia?.trim() || null,
        body.dosificacion?.trim() || null,
        body.verificacion?.trim() || null,
        body.realizo?.trim() || null,
        body.verifico?.trim() || null,
        body.accionCorrectiva?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

verificacionesPoesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaVerificacionPoes>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE verificaciones_poes SET
              fecha=$2, hora=$3, superficie=$4, sustancia=$5,
              dosificacion=$6, verificacion=$7, realizo=$8, verifico=$9,
              accion_correctiva=$10
        WHERE id=$1 AND ${condicionPdv(req.scope, 11).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.hora?.trim() || null,
        body.superficie!.trim(),
        body.sustancia?.trim() || null,
        body.dosificacion?.trim() || null,
        body.verificacion?.trim() || null,
        body.realizo?.trim() || null,
        body.verifico?.trim() || null,
        body.accionCorrectiva?.trim() || null,
        ...condicionPdv(req.scope, 11).params,
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

verificacionesPoesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM verificaciones_poes WHERE id=$1 AND ' +
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
