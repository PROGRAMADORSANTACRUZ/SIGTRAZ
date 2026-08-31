import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS programas (' +
      'id SERIAL PRIMARY KEY, ' +
      'nombre VARCHAR(150) NOT NULL, ' +
      'plantilla_id INTEGER REFERENCES plantillas (id) ON DELETE SET NULL, ' +
      "frecuencia VARCHAR(20) NOT NULL DEFAULT 'Mensual' " +
      "CHECK (frecuencia IN ('Diaria', 'Semanal', 'Mensual', 'Anual')), " +
      'responsable VARCHAR(120), ' +
      'proxima_fecha DATE, ' +
      'activo BOOLEAN NOT NULL DEFAULT true, ' +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla programas lista.')
}

main().catch((err) => {
  console.error('Error creando tabla programas:', err)
  process.exit(1)
})
