import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS formaciones (' +
      'id SERIAL PRIMARY KEY, ' +
      'titulo VARCHAR(200) NOT NULL, ' +
      'tema VARCHAR(120), ' +
      'instructor VARCHAR(120), ' +
      'participante VARCHAR(120), ' +
      "estado VARCHAR(20) NOT NULL DEFAULT 'Programada' " +
      "CHECK (estado IN ('Programada', 'En curso', 'Completada')), " +
      'fecha DATE, ' +
      'duracion_horas NUMERIC(6,2), ' +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla formaciones lista.')
}

main().catch((err) => {
  console.error('Error creando tabla formaciones:', err)
  process.exit(1)
})
