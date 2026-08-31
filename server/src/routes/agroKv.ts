import { Router } from 'express'
import { query } from '../db.js'

export const agroKvRouter = Router()

// Almacen clave-valor generico para los modulos de Agropecuaria. El cliente
// refleja aqui cada clave de localStorage con prefijo agro_ (o de catalogo),
// de modo que los datos se comparten entre PC y celular.

// GET / -> todas las claves con su valor. El cliente las vuelca en localStorage
// al iniciar sesion / al recargar la app.
agroKvRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query('SELECT clave, valor FROM agro_kv')
    res.json(rows.map((r) => ({ clave: r.clave, valor: r.valor })))
  } catch (err) {
    next(err)
  }
})

// PUT /:clave -> guarda (upsert) el valor de una clave. Body: { valor: <json> }.
agroKvRouter.put('/:clave', async (req, res, next) => {
  try {
    const clave = String(req.params.clave)
    if (!clave || clave.length > 200) {
      res.status(400).json({ errores: ['clave invalida'] })
      return
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    if (!('valor' in body)) {
      res.status(400).json({ errores: ['falta el campo valor'] })
      return
    }
    await query(
      'INSERT INTO agro_kv (clave, valor, fecha_actualizacion)' +
        ' VALUES ($1, $2, now())' +
        ' ON CONFLICT (clave) DO UPDATE' +
        ' SET valor = EXCLUDED.valor, fecha_actualizacion = now()',
      [clave, JSON.stringify(body.valor)],
    )
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
