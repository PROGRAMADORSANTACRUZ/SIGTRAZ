import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_INSPECCION,
  TIPOS_ITEM_PLANTILLA,
  type Inspeccion,
  type NuevaInspeccion,
  type RespuestaInspeccion,
} from '../types.js'

export const inspeccionesRouter = Router()

function normalizarRespuestas(valor: unknown): RespuestaInspeccion[] {
  if (!Array.isArray(valor)) return []
  const respuestas: RespuestaInspeccion[] = []
  for (const r of valor) {
    if (!r || typeof r !== 'object') continue
    const raw = r as Record<string, unknown>
    const texto = String(raw.texto ?? '').trim()
    if (!texto) continue
    const tipo = TIPOS_ITEM_PLANTILLA.includes(
      raw.tipo as RespuestaInspeccion['tipo'],
    )
      ? (raw.tipo as RespuestaInspeccion['tipo'])
      : 'texto'
    respuestas.push({ texto, tipo, valor: String(raw.valor ?? '') })
  }
  return respuestas
}

function mapInspeccion(r: Record<string, unknown>): Inspeccion {
  return {
    id: String(r.id),
    plantillaId: r.plantilla_id != null ? String(r.plantilla_id) : undefined,
    plantillaNombre: (r.plantilla_nombre as string) ?? undefined,
    inspector: (r.inspector as string) ?? undefined,
    ubicacion: (r.ubicacion as string) ?? undefined,
    estado: r.estado as Inspeccion['estado'],
    fecha: (r.fecha as string) ?? undefined,
    respuestas: normalizarRespuestas(r.respuestas),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaInspeccion>): string[] {
  const errores: string[] = []
  if (body.estado && !ESTADOS_INSPECCION.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

function plantillaIdNum(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

const SELECT_BASE = `
  SELECT i.id, i.plantilla_id, p.nombre AS plantilla_nombre, i.inspector,
         i.ubicacion, i.estado, i.fecha, i.respuestas, i.fecha_creacion
    FROM inspecciones i
    LEFT JOIN plantillas p ON p.id = i.plantilla_id`

inspeccionesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(`${SELECT_BASE} ORDER BY i.fecha_creacion DESC`)
    res.json(rows.map(mapInspeccion))
  } catch (err) {
    next(err)
  }
})

inspeccionesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaInspeccion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const respuestas = normalizarRespuestas(body.respuestas)
    const insert = await query(
      `INSERT INTO inspecciones
         (plantilla_id, inspector, ubicacion, estado, fecha, respuestas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        plantillaIdNum(body.plantillaId),
        body.inspector?.trim() || null,
        body.ubicacion?.trim() || null,
        body.estado ?? 'Pendiente',
        body.fecha || null,
        JSON.stringify(respuestas),
      ],
    )

    const rows = await query(`${SELECT_BASE} WHERE i.id = $1`, [insert[0].id])
    res.status(201).json(mapInspeccion(rows[0]))
  } catch (err) {
    next(err)
  }
})

inspeccionesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaInspeccion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const respuestas = normalizarRespuestas(body.respuestas)
    const actualizado = await query(
      `UPDATE inspecciones
          SET plantilla_id = $2, inspector = $3, ubicacion = $4,
              estado = $5, fecha = $6, respuestas = $7
        WHERE id = $1
      RETURNING id`,
      [
        id,
        plantillaIdNum(body.plantillaId),
        body.inspector?.trim() || null,
        body.ubicacion?.trim() || null,
        body.estado ?? 'Pendiente',
        body.fecha || null,
        JSON.stringify(respuestas),
      ],
    )

    if (actualizado.length === 0) {
      res.status(404).json({ error: 'Inspeccion no encontrada' })
      return
    }

    const rows = await query(`${SELECT_BASE} WHERE i.id = $1`, [id])
    res.json(mapInspeccion(rows[0]))
  } catch (err) {
    next(err)
  }
})

inspeccionesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM inspecciones WHERE id = $1 RETURNING id',
      [id],
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
