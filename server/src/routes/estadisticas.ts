import { Router } from 'express'
import { query } from '../db.js'

export const estadisticasRouter = Router()

async function contar(sql: string): Promise<number> {
  const rows = await query<{ n: string }>(sql)
  return Number(rows[0]?.n ?? 0)
}

async function porGrupo(
  sql: string,
): Promise<{ etiqueta: string; valor: number }[]> {
  const rows = await query<{ etiqueta: string; n: string }>(sql)
  return rows.map((r) => ({
    etiqueta: r.etiqueta ?? 'Sin dato',
    valor: Number(r.n),
  }))
}

estadisticasRouter.get('/', async (_req, res, next) => {
  try {
    const [
      totales,
      accionesPorEstado,
      inspeccionesPorEstado,
      activosPorEstado,
      contratiemposPorGravedad,
      sensoresPorEstado,
    ] = await Promise.all([
      (async () => ({
        acciones: await contar('SELECT COUNT(*) AS n FROM acciones'),
        inspecciones: await contar('SELECT COUNT(*) AS n FROM inspecciones'),
        activos: await contar('SELECT COUNT(*) AS n FROM activos'),
        contratistas: await contar('SELECT COUNT(*) AS n FROM contratistas'),
        contratiempos: await contar('SELECT COUNT(*) AS n FROM contratiempos'),
        investigaciones: await contar(
          'SELECT COUNT(*) AS n FROM investigaciones',
        ),
        documentos: await contar('SELECT COUNT(*) AS n FROM documentos'),
        sensores: await contar('SELECT COUNT(*) AS n FROM sensores'),
        avisos: await contar('SELECT COUNT(*) AS n FROM avisos'),
      }))(),
      porGrupo(
        'SELECT estado AS etiqueta, COUNT(*) AS n FROM acciones GROUP BY estado ORDER BY estado',
      ),
      porGrupo(
        'SELECT estado AS etiqueta, COUNT(*) AS n FROM inspecciones GROUP BY estado ORDER BY estado',
      ),
      porGrupo(
        'SELECT estado AS etiqueta, COUNT(*) AS n FROM activos GROUP BY estado ORDER BY estado',
      ),
      porGrupo(
        'SELECT gravedad AS etiqueta, COUNT(*) AS n FROM contratiempos GROUP BY gravedad ORDER BY gravedad',
      ),
      porGrupo(
        'SELECT estado AS etiqueta, COUNT(*) AS n FROM sensores GROUP BY estado ORDER BY estado',
      ),
    ])

    res.json({
      totales,
      accionesPorEstado,
      inspeccionesPorEstado,
      activosPorEstado,
      contratiemposPorGravedad,
      sensoresPorEstado,
    })
  } catch (err) {
    next(err)
  }
})
