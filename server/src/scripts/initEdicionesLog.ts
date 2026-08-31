import { pool, query } from '../db.js'

// Crea la tabla de auditoria de ediciones (Entradas, Acondicionamiento, Salida).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS ediciones_log (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' consecutivo    INTEGER NOT NULL,' +
      ' modulo         VARCHAR(40) NOT NULL,' +
      ' registro_id    VARCHAR(40),' +
      ' lote_interno   VARCHAR(20),' +
      ' usuario_id     VARCHAR(40),' +
      ' usuario_nombre VARCHAR(150),' +
      ' usuario_email  VARCHAR(150),' +
      ' campo          VARCHAR(120) NOT NULL,' +
      ' valor_anterior TEXT,' +
      ' valor_nuevo    TEXT,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  await query(
    'CREATE INDEX IF NOT EXISTS idx_ediciones_log_consecutivo' +
      ' ON ediciones_log (consecutivo)',
  )
  await query(
    'CREATE INDEX IF NOT EXISTS idx_ediciones_log_fecha' +
      ' ON ediciones_log (fecha_creacion DESC)',
  )
  console.log('Tabla ediciones_log lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
