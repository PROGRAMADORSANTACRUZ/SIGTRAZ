import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  FRECUENCIAS_PROGRAMA,
  type NuevoPrograma,
  type Programa,
} from '../types.js'

export const programasRouter = Router()

function mapPrograma(r: Record<string, unknown>): Programa {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    plantillaId: r.plantilla_id != null ? String(r.plantilla_id) : undefined,
    plantillaNombre: (r.plantilla_nombre as string) ?? undefined,
    frecuencia: r.frecuencia as Programa['frecuencia'],
    responsable: (r.responsable as string) ?? undefined,
    proximaFecha: (r.proxima_fecha as string) ?? undefined,
    activo: Boolean(r.activo),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoPrograma>): string[] {
  const errores: string[] = []
  if (!body.nombre || !body.nombre.trim()) {
    errores.push('nombre es obligatorio')
  }
  if (body.frecuencia && !FRECUENCIAS_PROGRAMA.includes(body.frecuencia)) {
    errores.push('frecuencia invalida')
  }
  return errores
}

function plantillaIdNum(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

const SELECT_BASE = `
  SELECT pr.id, pr.nombre, pr.plantilla_id, p.nombre AS plantilla_nombre,
         pr.frecuencia, pr.responsable, pr.proxima_fecha, pr.activo,
         pr.fecha_creacion
    FROM programas pr
    LEFT JOIN plantillas p ON p.id = pr.plantilla_id`

programasRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(`${SELECT_BASE} ORDER BY pr.fecha_creacion DESC`)
    res.json(rows.map(mapPrograma))
  } catch (err) {
    next(err)
  }
})

programasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoPrograma>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const insert = await query(
      `INSERT INTO programas
         (nombre, plantilla_id, frecuencia, responsable, proxima_fecha, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        body.nombre!.trim(),
        plantillaIdNum(body.plantillaId),
        body.frecuencia ?? 'Mensual',
        body.responsable?.trim() || null,
        body.proximaFecha || null,
        body.activo ?? true,
      ],
    )

    const rows = await query(`${SELECT_BASE} WHERE pr.id = $1`, [insert[0].id])
    res.status(201).json(mapPrograma(rows[0]))
  } catch (err) {
    next(err)
  }
})

programasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoPrograma>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const actualizado = await query(
      `UPDATE programas
          SET nombre = $2, plantilla_id = $3, frecuencia = $4,
              responsable = $5, proxima_fecha = $6, activo = $7
        WHERE id = $1
      RETURNING id`,
      [
        id,
        body.nombre!.trim(),
        plantillaIdNum(body.plantillaId),
        body.frecuencia ?? 'Mensual',
        body.responsable?.trim() || null,
        body.proximaFecha || null,
        body.activo ?? true,
      ],
    )

    if (actualizado.length === 0) {
      res.status(404).json({ error: 'Programa no encontrado' })
      return
    }

    const rows = await query(`${SELECT_BASE} WHERE pr.id = $1`, [id])
    res.json(mapPrograma(rows[0]))
  } catch (err) {
    next(err)
  }
})

programasRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM programas WHERE id = $1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Programa no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
