import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  type ArticuloMercado,
  type NuevoArticuloMercado,
} from '../types.js'

export const mercadoRouter = Router()

function map(r: Record<string, unknown>): ArticuloMercado {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    categoria: (r.categoria as string) ?? undefined,
    proveedor: (r.proveedor as string) ?? undefined,
    precio: r.precio != null ? Number(r.precio) : undefined,
    unidad: (r.unidad as string) ?? undefined,
    disponible: Boolean(r.disponible),
    descripcion: (r.descripcion as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoArticuloMercado>): string[] {
  const errores: string[] = []
  if (!body.nombre || !body.nombre.trim()) errores.push('nombre es obligatorio')
  return errores
}

const COLS = `id, nombre, categoria, proveedor, precio, unidad, disponible,
              descripcion, fecha_creacion`

mercadoRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM mercado ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

mercadoRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoArticuloMercado>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO mercado
         (nombre, categoria, proveedor, precio, unidad, disponible, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [
        body.nombre!.trim(),
        body.categoria?.trim() || null,
        body.proveedor?.trim() || null,
        body.precio ?? null,
        body.unidad?.trim() || null,
        body.disponible ?? true,
        body.descripcion?.trim() || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

mercadoRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoArticuloMercado>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE mercado SET nombre=$2, categoria=$3, proveedor=$4, precio=$5,
              unidad=$6, disponible=$7, descripcion=$8
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.nombre!.trim(),
        body.categoria?.trim() || null,
        body.proveedor?.trim() || null,
        body.precio ?? null,
        body.unidad?.trim() || null,
        body.disponible ?? true,
        body.descripcion?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Articulo no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

mercadoRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM mercado WHERE id=$1 RETURNING id', [
      id,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Articulo no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
