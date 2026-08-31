import { pool, query } from '../db.js'

// Crea la tabla de solicitudes de credito si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS solicitudes_credito (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' cliente        VARCHAR(200) NOT NULL,' +
      ' documento      VARCHAR(50),' +
      ' telefono       VARCHAR(50),' +
      ' direccion      VARCHAR(250),' +
      ' monto          NUMERIC(18,2),' +
      ' plazo          VARCHAR(100),' +
      " estado         VARCHAR(30) DEFAULT 'Pendiente'," +
      ' observaciones  TEXT,' +
      ' consecutivo    VARCHAR(20),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  // Detalle completo del formulario FOR-FIN-007 (multi-seccion).
  await query(
    "ALTER TABLE solicitudes_credito ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}'",
  )
  console.log('Tabla solicitudes_credito lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
