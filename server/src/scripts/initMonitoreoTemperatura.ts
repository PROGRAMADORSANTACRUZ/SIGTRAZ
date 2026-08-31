import { pool, query } from '../db.js'

// Crea la tabla de monitoreo de temperatura de refrigeracion (FOR-CIA-007).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS monitoreo_temperatura (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' punto_venta    VARCHAR(150) NOT NULL,' +
      ' ubicacion      VARCHAR(200),' +
      ' serial         VARCHAR(150),' +
      ' mes            VARCHAR(20),' +
      ' anio           INTEGER,' +
      ' funcionarios   TEXT,' +
      ' observaciones  TEXT,' +
      " mediciones     JSONB NOT NULL DEFAULT '[]'::jsonb," +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  console.log('Tabla monitoreo_temperatura lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
