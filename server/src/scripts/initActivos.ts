import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS activos (' +
      'id SERIAL PRIMARY KEY, ' +
      'codigo VARCHAR(60) NOT NULL UNIQUE, ' +
      'nombre VARCHAR(150) NOT NULL, ' +
      'categoria VARCHAR(80), ' +
      'ubicacion VARCHAR(150), ' +
      'responsable VARCHAR(120), ' +
      "estado VARCHAR(20) NOT NULL DEFAULT 'Operativo' " +
      "CHECK (estado IN ('Operativo', 'En mantenimiento', 'Fuera de servicio', 'Baja')), " +
      'fecha_adquisicion DATE, ' +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tabla activos lista.')
}

main().catch((err) => {
  console.error('Error creando tabla activos:', err)
  process.exit(1)
})
