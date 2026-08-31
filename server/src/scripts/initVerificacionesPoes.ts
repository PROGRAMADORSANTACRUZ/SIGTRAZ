import { pool, query } from '../db.js'

// Crea la tabla de verificaciones POES si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS verificaciones_poes (' +
      ' id                SERIAL PRIMARY KEY,' +
      ' fecha             DATE,' +
      ' hora              VARCHAR(10),' +
      ' superficie        VARCHAR(200) NOT NULL,' +
      ' sustancia         VARCHAR(150),' +
      ' dosificacion      VARCHAR(100),' +
      ' verificacion      VARCHAR(5),' +
      ' realizo           VARCHAR(150),' +
      ' verifico          VARCHAR(150),' +
      ' accion_correctiva TEXT,' +
      ' fecha_creacion    TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  console.log('Tabla verificaciones_poes lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
