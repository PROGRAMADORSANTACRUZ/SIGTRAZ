import { pool, query } from '../db.js'

// Crea la tabla de clientes y agrega columnas nuevas si faltan.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS clientes (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' nit            VARCHAR(40),' +
      ' nombre         VARCHAR(150) NOT NULL,' +
      ' apellidos      VARCHAR(150),' +
      ' direccion      VARCHAR(200),' +
      ' referencia     VARCHAR(200),' +
      ' barrio         VARCHAR(120),' +
      ' ciudad         VARCHAR(120),' +
      ' telefono       VARCHAR(40),' +
      ' correo         VARCHAR(150),' +
      ' punto_venta_id INTEGER REFERENCES puntos_venta(id),' +
      ' activo         BOOLEAN NOT NULL DEFAULT true,' +
      ' horeca         BOOLEAN NOT NULL DEFAULT false,' +
      ' dias_despacho  VARCHAR(100),' +
      ' lat            NUMERIC(10,7),' +
      ' lng            NUMERIC(10,7),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  const cols = [
    'ADD COLUMN IF NOT EXISTS nit            VARCHAR(40)',
    'ADD COLUMN IF NOT EXISTS apellidos      VARCHAR(150)',
    'ADD COLUMN IF NOT EXISTS direccion      VARCHAR(200)',
    'ADD COLUMN IF NOT EXISTS referencia     VARCHAR(200)',
    'ADD COLUMN IF NOT EXISTS barrio         VARCHAR(120)',
    'ADD COLUMN IF NOT EXISTS ciudad         VARCHAR(120)',
    'ADD COLUMN IF NOT EXISTS telefono       VARCHAR(40)',
    'ADD COLUMN IF NOT EXISTS correo         VARCHAR(150)',
    'ADD COLUMN IF NOT EXISTS punto_venta_id INTEGER REFERENCES puntos_venta(id)',
    'ADD COLUMN IF NOT EXISTS activo         BOOLEAN NOT NULL DEFAULT true',
    'ADD COLUMN IF NOT EXISTS horeca         BOOLEAN NOT NULL DEFAULT false',
    'ADD COLUMN IF NOT EXISTS dias_despacho  VARCHAR(100)',
    'ADD COLUMN IF NOT EXISTS lat            NUMERIC(10,7)',
    'ADD COLUMN IF NOT EXISTS lng            NUMERIC(10,7)',
  ]
  for (const c of cols) {
    await query('ALTER TABLE clientes ' + c)
  }

  const r = await query<{ c: string }>('SELECT COUNT(*) c FROM clientes')
  await pool.end()
  console.log('Tabla clientes lista. Registros:', r[0].c)
}

main().catch((err) => {
  console.error('Error creando la tabla clientes:', err)
  process.exit(1)
})
