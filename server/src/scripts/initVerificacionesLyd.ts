import { pool, query } from '../db.js'

// Crea la tabla de verificaciones de Limpieza y Desinfeccion (LYD) si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS verificaciones_lyd (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' superficie     VARCHAR(200) NOT NULL,' +
      ' frecuencia     VARCHAR(100),' +
      ' restaurante    VARCHAR(150),' +
      ' mes            VARCHAR(20),' +
      ' anio           VARCHAR(10),' +
      " dias           JSONB NOT NULL DEFAULT '[]'::jsonb," +
      ' responsable    VARCHAR(150),' +
      ' verifica       VARCHAR(150),' +
      ' observaciones  TEXT,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  console.log('Tabla verificaciones_lyd lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
