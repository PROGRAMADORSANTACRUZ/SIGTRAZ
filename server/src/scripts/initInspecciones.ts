import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS inspecciones (' +
      'id SERIAL PRIMARY KEY, ' +
      'plantilla_id INTEGER REFERENCES plantillas (id) ON DELETE SET NULL, ' +
      'inspector VARCHAR(120), ' +
      'ubicacion VARCHAR(150), ' +
      "estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' " +
      "CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')), " +
      'fecha DATE, ' +
      "respuestas JSONB NOT NULL DEFAULT '[]', " +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla inspecciones lista.')
}

main().catch((err) => {
  console.error('Error creando tabla inspecciones:', err)
  process.exit(1)
})
