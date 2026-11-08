-- ============================================================================
-- SCRIPT INICIAL BLOQUE 1: CIMIENTOS, USUARIOS, ROLES, AUDITORÍA Y TRONCALES
-- Sistema: Arréglalo Ya (Grupo 2 - UCB)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios (Soporta múltiples roles y alternancia HU-F03)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    roles TEXT[] NOT NULL DEFAULT ARRAY['CLIENTE'],
    rol_activo VARCHAR(30) NOT NULL DEFAULT 'CLIENTE',
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO', -- ACTIVO, INACTIVO, SUSPENDIDO
    reset_token VARCHAR(255),
    reset_token_expira TIMESTAMP,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Registro de Auditoría (CA-12, CU-24, HU-F22)
CREATE TABLE IF NOT EXISTS registros_auditoria (
    id_auditoria UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario_actor UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad_afectada VARCHAR(100) NOT NULL,
    id_entidad_afectada VARCHAR(100),
    detalle JSONB,
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tablas Troncales Base para conexión de los Bloques 2, 3, 4 y 5 (Fase 1)
CREATE TABLE IF NOT EXISTS categorias_servicio (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS zonas (
    id_zona SERIAL PRIMARY KEY,
    nombre VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS perfiles_trabajador (
    id_perfil UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID UNIQUE NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    descripcion TEXT,
    anos_experiencia INT DEFAULT 0,
    documento_identidad VARCHAR(100),
    datos_bancarios VARCHAR(200),
    estado_validacion VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADO, RECHAZADO
    fecha_validacion TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes_servicio (
    id_solicitud UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_cliente UUID NOT NULL REFERENCES usuarios(id_usuario),
    id_categoria INT REFERENCES categorias_servicio(id_categoria),
    id_zona INT REFERENCES zonas(id_zona),
    descripcion TEXT NOT NULL,
    ubicacion_general VARCHAR(200) NOT NULL,
    fecha_preferida DATE,
    estado VARCHAR(30) DEFAULT 'ACTIVA', -- ACTIVA, EN_COTIZACION, CONTRATADA, CANCELADA, VENCIDA
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id_pago UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID REFERENCES solicitudes_servicio(id_solicitud),
    tipo VARCHAR(30) NOT NULL, -- ANTICIPO_25, PAGO_FINAL, REEMBOLSO
    monto NUMERIC(10, 2) NOT NULL,
    comision_plataforma NUMERIC(10, 2) DEFAULT 0,
    confirmado_cliente BOOLEAN DEFAULT FALSE,
    confirmado_trabajador BOOLEAN DEFAULT FALSE,
    estado VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, CONCILIADO, DISCREPANTE, RECHAZADO
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Semilla inicial de Categorías y Zonas de Cochabamba
INSERT INTO categorias_servicio (nombre, descripcion) VALUES
('Plomería', 'Reparación de tuberías, grifería y filtraciones'),
('Electricidad', 'Instalaciones eléctricas, cortocircuitos y tableros'),
('Albañilería', 'Refacciones, muros, pisos y revoques'),
('Electrodomésticos', 'Mantenimiento y reparación de línea blanca')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO zonas (nombre, descripcion) VALUES
('Cercado - Norte', 'Zona Norte de la ciudad de Cochabamba'),
('Cercado - Centro', 'Casco viejo y centro de Cochabamba'),
('Cercado - Sur', 'Zona Sur de Cochabamba'),
('Sacaba', 'Municipio de Sacaba'),
('Quillacollo', 'Municipio de Quillacollo')
ON CONFLICT (nombre) DO NOTHING;