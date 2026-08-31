import { pool, query } from '../db.js'

// Crea la tabla de salidas si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS salidas (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' producto       VARCHAR(150) NOT NULL,' +
      ' producto_id    VARCHAR(20),' +
      ' lote           VARCHAR(100),' +
      ' cantidad       NUMERIC(18,2),' +
      ' unidad         VARCHAR(20),' +
      ' destino        VARCHAR(150),' +
      ' responsable    VARCHAR(150),' +
      ' documento      VARCHAR(150),' +
      ' observaciones  TEXT,' +
      ' lote_interno   VARCHAR(20),' +
      ' fecha_vencimiento DATE,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  await query(
    'ALTER TABLE salidas ADD COLUMN IF NOT EXISTS lote_interno VARCHAR(20)',
  )
  await query(
    'ALTER TABLE salidas ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE',
  )
  // Asigna lote interno SA000001 a las salidas que aun no lo tengan,
  // respetando el orden de creacion.
  const pendientes = await query(
    `SELECT id FROM salidas WHERE lote_interno IS NULL ORDER BY fecha_creacion ASC`,
  )
  if (pendientes.length > 0) {
    const seq = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(lote_interno FROM 3) AS INTEGER)), 0) AS max
         FROM salidas WHERE lote_interno ~ '^SA[0-9]+$'`,
    )
    let n = Number((seq[0] as { max: number }).max) || 0
    for (const row of pendientes as { id: number }[]) {
      n += 1
      const lote = 'SA' + String(n).padStart(6, '0')
      await query('UPDATE salidas SET lote_interno=$2 WHERE id=$1', [
        row.id,
        lote,
      ])
    }
    console.log(`Lote interno asignado a ${pendientes.length} salidas`)
  }
  console.log('Tabla salidas lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
