import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS fichas_tecnicas (' +
      'producto_id VARCHAR(20) PRIMARY KEY REFERENCES productos (id) ON DELETE CASCADE, ' +
      'descripcion VARCHAR(600), presentacion VARCHAR(300), conservacion VARCHAR(300), ' +
      'almacenamiento VARCHAR(300), nutricional VARCHAR(600), registro_sanitario VARCHAR(120), ' +
      'origen VARCHAR(200), manejo VARCHAR(600), ' +
      'actualizado_at TIMESTAMP NOT NULL DEFAULT now())',
  )
  await query(
    'CREATE TABLE IF NOT EXISTS cuartos_frios (' +
      'id SERIAL PRIMARY KEY, nombre VARCHAR(120) NOT NULL UNIQUE, ' +
      'temp_min NUMERIC(6,2), temp_max NUMERIC(6,2), capacidad NUMERIC(12,2), ' +
      "capacidad_unidad VARCHAR(10) NOT NULL DEFAULT 'kg', " +
      'ubicacion VARCHAR(150), responsable VARCHAR(120), ' +
      "estado VARCHAR(20) NOT NULL DEFAULT 'Activo' " +
      "CHECK (estado IN ('Activo', 'Inactivo', 'Mantenimiento')), " +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  await pool.end()
  console.log('Tablas fichas_tecnicas y cuartos_frios listas.')
}

main().catch((err) => {
  console.error('Error creando tablas:', err)
  process.exit(1)
})
