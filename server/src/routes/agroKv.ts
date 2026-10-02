import { Router } from 'express'
import { query } from '../db.js'

export const agroKvRouter = Router()

const preferencias = new Set(['sigtraz_tema', 'sigtraz_vista', 'sigtraz_pdv', 'sigtraz_bascula_baud'])

agroKvRouter.get('/', async (req, res, next) => {
  try {
    const prefijo = `usuario:${req.usuario!.sub}:`
    const rows = await query('SELECT clave, valor FROM agro_kv WHERE clave NOT LIKE $1 OR starts_with(clave, $2)', ['usuario:%', prefijo])
    res.json(rows.filter((r) => !preferencias.has(String(r.clave))).map((r) => ({
      clave: String(r.clave).startsWith(prefijo) ? String(r.clave).slice(prefijo.length) : r.clave,
      valor: r.valor,
    })))
  } catch (err) {
    next(err)
  }
})

// PUT /:clave -> guarda (upsert) el valor de una clave. Body: { valor: <json> }.
agroKvRouter.put('/:clave', async (req, res, next) => {
  try {
    const entrada = String(req.params.clave)
    if (!entrada || entrada.length > 200 || !(entrada.startsWith('agro_') || entrada.startsWith('sigtraz_agro_catalogo_') || entrada.startsWith('sigtraz_seed_') || preferencias.has(entrada))) {
      res.status(400).json({ errores: ['clave invalida'] })
      return
    }
    const clave = preferencias.has(entrada) ? `usuario:${req.usuario!.sub}:${entrada}` : entrada
    const body = (req.body ?? {}) as Record<string, unknown>
    if (!('valor' in body)) {
      res.status(400).json({ errores: ['falta el campo valor'] })
      return
    }
    const valor = JSON.stringify(body.valor)
    const filas = 'anterior' in body
      ? await query(
          'UPDATE agro_kv SET valor = $2::jsonb, fecha_actualizacion = now() WHERE clave = $1 AND valor = $3::jsonb RETURNING clave',
          [clave, valor, JSON.stringify(body.anterior)],
        )
      : await query(
          'INSERT INTO agro_kv (clave, valor, fecha_actualizacion) VALUES ($1, $2::jsonb, now()) ON CONFLICT (clave) DO NOTHING RETURNING clave',
          [clave, valor],
        )
    if (!filas.length) {
      const iguales = await query('SELECT clave FROM agro_kv WHERE clave = $1 AND valor = $2::jsonb', [clave, valor])
      if (!iguales.length) {
        res.status(409).json({ errores: ['Los datos cambiaron en otro equipo. Descarga tus cambios pendientes y recarga antes de guardar.'] })
        return
      }
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
