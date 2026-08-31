import { pool, query } from '../db.js'

// Tablas de datos que quedan separadas por punto de venta.
const TABLAS_SCOPE = [
  'entradas',
  'acondicionamiento',
  'salidas',
  'devoluciones',
  'inspecciones_vehiculo',
  'verificaciones_poes',
  'verificaciones_lyd',
  'inspecciones_higiene',
  'monitoreo_agua',
  'monitoreo_temperatura',
  'residuos_solidos',
  'residuos_reciclables',
]

// Crea la relacion usuario<->punto de venta (varios PDV por usuario) y agrega
// la columna punto_venta_id a cada tabla de datos que debe aislarse por PDV.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS usuarios_puntos_venta (' +
      ' usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,' +
      ' punto_venta_id INTEGER NOT NULL REFERENCES puntos_venta(id) ON DELETE CASCADE,' +
      ' PRIMARY KEY (usuario_id, punto_venta_id)' +
      ')',
  )

  // PDV por defecto para los registros que ya existen (el de menor id).
  const pdv = await query('SELECT MIN(id) AS id FROM puntos_venta')
  const pdvDefecto = (pdv[0] as { id: number | null }).id

  for (const tabla of TABLAS_SCOPE) {
    await query(
      'ALTER TABLE ' +
        tabla +
        ' ADD COLUMN IF NOT EXISTS punto_venta_id INTEGER REFERENCES puntos_venta(id)',
    )
    await query(
      'CREATE INDEX IF NOT EXISTS idx_' +
        tabla +
        '_pdv ON ' +
        tabla +
        ' (punto_venta_id)',
    )
    if (pdvDefecto != null) {
      const r = await query(
        'UPDATE ' +
          tabla +
          ' SET punto_venta_id = $1 WHERE punto_venta_id IS NULL',
        [pdvDefecto],
      )
      void r
    }
  }

  if (pdvDefecto == null) {
    console.log(
      'AVISO: no hay puntos de venta creados; los registros existentes quedaron sin PDV.',
    )
  } else {
    console.log('Registros existentes asignados al punto de venta id=' + pdvDefecto)
  }

  console.log('Acceso por punto de venta listo')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
