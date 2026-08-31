import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { ESTADOS_ACTIVO, type NuevoActivo, type Activo } from '../types.js'

export const activosRouter = Router()

function mapActivo(r: Record<string, unknown>): Activo {
  return {
    id: String(r.id),
    codigo: r.codigo as string,
    nombre: r.nombre as string,
    categoria: (r.categoria as string) ?? undefined,
    ubicacion: (r.ubicacion as string) ?? undefined,
    responsable: (r.responsable as string) ?? undefined,
    estado: r.estado as Activo['estado'],
    fechaAdquisicion: (r.fecha_adquisicion as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoActivo>): string[] {
  const errores: string[] = []
  if (!body.codigo?.trim()) errores.push('codigo es obligatorio')
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (body.estado && !ESTADOS_ACTIVO.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

activosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, codigo, nombre, categoria, ubicacion, responsable, estado,
              fecha_adquisicion, fecha_creacion
         FROM activos
        ORDER BY nombre`,
    )
    res.json(rows.map(mapActivo))
  } catch (err) {
    next(err)
  }
})

activosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoActivo>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const codigo = body.codigo!.trim()
    const duplicado = await query(
      'SELECT 1 FROM activos WHERE UPPER(codigo) = UPPER($1)',
      [codigo],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El codigo ya esta registrado'] })
      return
    }

    const rows = await query(
      `INSERT INTO activos
         (codigo, nombre, categoria, ubicacion, responsable, estado, fecha_adquisicion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, codigo, nombre, categoria, ubicacion, responsable, estado,
                 fecha_adquisicion, fecha_creacion`,
      [
        codigo,
        body.nombre!.trim(),
        body.categoria?.trim() || null,
        body.ubicacion?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Operativo',
        body.fechaAdquisicion || null,
      ],
    )

    res.status(201).json(mapActivo(rows[0]))
  } catch (err) {
    next(err)
  }
})

activosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoActivo>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const codigo = body.codigo!.trim()
    const duplicado = await query(
      'SELECT 1 FROM activos WHERE UPPER(codigo) = UPPER($1) AND id <> $2',
      [codigo, id],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El codigo ya esta registrado'] })
      return
    }

    const rows = await query(
      `UPDATE activos
          SET codigo = $2, nombre = $3, categoria = $4, ubicacion = $5,
              responsable = $6, estado = $7, fecha_adquisicion = $8
        WHERE id = $1
      RETURNING id, codigo, nombre, categoria, ubicacion, responsable, estado,
                fecha_adquisicion, fecha_creacion`,
      [
        id,
        codigo,
        body.nombre!.trim(),
        body.categoria?.trim() || null,
        body.ubicacion?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Operativo',
        body.fechaAdquisicion || null,
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Activo no encontrado' })
      return
    }

    res.json(mapActivo(rows[0]))
  } catch (err) {
    next(err)
  }
})

activosRouter.delete('/:id', async (req, res, next) => {
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

    const rows = await query('DELETE FROM activos WHERE id = $1 RETURNING id', [
      id,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Activo no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
