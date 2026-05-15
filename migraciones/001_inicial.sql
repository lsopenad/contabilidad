-- Migración inicial: esquema base de contabilidad

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto', 'ambos')),
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    nif VARCHAR(20),
    email VARCHAR(200),
    direccion TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingresos (
    id SERIAL PRIMARY KEY,
    importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
    categoria_id INTEGER REFERENCES categorias(id),
    descripcion TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
    categoria_id INTEGER REFERENCES categorias(id),
    descripcion TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    importe_base DECIMAL(10,2) NOT NULL CHECK (importe_base > 0),
    iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    importe_total DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias(id),
    importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INTEGER NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE(categoria_id, mes, anio)
);

-- Categorías por defecto
INSERT INTO categorias (nombre, tipo) VALUES
    ('Nómina', 'ingreso'),
    ('Ventas', 'ingreso'),
    ('Otros ingresos', 'ingreso'),
    ('Alimentación', 'gasto'),
    ('Transporte', 'gasto'),
    ('Suministros', 'gasto'),
    ('Alquiler', 'gasto'),
    ('Seguros', 'gasto'),
    ('Material oficina', 'gasto'),
    ('Otros gastos', 'gasto')
ON CONFLICT DO NOTHING;
