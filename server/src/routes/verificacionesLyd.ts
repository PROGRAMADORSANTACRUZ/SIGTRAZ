import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type { VerificacionLyd, NuevaVerificacionLyd } from '../types.js'

export const verificacionesLydRouter = Router()

// Normaliza el arreglo de 31 dias con valores validos ('', 'C', 'NC', 'NA').
function normalizarDias(v: unknown): string[] {
  const validos = new Set(['', 'C', 'NC', 'NA'])
  const base = Array.isArray(v) ? v : []
  const out: string[] = []
  for (let i = 0; i < 31; i++) {
    const val = String(base[i] ?? '')
    out.push(validos.has(val) ? val : '')
  }
  return out
}

function map(r: Record<string, unknown>): VerificacionLyd {
  return {
    id: String(r.id),
    superficie: (r.superficie as string | null) ?? undefined,
    frecuencia: (r.frecuencia as string | null) ?? undefined,
    restaurante: (r.restaurante as string | null) ?? undefined,
    mes: (r.mes as string | null) ?? undefined,
    anio: (r.anio as string | null) ?? undefined,
    dias: normalizarDias(r.dias),
    responsable: (r.responsable as string | null) ?? undefined,
    verifica: (r.verifica as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaVerificacionLyd>): string[] {
  const errores: string[] = []
  if (!body.superficie || !body.superficie.trim())
    errores.push('superficie es obligatoria')
  return errores
}

const COLS = `id, superficie, frecuencia, restaurante, mes, anio, dias,
              responsable, verifica, observaciones, fecha_creacion`

verificacionesLydRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM verificaciones_lyd WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

verificacionesLydRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaVerificacionLyd>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const pv = pdvParaCrear(req.scope)
    if (pv == null) {
      res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
      return
    }
    const ins = await query(
      `INSERT INTO verificaciones_lyd
         (superficie, frecuencia, restaurante, mes, anio, dias,
          responsable, verifica, observaciones, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
       RETURNING ${COLS}`,
      [
        body.superficie!.trim(),
        body.frecuencia?.trim() || null,
        body.restaurante?.trim() || null,
        body.mes?.trim() || null,
        body.anio?.trim() || null,
        JSON.stringify(normalizarDias(body.dias)),
        body.responsable?.trim() || null,
        body.verifica?.trim() || null,
        body.observaciones?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

verificacionesLydRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaVerificacionLyd>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE verificaciones_lyd SET
              superficie=$2, frecuencia=$3, restaurante=$4, mes=$5, anio=$6,
              dias=$7::jsonb, responsable=$8, verifica=$9, observaciones=$10
        WHERE id=$1 AND ${condicionPdv(req.scope, 11).clause} RETURNING ${COLS}`,
      [
        id,
        body.superficie!.trim(),
        body.frecuencia?.trim() || null,
        body.restaurante?.trim() || null,
        body.mes?.trim() || null,
        body.anio?.trim() || null,
        JSON.stringify(normalizarDias(body.dias)),
        body.responsable?.trim() || null,
        body.verifica?.trim() || null,
        body.observaciones?.trim() || null,
        ...condicionPdv(req.scope, 11).params,
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

verificacionesLydRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM verificaciones_lyd WHERE id=$1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [id, ...condicionPdv(req.scope, 2).params],
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
