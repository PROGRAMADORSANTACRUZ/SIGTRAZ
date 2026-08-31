import { pool, query } from '../db.js'

// Crea la tabla de acondicionamiento y agrega columnas nuevas si faltan.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS acondicionamiento (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' producto       VARCHAR(150) NOT NULL,' +
      ' lote           VARCHAR(100),' +
      ' proceso        VARCHAR(150),' +
      ' responsable    VARCHAR(150),' +
      ' observaciones  TEXT,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  const cols = [
    'ADD COLUMN IF NOT EXISTS producto_id          VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS cantidad_entrada     NUMERIC(18,2)',
    'ADD COLUMN IF NOT EXISTS unidad               VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS producto_resultante  VARCHAR(150)',
    'ADD COLUMN IF NOT EXISTS cantidad_resultante  NUMERIC(18,2)',
    'ADD COLUMN IF NOT EXISTS ficha_id             VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS empresa              VARCHAR(200)',
    'ADD COLUMN IF NOT EXISTS conservacion         VARCHAR(200)',
    'ADD COLUMN IF NOT EXISTS instrucciones        VARCHAR(300)',
    'ADD COLUMN IF NOT EXISTS fecha_vencimiento    DATE',
    'ADD COLUMN IF NOT EXISTS fecha_empaque        DATE',
    'ADD COLUMN IF NOT EXISTS destino              VARCHAR(150)',
    'ADD COLUMN IF NOT EXISTS editado              BOOLEAN DEFAULT FALSE',
    'ADD COLUMN IF NOT EXISTS lote_interno         VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS placa_vehiculo       VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS temperatura_vehiculo VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS temperatura_producto VARCHAR(20)',
  ]
  for (const c of cols) {
    await query('ALTER TABLE acondicionamiento ' + c)
  }

  // La fecha ahora guarda fecha y hora del proceso (antes era solo DATE).
  await query(
    'ALTER TABLE acondicionamiento ALTER COLUMN fecha TYPE TIMESTAMP',
  )

  console.log('Tabla acondicionamiento lista (columnas: ' + cols.length + ')')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
