import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type {
  CatalogoLyd,
  NuevoCatalogoLyd,
  TipoCatalogoLyd,
} from '../types.js'

export const catalogosLydRouter = Router()

const TIPOS: TipoCatalogoLyd[] = ['superficie', 'frecuencia']

function map(r: Record<string, unknown>): CatalogoLyd {
  return {
    id: String(r.id),
    tipo: r.tipo as TipoCatalogoLyd,
    nombre: String(r.nombre),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoCatalogoLyd>): string[] {
  const errores: string[] = []
  if (!body.tipo || !TIPOS.includes(body.tipo)) errores.push('tipo invalido')
  if (!body.nombre || !body.nombre.trim())
    errores.push('nombre es obligatorio')
  return errores
}

const COLS = `id, tipo, nombre, fecha_creacion`

catalogosLydRouter.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM catalogos_lyd ORDER BY tipo ASC, nombre ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

catalogosLydRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoCatalogoLyd>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    // Upsert: no permite duplicados por (tipo, nombre en mayusculas). Catalogo global.
    const ins = await query(
      `INSERT INTO catalogos_lyd (tipo, nombre)
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

catalogosLydRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoCatalogoLyd>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE catalogos_lyd SET tipo=$2, nombre=$3
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

catalogosLydRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM catalogos_lyd WHERE id=$1 RETURNING id`,
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
