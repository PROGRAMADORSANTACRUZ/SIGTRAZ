import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_TRABAJADOR_SOLITARIO,
  type NuevoTrabajadorSolitario,
  type TrabajadorSolitario,
} from '../types.js'

export const trabajadoresSolitariosRouter = Router()

function map(r: Record<string, unknown>): TrabajadorSolitario {
  return {
    id: String(r.id),
    trabajador: r.trabajador as string,
    ubicacion: (r.ubicacion as string) ?? undefined,
    actividad: (r.actividad as string) ?? undefined,
    estado: r.estado as TrabajadorSolitario['estado'],
    fecha: (r.fecha as string) ?? undefined,
    horaInicio: (r.hora_inicio as string) ?? undefined,
    horaFin: (r.hora_fin as string) ?? undefined,
    contactoEmergencia: (r.contacto_emergencia as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoTrabajadorSolitario>): string[] {
  const errores: string[] = []
  if (!body.trabajador || !body.trabajador.trim()) {
    errores.push('trabajador es obligatorio')
  }
  if (body.estado && !ESTADOS_TRABAJADOR_SOLITARIO.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, trabajador, ubicacion, actividad, estado, fecha, hora_inicio,
              hora_fin, contacto_emergencia, fecha_creacion`

trabajadoresSolitariosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM trabajadores_solitarios ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

trabajadoresSolitariosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoTrabajadorSolitario>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO trabajadores_solitarios
         (trabajador, ubicacion, actividad, estado, fecha, hora_inicio, hora_fin, contacto_emergencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.trabajador!.trim(),
        body.ubicacion?.trim() || null,
        body.actividad?.trim() || null,
        body.estado ?? 'Activo',
        body.fecha || null,
        body.horaInicio?.trim() || null,
        body.horaFin?.trim() || null,
        body.contactoEmergencia?.trim() || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

trabajadoresSolitariosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoTrabajadorSolitario>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE trabajadores_solitarios SET trabajador=$2, ubicacion=$3, actividad=$4,
              estado=$5, fecha=$6, hora_inicio=$7, hora_fin=$8, contacto_emergencia=$9
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.trabajador!.trim(),
        body.ubicacion?.trim() || null,
        body.actividad?.trim() || null,
        body.estado ?? 'Activo',
        body.fecha || null,
        body.horaInicio?.trim() || null,
        body.horaFin?.trim() || null,
        body.contactoEmergencia?.trim() || null,
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

trabajadoresSolitariosRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM trabajadores_solitarios WHERE id=$1 RETURNING id',
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
