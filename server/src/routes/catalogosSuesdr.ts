import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type {
  CatalogoSuesdr,
  NuevoCatalogoSuesdr,
  TipoCatalogoSuesdr,
} from '../types.js'

export const catalogosSuesdrRouter = Router()

const TIPOS: TipoCatalogoSuesdr[] = [
  'superficie',
  'sustancia',
  'dosificacion',
  'realizado',
]

function map(r: Record<string, unknown>): CatalogoSuesdr {
  return {
    id: String(r.id),
    tipo: r.tipo as TipoCatalogoSuesdr,
    nombre: String(r.nombre),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoCatalogoSuesdr>): string[] {
  const errores: string[] = []
  if (!body.tipo || !TIPOS.includes(body.tipo))
    errores.push('tipo invalido')
  if (!body.nombre || !body.nombre.trim())
    errores.push('nombre es obligatorio')
  return errores
}

const COLS = `id, tipo, nombre, fecha_creacion`

catalogosSuesdrRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM catalogos_suesdr ORDER BY tipo ASC, nombre ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

catalogosSuesdrRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoCatalogoSuesdr>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    // Upsert: no permite duplicados por (tipo, nombre en mayusculas). Catalogo global.
    const ins = await query(
      `INSERT INTO catalogos_suesdr (tipo, nombre)
       VALUES ($1,$2)
       ON CONFLICT (tipo, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING ${COLS}`,
      [body.tipo, body.nombre!.trim().toUpperCase()],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

catalogosSuesdrRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoCatalogoSuesdr>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE catalogos_suesdr SET tipo=$2, nombre=$3
        WHERE id=$1 RETURNING ${COLS}`,
      [id, body.tipo, body.nombre!.trim().toUpperCase()],
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

catalogosSuesdrRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM catalogos_suesdr WHERE id=$1 RETURNING id`,
      [id],
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
