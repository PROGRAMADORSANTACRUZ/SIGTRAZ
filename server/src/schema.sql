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
    conservacion      VARCHAR(200),
    instrucciones     VARCHAR(300),
    empresa           VARCHAR(200)
);

-- Migracion: agrega columnas de etiqueta si la tabla ya existia.
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_beneficio   DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_empaque     DATE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS conservacion      VARCHAR(200);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS instrucciones     VARCHAR(300);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS empresa           VARCHAR(200);

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
    email          VARCHAR(150) NOT NULL UNIQUE,
    rol            VARCHAR(20)  NOT NULL
                   CHECK (rol IN ('Administrador', 'Operador', 'Consulta')),
    activo         BOOLEAN      NOT NULL DEFAULT true,
    password_hash  VARCHAR(200),
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT now()
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

INSERT INTO usuarios (nombre, email, rol, activo) VALUES
    ('Ana Rojas',  'ana.rojas@sigtraz.com',  'Administrador', true),
    ('Luis Mora',  'luis.mora@sigtraz.com',  'Operador',      true),
    ('Sofia Diaz', 'sofia.diaz@sigtraz.com', 'Operador',      true),
    ('Pedro Ruiz', 'pedro.ruiz@sigtraz.com', 'Consulta',      false)
ON CONFLICT (email) DO NOTHING;
