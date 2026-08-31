-- =====================================================================
-- SIGTRAZ - Esquema de base de datos (PostgreSQL)
-- Crea las tablas de trazabilidad y datos semilla.
-- La base de datos se crea desde el script de init (npm run db:init).
-- =====================================================================

CREATE TABLE IF NOT EXISTS productos (
    id        VARCHAR(20)  PRIMARY KEY,
    sku       VARCHAR(50)  NOT NULL UNIQUE,
    nombre    VARCHAR(150) NOT NULL,
    categoria VARCHAR(80)  NOT NULL,
    unidad    VARCHAR(20)  NOT NULL
);

CREATE TABLE IF NOT EXISTS lotes (
    id                VARCHAR(20)   PRIMARY KEY,
    producto_id       VARCHAR(20)   NOT NULL REFERENCES productos (id),
    codigo            VARCHAR(60)   NOT NULL UNIQUE,
    fecha_produccion  DATE          NOT NULL,
    fecha_vencimiento DATE,
    cantidad          NUMERIC(18,2) NOT NULL DEFAULT 0,
    estado            VARCHAR(30)   NOT NULL
);

CREATE TABLE IF NOT EXISTS entradas (
    id           SERIAL        PRIMARY KEY,
    fecha        TIMESTAMP     NOT NULL DEFAULT now(),
    producto_id  VARCHAR(20)   NOT NULL REFERENCES productos (id),
    lote_codigo  VARCHAR(60)   NOT NULL,
    cantidad     NUMERIC(18,2) NOT NULL,
    proveedor    VARCHAR(150)  NOT NULL,
    almacen      VARCHAR(120)  NOT NULL,
    responsable  VARCHAR(120)  NOT NULL,
    documento    VARCHAR(80),
    notas        VARCHAR(500),
    fecha_vencimiento DATE,
    fecha_beneficio   DATE,
    fecha_empaque     DATE,
    lote_externo      VARCHAR(100),
    veh_pisos         VARCHAR(2),
    veh_paredes       VARCHAR(2),
    veh_techos        VARCHAR(2),
    veh_cortinas      VARCHAR(2),
    organolepticas    VARCHAR(2),
    temp_producto     NUMERIC(6,2),
    temp_vehiculo     NUMERIC(6,2),
    placa             VARCHAR(20)
);

-- Migracion: agrega columnas de etiqueta si la tabla ya existia.
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_beneficio   DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_empaque     DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS lote_externo      VARCHAR(100);
-- Migracion: campos de etiqueta movidos a acondicionamiento.
ALTER TABLE entradas DROP COLUMN IF EXISTS conservacion;
ALTER TABLE entradas DROP COLUMN IF EXISTS instrucciones;
ALTER TABLE entradas DROP COLUMN IF EXISTS empresa;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS veh_pisos         VARCHAR(2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS veh_paredes       VARCHAR(2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS veh_techos        VARCHAR(2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS veh_cortinas      VARCHAR(2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS organolepticas    VARCHAR(2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS temp_producto     NUMERIC(6,2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS temp_vehiculo     NUMERIC(6,2);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS placa             VARCHAR(20);

CREATE TABLE IF NOT EXISTS eventos (
    id          SERIAL        PRIMARY KEY,
    lote_id     VARCHAR(20)   NOT NULL REFERENCES lotes (id),
    tipo        VARCHAR(30)   NOT NULL,
    fecha       TIMESTAMP     NOT NULL DEFAULT now(),
    ubicacion   VARCHAR(120)  NOT NULL,
    responsable VARCHAR(120)  NOT NULL,
    notas       VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL       PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    apellido       VARCHAR(120),
    email          VARCHAR(150) NOT NULL UNIQUE,
    rol            VARCHAR(40)  NOT NULL
                   CHECK (rol IN ('Administrador', 'Calidad',
                                  'Auxiliar de calidad PDV',
                                  'Auxiliar de calidad Planta', 'Medico Veterinario',
                                  'Consultor')),
    empresa        VARCHAR(60),
    activo         BOOLEAN      NOT NULL DEFAULT true,
    password_hash  VARCHAR(200),
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT now()
);

-- Migracion usuarios: nuevas columnas empresa/apellido y roles ampliados.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa  VARCHAR(60);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modulos  JSONB DEFAULT '[]';
ALTER TABLE usuarios ALTER COLUMN rol TYPE VARCHAR(40);
-- Se quita la restriccion antigua ANTES de convertir los roles, de lo
-- contrario el UPDATE violaria el CHECK previo (que no conoce los nuevos roles).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- Convierte los roles antiguos a los nuevos antes de aplicar la restriccion.
UPDATE usuarios SET rol = 'Auxiliar de calidad PDV' WHERE rol = 'Operador';
UPDATE usuarios SET rol = 'Consultor'               WHERE rol = 'Consulta';
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('Administrador', 'Calidad', 'Auxiliar de calidad PDV',
                   'Auxiliar de calidad Planta', 'Medico Veterinario',
                   'Consultor'));
-- Los usuarios existentes sin empresa quedan en Carnes Santacruz por defecto.
UPDATE usuarios SET empresa = 'CARNES SANTACRUZ' WHERE empresa IS NULL;

CREATE TABLE IF NOT EXISTS proveedores (
    id             SERIAL       PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL UNIQUE,
    nit            VARCHAR(40),
    contacto       VARCHAR(120),
    telefono       VARCHAR(40),
    email          VARCHAR(150),
    direccion      VARCHAR(200),
    activo         BOOLEAN      NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id              SERIAL        PRIMARY KEY,
    nombre          VARCHAR(150)  NOT NULL UNIQUE,
    ficha           TEXT          NOT NULL DEFAULT '',
    dias_vencimiento INTEGER,
    fecha_creacion  TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cuartos_frios (
    id               SERIAL        PRIMARY KEY,
    nombre           VARCHAR(120)  NOT NULL UNIQUE,
    tipo             VARCHAR(20)   NOT NULL DEFAULT 'Congelado'
                     CHECK (tipo IN ('Congelado', 'Refrigerado')),
    capacidad        NUMERIC(12,2),
    capacidad_unidad VARCHAR(10)   NOT NULL DEFAULT 'kg',
    ubicacion        VARCHAR(150),
    responsable      VARCHAR(120),
    estado           VARCHAR(20)   NOT NULL DEFAULT 'Activo'
                     CHECK (estado IN ('Activo', 'Inactivo', 'Mantenimiento')),
    fecha_creacion   TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acciones (
    id                SERIAL        PRIMARY KEY,
    titulo            VARCHAR(200)  NOT NULL,
    descripcion       TEXT,
    prioridad         VARCHAR(20)   NOT NULL DEFAULT 'Media'
                      CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
    estado            VARCHAR(20)   NOT NULL DEFAULT 'Pendiente'
                      CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')),
    responsable       VARCHAR(120),
    fecha_vencimiento DATE,
    fecha_creacion    TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activos (
    id                SERIAL        PRIMARY KEY,
    codigo            VARCHAR(60)   NOT NULL UNIQUE,
    nombre            VARCHAR(150)  NOT NULL,
    categoria         VARCHAR(80),
    ubicacion         VARCHAR(150),
    responsable       VARCHAR(120),
    estado            VARCHAR(20)   NOT NULL DEFAULT 'Operativo'
                      CHECK (estado IN ('Operativo', 'En mantenimiento', 'Fuera de servicio', 'Baja')),
    fecha_adquisicion DATE,
    fecha_creacion    TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formaciones (
    id             SERIAL        PRIMARY KEY,
    titulo         VARCHAR(200)  NOT NULL,
    tema           VARCHAR(120),
    instructor     VARCHAR(120),
    participante   VARCHAR(120),
    estado         VARCHAR(20)   NOT NULL DEFAULT 'Programada'
                   CHECK (estado IN ('Programada', 'En curso', 'Completada')),
    fecha          DATE,
    duracion_horas NUMERIC(6,2),
    fecha_creacion TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plantillas (
    id             SERIAL        PRIMARY KEY,
    nombre         VARCHAR(150)  NOT NULL UNIQUE,
    descripcion    TEXT,
    categoria      VARCHAR(80),
    items          JSONB         NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspecciones (
    id             SERIAL        PRIMARY KEY,
    plantilla_id   INTEGER       REFERENCES plantillas (id) ON DELETE SET NULL,
    inspector      VARCHAR(120),
    ubicacion      VARCHAR(150),
    estado         VARCHAR(20)   NOT NULL DEFAULT 'Pendiente'
                   CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')),
    fecha          DATE,
    respuestas     JSONB         NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programas (
    id             SERIAL        PRIMARY KEY,
    nombre         VARCHAR(150)  NOT NULL,
    plantilla_id   INTEGER       REFERENCES plantillas (id) ON DELETE SET NULL,
    frecuencia     VARCHAR(20)   NOT NULL DEFAULT 'Mensual'
                   CHECK (frecuencia IN ('Diaria', 'Semanal', 'Mensual', 'Anual')),
    responsable    VARCHAR(120),
    proxima_fecha  DATE,
    activo         BOOLEAN       NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP     NOT NULL DEFAULT now()
);

-- --------------------------- Semilla ---------------------------------
INSERT INTO productos (id, sku, nombre, categoria, unidad) VALUES
    ('p1', 'CAF-001', 'Cafe tostado premium',  'Bebidas',   'kg'),
    ('p2', 'MIE-002', 'Miel organica',         'Alimentos', 'L'),
    ('p3', 'HAR-003', 'Harina integral',       'Alimentos', 'kg'),
    ('p4', 'ACE-004', 'Aceite de oliva extra', 'Alimentos', 'L')
ON CONFLICT (id) DO NOTHING;

INSERT INTO entradas
    (fecha, producto_id, lote_codigo, cantidad, proveedor, almacen, responsable, documento, notas)
SELECT v.* FROM (VALUES
    (TIMESTAMP '2026-06-02 09:15:00', 'p1', 'L-CAF-2026-0012', 500::numeric, 'Tostadores del Valle', 'Almacen Norte',   'Luis Mora',  'GR-2026-0451', 'Recepcion completa'),
    (TIMESTAMP '2026-06-20 10:40:00', 'p2', 'L-MIE-2026-0005', 180::numeric, 'Apiarios del Sur',     'Almacen Central', 'Sofia Diaz', 'FAC-8890',     NULL),
    (TIMESTAMP '2026-07-05 08:05:00', 'p3', 'L-HAR-2026-0021', 900::numeric, 'Molinos Union',        'Almacen Norte',   'Pedro Ruiz', 'GR-2026-0512', 'Pendiente inspeccion de calidad')
) AS v(fecha, producto_id, lote_codigo, cantidad, proveedor, almacen, responsable, documento, notas)
WHERE NOT EXISTS (SELECT 1 FROM entradas);
