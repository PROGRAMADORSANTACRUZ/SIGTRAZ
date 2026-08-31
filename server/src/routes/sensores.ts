import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { ESTADOS_SENSOR, type NuevoSensor, type Sensor } from '../types.js'

export const sensoresRouter = Router()

function map(r: Record<string, unknown>): Sensor {
  return {
    id: String(r.id),
    codigo: (r.codigo as string) ?? undefined,
    nombre: r.nombre as string,
    tipo: (r.tipo as string) ?? undefined,
    ubicacion: (r.ubicacion as string) ?? undefined,
    unidad: (r.unidad as string) ?? undefined,
    valorActual: r.valor_actual != null ? Number(r.valor_actual) : undefined,
    estado: r.estado as Sensor['estado'],
    ultimaLectura: (r.ultima_lectura as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoSensor>): string[] {
  const errores: string[] = []
  if (!body.nombre || !body.nombre.trim()) errores.push('nombre es obligatorio')
  if (body.estado && !ESTADOS_SENSOR.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, codigo, nombre, tipo, ubicacion, unidad, valor_actual, estado,
              ultima_lectura, fecha_creacion`

sensoresRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM sensores ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

sensoresRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoSensor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO sensores
         (codigo, nombre, tipo, ubicacion, unidad, valor_actual, estado, ultima_lectura)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [
        body.codigo?.trim() || null,
        body.nombre!.trim(),
        body.tipo?.trim() || null,
        body.ubicacion?.trim() || null,
        body.unidad?.trim() || null,
        body.valorActual ?? null,
        body.estado ?? 'Normal',
        body.ultimaLectura || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

sensoresRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoSensor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE sensores SET codigo=$2, nombre=$3, tipo=$4, ubicacion=$5, unidad=$6,
              valor_actual=$7, estado=$8, ultima_lectura=$9
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.codigo?.trim() || null,
        body.nombre!.trim(),
        body.tipo?.trim() || null,
        body.ubicacion?.trim() || null,
        body.unidad?.trim() || null,
        body.valorActual ?? null,
        body.estado ?? 'Normal',
        body.ultimaLectura || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Sensor no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

sensoresRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM sensores WHERE id=$1 RETURNING id', [
      id,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Sensor no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
