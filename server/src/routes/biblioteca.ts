import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  type NuevoRecursoBiblioteca,
  type RecursoBiblioteca,
} from '../types.js'

export const bibliotecaRouter = Router()

function map(r: Record<string, unknown>): RecursoBiblioteca {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    tipo: (r.tipo as string) ?? undefined,
    categoria: (r.categoria as string) ?? undefined,
    enlace: (r.enlace as string) ?? undefined,
    descripcion: (r.descripcion as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoRecursoBiblioteca>): string[] {
  const errores: string[] = []
  if (!body.titulo || !body.titulo.trim()) errores.push('titulo es obligatorio')
  return errores
}

const COLS = `id, titulo, tipo, categoria, enlace, descripcion, fecha_creacion`

bibliotecaRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM biblioteca ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

bibliotecaRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoRecursoBiblioteca>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO biblioteca (titulo, tipo, categoria, enlace, descripcion)
       VALUES ($1,$2,$3,$4,$5) RETURNING ${COLS}`,
      [
        body.titulo!.trim(),
        body.tipo?.trim() || null,
        body.categoria?.trim() || null,
        body.enlace?.trim() || null,
        body.descripcion?.trim() || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

bibliotecaRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoRecursoBiblioteca>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE biblioteca SET titulo=$2, tipo=$3, categoria=$4, enlace=$5, descripcion=$6
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.titulo!.trim(),
        body.tipo?.trim() || null,
        body.categoria?.trim() || null,
        body.enlace?.trim() || null,
        body.descripcion?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Recurso no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

bibliotecaRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM biblioteca WHERE id=$1 RETURNING id', [
      id,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Recurso no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
