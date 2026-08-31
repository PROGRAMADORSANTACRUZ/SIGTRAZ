import { pool, query } from '../db.js'

const tablas: string[] = [
  'CREATE TABLE IF NOT EXISTS contratistas (' +
    'id SERIAL PRIMARY KEY, ' +
    'nombre VARCHAR(150) NOT NULL, ' +
    'empresa VARCHAR(150), ' +
    'documento VARCHAR(60), ' +
    'contacto VARCHAR(120), ' +
    'especialidad VARCHAR(120), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Activo' " +
    "CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')), " +
    'fecha_inicio DATE, ' +
    'fecha_fin DATE, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS biblioteca (' +
    'id SERIAL PRIMARY KEY, ' +
    'titulo VARCHAR(200) NOT NULL, ' +
    'tipo VARCHAR(80), ' +
    'categoria VARCHAR(80), ' +
    'enlace VARCHAR(500), ' +
    'descripcion TEXT, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS documentos (' +
    'id SERIAL PRIMARY KEY, ' +
    'titulo VARCHAR(200) NOT NULL, ' +
    'tipo VARCHAR(80), ' +
    'version VARCHAR(40), ' +
    'responsable VARCHAR(120), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Borrador' " +
    "CHECK (estado IN ('Borrador', 'Vigente', 'Obsoleto')), " +
    'fecha_vigencia DATE, ' +
    'enlace VARCHAR(500), ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS contratiempos (' +
    'id SERIAL PRIMARY KEY, ' +
    'titulo VARCHAR(200) NOT NULL, ' +
    'descripcion TEXT, ' +
    "gravedad VARCHAR(20) NOT NULL DEFAULT 'Media' " +
    "CHECK (gravedad IN ('Baja', 'Media', 'Alta', 'Critica')), " +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Abierto' " +
    "CHECK (estado IN ('Abierto', 'En revision', 'Cerrado')), " +
    'ubicacion VARCHAR(150), ' +
    'reportado_por VARCHAR(120), ' +
    'fecha DATE, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS investigaciones (' +
    'id SERIAL PRIMARY KEY, ' +
    'titulo VARCHAR(200) NOT NULL, ' +
    'contratiempo_id INTEGER REFERENCES contratiempos (id) ON DELETE SET NULL, ' +
    'investigador VARCHAR(120), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Abierta' " +
    "CHECK (estado IN ('Abierta', 'En proceso', 'Cerrada')), " +
    'causa_raiz TEXT, ' +
    'conclusiones TEXT, ' +
    'fecha DATE, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS trabajadores_solitarios (' +
    'id SERIAL PRIMARY KEY, ' +
    'trabajador VARCHAR(150) NOT NULL, ' +
    'ubicacion VARCHAR(150), ' +
    'actividad VARCHAR(200), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Activo' " +
    "CHECK (estado IN ('Activo', 'Finalizado', 'Alerta')), " +
    'fecha DATE, ' +
    'hora_inicio VARCHAR(10), ' +
    'hora_fin VARCHAR(10), ' +
    'contacto_emergencia VARCHAR(150), ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS avisos (' +
    'id SERIAL PRIMARY KEY, ' +
    'titulo VARCHAR(200) NOT NULL, ' +
    'mensaje TEXT, ' +
    "prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' " +
    "CHECK (prioridad IN ('Baja', 'Media', 'Alta')), " +
    'dirigido_a VARCHAR(150), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Borrador' " +
    "CHECK (estado IN ('Borrador', 'Publicado', 'Archivado')), " +
    'fecha DATE, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS sensores (' +
    'id SERIAL PRIMARY KEY, ' +
    'codigo VARCHAR(60), ' +
    'nombre VARCHAR(150) NOT NULL, ' +
    'tipo VARCHAR(80), ' +
    'ubicacion VARCHAR(150), ' +
    'unidad VARCHAR(30), ' +
    'valor_actual NUMERIC(12,3), ' +
    "estado VARCHAR(20) NOT NULL DEFAULT 'Normal' " +
    "CHECK (estado IN ('Normal', 'Alerta', 'Fuera de linea')), " +
    'ultima_lectura DATE, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',

  'CREATE TABLE IF NOT EXISTS mercado (' +
    'id SERIAL PRIMARY KEY, ' +
    'nombre VARCHAR(150) NOT NULL, ' +
    'categoria VARCHAR(80), ' +
    'proveedor VARCHAR(150), ' +
    'precio NUMERIC(12,2), ' +
    'unidad VARCHAR(30), ' +
    'disponible BOOLEAN NOT NULL DEFAULT true, ' +
    'descripcion TEXT, ' +
    'fecha_creacion TIMESTAMP NOT NULL DEFAULT now())',
]

async function main() {
  for (const sql of tablas) {
    await query(sql)
  }
  await pool.end()
  console.log('Tablas nuevas creadas: ' + tablas.length)
}

main().catch((err) => {
  console.error('Error creando tablas nuevas:', err)
  process.exit(1)
})
