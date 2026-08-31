import { pool, query } from '../db.js'

// Catalogos que pasan a ser independientes por punto de venta.
const TABLAS_SCOPE = [
  'productos',
  'proveedores',
  'fichas_tecnicas',
  'cuartos_frios',
  'personal',
  'catalogos_suesdr',
  'catalogos_lyd',
]

// Catalogos con restriccion UNIQUE(tipo, nombre) que debe incluir el PDV para
// permitir el mismo valor en distintos puntos de venta.
const TABLAS_UNIQUE_TIPO_NOMBRE = ['catalogos_suesdr', 'catalogos_lyd']

// Agrega la columna punto_venta_id a cada catalogo, crea el indice y asigna los
// registros ya existentes al punto de venta de menor id.
async function main() {
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
      await query(
        'UPDATE ' +
          tabla +
          ' SET punto_venta_id = $1 WHERE punto_venta_id IS NULL',
        [pdvDefecto],
      )
    }
  }

  // Reconstruye la restriccion unica de los catalogos SUESDR/LYD para que sea
  // por (tipo, nombre, punto_venta_id) en lugar de global.
  for (const tabla of TABLAS_UNIQUE_TIPO_NOMBRE) {
    await query(
      'ALTER TABLE ' +
        tabla +
        ' DROP CONSTRAINT IF EXISTS ' +
        tabla +
        '_tipo_nombre_key',
    )
    await query(
      'ALTER TABLE ' +
        tabla +
        ' DROP CONSTRAINT IF EXISTS ' +
        tabla +
        '_tipo_nombre_pdv_key',
    )
    await query(
      'ALTER TABLE ' +
        tabla +
        ' ADD CONSTRAINT ' +
        tabla +
        '_tipo_nombre_pdv_key UNIQUE (tipo, nombre, punto_venta_id)',
    )
  }

  if (pdvDefecto == null) {
    console.log(
      'AVISO: no hay puntos de venta creados; los catalogos existentes quedaron sin PDV.',
    )
  } else {
    console.log(
      'Catalogos existentes asignados al punto de venta id=' + pdvDefecto,
    )
  }

  console.log('Catalogos separados por punto de venta listos')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
