import { pool, query } from '../db.js'

async function main() {
  await query('DROP TABLE IF EXISTS fichas_tecnicas')
  await query(
    'CREATE TABLE fichas_tecnicas (' +
      'id SERIAL PRIMARY KEY, ' +
      'nombre VARCHAR(150) NOT NULL UNIQUE, ' +
      "ficha TEXT NOT NULL DEFAULT '', " +
      "temperatura VARCHAR(60) NOT NULL DEFAULT '', " +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla fichas_tecnicas recreada (nombre, ficha, temperatura).')
}

main().catch((err) => {
  console.error('Error en migracion:', err)
  process.exit(1)
})
