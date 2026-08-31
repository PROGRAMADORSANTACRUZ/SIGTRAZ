import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type { NuevoPersonal, Personal } from '../types.js'

export const personalRouter = Router()

function map(r: Record<string, unknown>): Personal {
  return {
    id: String(r.id),
    cedula: (r.cedula as string) ?? undefined,
    nombres: (r.nombres as string) ?? undefined,
    puntoVenta: (r.punto_venta as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoPersonal>): string[] {
  const errores: string[] = []
  if (!body.cedula?.trim()) errores.push('cedula es obligatoria')
  if (!body.nombres?.trim()) errores.push('nombres y apellidos son obligatorios')
  return errores
}

const COLS = `id, cedula, nombres, punto_venta, fecha_creacion`

personalRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM personal ORDER BY nombres ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

personalRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoPersonal>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const cedula = body.cedula!.trim()
    const duplicado = await query(
      'SELECT 1 FROM personal WHERE UPPER(cedula) = UPPER($1)',
      [cedula],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['La cedula ya esta registrada'] })
      return
    }
    // Personal global (compartido por todos los puntos de venta).
    const ins = await query(
      `INSERT INTO personal (cedula, nombres, punto_venta)
       VALUES ($1,$2,$3) RETURNING ${COLS}`,
      [cedula, body.nombres!.trim(), body.puntoVenta?.trim() || null],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

personalRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoPersonal>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE personal SET cedula=$2, nombres=$3, punto_venta=$4
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.cedula!.trim(),
        body.nombres!.trim(),
        body.puntoVenta?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Personal no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

personalRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM personal WHERE id=$1 RETURNING id`,
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Personal no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
