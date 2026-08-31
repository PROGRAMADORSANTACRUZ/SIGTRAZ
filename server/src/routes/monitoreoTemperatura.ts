import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type {
  MonitoreoTemperatura,
  MedicionTemp,
  NuevoMonitoreoTemperatura,
} from '../types.js'

export const monitoreoTemperaturaRouter = Router()

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizarMediciones(v: unknown): MedicionTemp[] {
  const base: MedicionTemp[] = Array.from({ length: 31 }, () => ({
    manianaEquipo: null,
    manianaProducto: null,
    tardeEquipo: null,
    tardeProducto: null,
  }))
  if (!Array.isArray(v)) return base
  v.slice(0, 31).forEach((m, i) => {
    const item = (m ?? {}) as Record<string, unknown>
    base[i] = {
      manianaEquipo: num(item.manianaEquipo),
      manianaProducto: num(item.manianaProducto),
      tardeEquipo: num(item.tardeEquipo),
      tardeProducto: num(item.tardeProducto),
    }
  })
  return base
}

function map(r: Record<string, unknown>): MonitoreoTemperatura {
  return {
    id: String(r.id),
    puntoVenta: (r.punto_venta as string) ?? undefined,
    ubicacion: (r.ubicacion as string) ?? undefined,
    cuartoFrioId: r.cuarto_frio_id == null ? undefined : Number(r.cuarto_frio_id),
    serial: (r.serial as string) ?? undefined,
    mes: (r.mes as string) ?? undefined,
    anio: r.anio == null ? undefined : Number(r.anio),
    funcionarios: (r.funcionarios as string) ?? undefined,
    observaciones: (r.observaciones as string) ?? undefined,
    mediciones: normalizarMediciones(r.mediciones),
    fechaCreacion:
      typeof r.fecha_creacion === 'string'
        ? r.fecha_creacion
        : (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoMonitoreoTemperatura>): string[] {
  const errores: string[] = []
  if (!body.puntoVenta?.trim()) errores.push('punto de venta es obligatorio')
  return errores
}

const COLS = `id, punto_venta, ubicacion, cuarto_frio_id, serial, mes, anio, funcionarios, observaciones, mediciones, fecha_creacion`

monitoreoTemperaturaRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM monitoreo_temperatura WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

monitoreoTemperaturaRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoMonitoreoTemperatura>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const mediciones = normalizarMediciones(body.mediciones)
    const pv = pdvParaCrear(req.scope)
    if (pv == null) {
      res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
      return
    }
    const ins = await query(
      `INSERT INTO monitoreo_temperatura
        (punto_venta, ubicacion, cuarto_frio_id, serial, mes, anio, funcionarios, observaciones, mediciones, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING ${COLS}`,
      [
        body.puntoVenta!.trim(),
        body.ubicacion?.trim() || null,
        body.cuartoFrioId ?? null,
        body.serial?.trim() || null,
        body.mes?.trim() || null,
        body.anio ?? null,
        body.funcionarios?.trim() || null,
        body.observaciones?.trim() || null,
        JSON.stringify(mediciones),
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

monitoreoTemperaturaRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoMonitoreoTemperatura>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const mediciones = normalizarMediciones(body.mediciones)
    const upd = await query(
      `UPDATE monitoreo_temperatura SET
        punto_venta=$2, ubicacion=$3, cuarto_frio_id=$4, serial=$5, mes=$6, anio=$7,
        funcionarios=$8, observaciones=$9, mediciones=$10::jsonb
        WHERE id=$1 AND ${condicionPdv(req.scope, 11).clause} RETURNING ${COLS}`,
      [
        id,
        body.puntoVenta!.trim(),
        body.ubicacion?.trim() || null,
        body.cuartoFrioId ?? null,
        body.serial?.trim() || null,
        body.mes?.trim() || null,
        body.anio ?? null,
        body.funcionarios?.trim() || null,
        body.observaciones?.trim() || null,
        JSON.stringify(mediciones),
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

monitoreoTemperaturaRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM monitoreo_temperatura WHERE id=$1 AND ' +
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
