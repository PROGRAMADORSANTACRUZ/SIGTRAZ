import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_CONTRATISTA,
  type Contratista,
  type NuevoContratista,
} from '../types.js'

export const contratistasRouter = Router()

function map(r: Record<string, unknown>): Contratista {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    empresa: (r.empresa as string) ?? undefined,
    documento: (r.documento as string) ?? undefined,
    contacto: (r.contacto as string) ?? undefined,
    especialidad: (r.especialidad as string) ?? undefined,
    estado: r.estado as Contratista['estado'],
    fechaInicio: (r.fecha_inicio as string) ?? undefined,
    fechaFin: (r.fecha_fin as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoContratista>): string[] {
  const errores: string[] = []
  if (!body.nombre || !body.nombre.trim()) errores.push('nombre es obligatorio')
  if (body.estado && !ESTADOS_CONTRATISTA.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, nombre, empresa, documento, contacto, especialidad, estado,
              fecha_inicio, fecha_fin, fecha_creacion`

contratistasRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM contratistas ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

contratistasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoContratista>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO contratistas
         (nombre, empresa, documento, contacto, especialidad, estado, fecha_inicio, fecha_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.nombre!.trim(),
        body.empresa?.trim() || null,
        body.documento?.trim() || null,
        body.contacto?.trim() || null,
        body.especialidad?.trim() || null,
        body.estado ?? 'Activo',
        body.fechaInicio || null,
        body.fechaFin || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

contratistasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoContratista>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE contratistas SET nombre=$2, empresa=$3, documento=$4, contacto=$5,
              especialidad=$6, estado=$7, fecha_inicio=$8, fecha_fin=$9
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.nombre!.trim(),
        body.empresa?.trim() || null,
        body.documento?.trim() || null,
        body.contacto?.trim() || null,
        body.especialidad?.trim() || null,
        body.estado ?? 'Activo',
        body.fechaInicio || null,
        body.fechaFin || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Contratista no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

contratistasRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM contratistas WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Contratista no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
