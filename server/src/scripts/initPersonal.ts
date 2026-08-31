import { pool, query } from '../db.js'

// Crea la tabla de personal (empleados por punto de venta).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS personal (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' cedula         VARCHAR(50) NOT NULL,' +
      ' nombres        VARCHAR(200) NOT NULL,' +
      ' punto_venta    VARCHAR(150),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  console.log('Tabla personal lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
