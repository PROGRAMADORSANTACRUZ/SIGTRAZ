import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  TIPOS_ITEM_PLANTILLA,
  type ItemPlantilla,
  type NuevaPlantilla,
  type Plantilla,
} from '../types.js'

export const plantillasRouter = Router()

function normalizarItems(valor: unknown): ItemPlantilla[] {
  if (!Array.isArray(valor)) return []
  const items: ItemPlantilla[] = []
  for (const it of valor) {
    if (!it || typeof it !== 'object') continue
    const raw = it as Record<string, unknown>
    const texto = String(raw.texto ?? '').trim()
    if (!texto) continue
    const tipo = TIPOS_ITEM_PLANTILLA.includes(
      raw.tipo as ItemPlantilla['tipo'],
    )
      ? (raw.tipo as ItemPlantilla['tipo'])
      : 'texto'
    const opciones =
      tipo === 'seleccion' && Array.isArray(raw.opciones)
        ? raw.opciones.map((o) => String(o).trim()).filter(Boolean)
        : undefined
    items.push({ texto, tipo, opciones })
  }
  return items
}

function mapPlantilla(r: Record<string, unknown>): Plantilla {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    descripcion: (r.descripcion as string) ?? undefined,
    categoria: (r.categoria as string) ?? undefined,
    items: normalizarItems(r.items),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaPlantilla>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  return errores
}

plantillasRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, nombre, descripcion, categoria, items, fecha_creacion
         FROM plantillas
        ORDER BY nombre`,
    )
    res.json(rows.map(mapPlantilla))
  } catch (err) {
    next(err)
  }
})

plantillasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaPlantilla>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const items = normalizarItems(body.items)
    const rows = await query(
      `INSERT INTO plantillas (nombre, descripcion, categoria, items)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, categoria, items, fecha_creacion`,
      [
        body.nombre!.trim(),
        body.descripcion?.trim() || null,
        body.categoria?.trim() || null,
        JSON.stringify(items),
      ],
    )

    res.status(201).json(mapPlantilla(rows[0]))
  } catch (err) {
    next(err)
  }
})

plantillasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaPlantilla>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const items = normalizarItems(body.items)
    const rows = await query(
      `UPDATE plantillas
          SET nombre = $2, descripcion = $3, categoria = $4, items = $5
        WHERE id = $1
      RETURNING id, nombre, descripcion, categoria, items, fecha_creacion`,
      [
        id,
        body.nombre!.trim(),
        body.descripcion?.trim() || null,
        body.categoria?.trim() || null,
        JSON.stringify(items),
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Plantilla no encontrada' })
      return
    }

    res.json(mapPlantilla(rows[0]))
  } catch (err) {
    next(err)
  }
})

plantillasRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM plantillas WHERE id = $1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Plantilla no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
