import { pool, query } from '../db.js'

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS proveedores (' +
      'id SERIAL PRIMARY KEY, ' +
      'nombre VARCHAR(150) NOT NULL UNIQUE, ' +
      'nit VARCHAR(40), ' +
      'contacto VARCHAR(120), ' +
      'telefono VARCHAR(40), ' +
      'email VARCHAR(150), ' +
      'direccion VARCHAR(200), ' +
      'activo BOOLEAN NOT NULL DEFAULT true, ' +
      'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
  )
  const r = await query<{ c: string }>('SELECT COUNT(*) c FROM proveedores')
  await pool.end()
  console.log('Tabla proveedores lista. Registros:', r[0].c)
}

main().catch((err) => {
  console.error('Error creando la tabla proveedores:', err)
  process.exit(1)
})
