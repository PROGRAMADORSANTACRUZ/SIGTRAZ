import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS plantillas (' +
      'id SERIAL PRIMARY KEY, ' +
      'nombre VARCHAR(150) NOT NULL UNIQUE, ' +
      'descripcion TEXT, ' +
      'categoria VARCHAR(80), ' +
      "items JSONB NOT NULL DEFAULT '[]', " +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla plantillas lista.')
}

main().catch((err) => {
  console.error('Error creando tabla plantillas:', err)
  process.exit(1)
})
