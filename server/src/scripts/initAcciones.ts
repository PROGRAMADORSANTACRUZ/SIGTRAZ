import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS acciones (' +
      'id SERIAL PRIMARY KEY, ' +
      'titulo VARCHAR(200) NOT NULL, ' +
      'descripcion TEXT, ' +
      "prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' " +
      "CHECK (prioridad IN ('Baja', 'Media', 'Alta')), " +
      "estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' " +
      "CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')), " +
      'responsable VARCHAR(120), ' +
      'fecha_vencimiento DATE, ' +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla acciones lista.')
}

main().catch((err) => {
  console.error('Error creando tabla acciones:', err)
  process.exit(1)
})
