import { pool, query } from '../db.js'

// Crea la tabla de inspecciones de vehiculo si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS inspecciones_vehiculo (' +
      ' id                  SERIAL PRIMARY KEY,' +
      ' fecha               DATE,' +
      ' tipo_vehiculo       VARCHAR(20),' +
      ' placa               VARCHAR(20) NOT NULL,' +
      ' cliente             VARCHAR(150),' +
      ' numero_factura      VARCHAR(50),' +
      ' producto            VARCHAR(150),' +
      ' lote                VARCHAR(100),' +
      ' estado_unidad       VARCHAR(5),' +
      ' limpieza_interior   VARCHAR(5),' +
      ' limpieza_exterior   VARCHAR(5),' +
      ' ausencia_plagas     VARCHAR(5),' +
      ' temperatura_vehiculo NUMERIC(6,2),' +
      ' temperatura_producto NUMERIC(6,2),' +
      ' observaciones       TEXT,' +
      ' firma_responsable   VARCHAR(150),' +
      ' verificado_por      VARCHAR(150),' +
      ' fecha_creacion      TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  console.log('Tabla inspecciones_vehiculo lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
