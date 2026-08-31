import { pool, query } from '../db.js'

// Crea la tabla de devoluciones si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS devoluciones (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' producto       VARCHAR(150) NOT NULL,' +
      ' producto_id    VARCHAR(20),' +
      ' lote           VARCHAR(100),' +
      ' cantidad       NUMERIC(18,2),' +
      ' unidad         VARCHAR(20),' +
      ' origen         VARCHAR(200),' +
      ' motivo         VARCHAR(300),' +
      ' responsable    VARCHAR(150),' +
      ' documento      VARCHAR(150),' +
      ' observaciones  TEXT,' +
      ' fecha_vencimiento DATE,' +
      ' lote_interno   VARCHAR(20),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  console.log('Tabla devoluciones lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
