import { pool, query } from '../db.js'

// Crea la tabla de monitoreo y control de agua potable (FOR-CIA-014).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS monitoreo_agua (' +
      ' id                   SERIAL PRIMARY KEY,' +
      ' fecha                DATE,' +
      ' lugar                VARCHAR(200) NOT NULL,' +
      ' cloro_residual       VARCHAR(50),' +
      ' ph                   VARCHAR(50),' +
      ' acciones_correctivas TEXT,' +
      ' responsable          VARCHAR(150),' +
      ' observaciones        TEXT,' +
      ' fecha_creacion       TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  console.log('Tabla monitoreo_agua lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
