import { pool, query } from '../db.js'

// Crea la tabla de puntos de venta (PDV).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS puntos_venta (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' pdv            VARCHAR(150) NOT NULL,' +
      ' prefijo        VARCHAR(20),' +
      ' direccion      VARCHAR(250),' +
      ' telefono       VARCHAR(50),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  await query(
    'ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS prefijo VARCHAR(20)',
  )

  console.log('Tabla puntos_venta lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
