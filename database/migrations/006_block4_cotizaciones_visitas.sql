
-- ============================================================================
-- MIGRACION 006 - BLOQUE 4
-- COTIZACIONES, INCREMENTOS Y VISITAS PREVIAS
-- Sistema: Arreglalo Ya
-- Requiere migraciones 001, 002, 003, 004 y 005.
-- PostgreSQL
-- ============================================================================

-- 1. COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones (
    id_cotizacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    id_solicitud UUID NOT NULL
        REFERENCES solicitudes_servicio(id_solicitud) ON DELETE CASCADE,

    id_perfil UUID NOT NULL
        REFERENCES perfiles_trabajador(id_perfil) ON DELETE RESTRICT,

    precio_mano_obra NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_materiales NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_total NUMERIC(10,2) NOT NULL,

    alcance TEXT NOT NULL,
    condiciones TEXT,

    estado VARCHAR(30) NOT NULL DEFAULT 'ENVIADA',

    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP,
    fecha_vencimiento TIMESTAMP,

    id_usuario_decision UUID
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    CONSTRAINT chk_cotizacion_precios
        CHECK (
            precio_mano_obra >= 0
            AND precio_materiales >= 0
            AND precio_total >= 0
            AND precio_total = precio_mano_obra + precio_materiales
        ),

    CONSTRAINT chk_cotizacion_estado
        CHECK (
            estado IN (
                'ENVIADA',
                'ACEPTADA',
                'RECHAZADA',
                'RETIRADA',
                'VENCIDA'
            )
        ),

    CONSTRAINT uq_cotizacion_relacion
        UNIQUE (id_cotizacion, id_solicitud, id_perfil),

    CONSTRAINT uq_cotizacion_pago_relacion
        UNIQUE (id_cotizacion, id_solicitud)
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_solicitud
    ON cotizaciones(id_solicitud);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_perfil
    ON cotizaciones(id_perfil);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado
    ON cotizaciones(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cotizacion_aceptada_solicitud
    ON cotizaciones(id_solicitud)
    WHERE estado = 'ACEPTADA';


-- 2. INCREMENTOS DE PRECIO
CREATE TABLE IF NOT EXISTS incrementos_cotizacion (
    id_incremento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    id_cotizacion UUID NOT NULL
        REFERENCES cotizaciones(id_cotizacion) ON DELETE RESTRICT,

    motivo TEXT NOT NULL,

    precio_anterior NUMERIC(10,2) NOT NULL,
    monto_incremento NUMERIC(10,2) NOT NULL,
    precio_nuevo NUMERIC(10,2) NOT NULL,

    conceptos_adicionales JSONB,

    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',

    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP,

    id_usuario_decision UUID
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    CONSTRAINT chk_incremento_precios
        CHECK (
            precio_anterior >= 0
            AND monto_incremento > 0
            AND precio_nuevo = precio_anterior + monto_incremento
        ),

    CONSTRAINT chk_incremento_estado
        CHECK (
            estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')
        )
);

CREATE INDEX IF NOT EXISTS idx_incrementos_cotizacion
    ON incrementos_cotizacion(id_cotizacion);

CREATE INDEX IF NOT EXISTS idx_incrementos_estado
    ON incrementos_cotizacion(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_incremento_pendiente
    ON incrementos_cotizacion(id_cotizacion)
    WHERE estado = 'PENDIENTE';


-- 3. VISITAS PREVIAS
CREATE TABLE IF NOT EXISTS visitas_previas (
    id_visita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    id_solicitud UUID NOT NULL
        REFERENCES solicitudes_servicio(id_solicitud) ON DELETE CASCADE,

    id_perfil UUID
        REFERENCES perfiles_trabajador(id_perfil) ON DELETE RESTRICT,

    id_usuario_solicitante UUID NOT NULL
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    id_usuario_respuesta UUID
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    fecha_propuesta DATE NOT NULL,
    hora_propuesta TIME NOT NULL,

    fecha_confirmada DATE,
    hora_confirmada TIME,

    estado VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
    resultado TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_visita_estado
        CHECK (
            estado IN (
                'SOLICITADA',
                'ACEPTADA',
                'RECHAZADA',
                'CANCELADA',
                'REALIZADA',
                'NO_REALIZADA'
            )
        ),

    CONSTRAINT chk_visita_fecha_confirmada
        CHECK (
            (fecha_confirmada IS NULL AND hora_confirmada IS NULL)
            OR
            (fecha_confirmada IS NOT NULL AND hora_confirmada IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_visitas_solicitud
    ON visitas_previas(id_solicitud);

CREATE INDEX IF NOT EXISTS idx_visitas_perfil_fecha
    ON visitas_previas(id_perfil, fecha_propuesta);

CREATE INDEX IF NOT EXISTS idx_visitas_estado
    ON visitas_previas(estado);


-- 4. RELACIONAR PAGOS CON COTIZACIONES
ALTER TABLE pagos
    ADD COLUMN IF NOT EXISTS id_cotizacion UUID;

-- Retirar nombre anterior si existiera.
ALTER TABLE pagos
    DROP CONSTRAINT IF EXISTS fk_pagos_cotizacion;

-- Agregar FK compuesta solamente si no existe.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pagos_cotizacion_solicitud'
          AND conrelid = 'pagos'::regclass
    ) THEN
        ALTER TABLE pagos
            ADD CONSTRAINT fk_pagos_cotizacion_solicitud
            FOREIGN KEY (id_cotizacion, id_solicitud)
            REFERENCES cotizaciones(id_cotizacion, id_solicitud)
            ON DELETE RESTRICT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_pago_cotizacion_solicitud'
          AND conrelid = 'pagos'::regclass
    ) THEN
        ALTER TABLE pagos
            ADD CONSTRAINT chk_pago_cotizacion_solicitud
            CHECK (
                id_cotizacion IS NULL OR id_solicitud IS NOT NULL
            );
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_pagos_cotizacion
    ON pagos(id_cotizacion);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_anticipo_cotizacion
    ON pagos(id_cotizacion)
    WHERE tipo = 'ANTICIPO_25'
      AND id_cotizacion IS NOT NULL;


-- 5. RELACIONAR PROGRAMACION CON COTIZACION
ALTER TABLE servicios_programados
    ADD COLUMN IF NOT EXISTS id_cotizacion UUID;

ALTER TABLE servicios_programados
    DROP CONSTRAINT IF EXISTS fk_programacion_cotizacion;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_programacion_cotizacion_relacion'
          AND conrelid = 'servicios_programados'::regclass
    ) THEN
        ALTER TABLE servicios_programados
            ADD CONSTRAINT fk_programacion_cotizacion_relacion
            FOREIGN KEY (id_cotizacion, id_solicitud, id_perfil)
            REFERENCES cotizaciones(
                id_cotizacion,
                id_solicitud,
                id_perfil
            )
            ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_programacion_cotizacion
    ON servicios_programados(id_cotizacion)
    WHERE id_cotizacion IS NOT NULL;


-- ============================================================================
-- FIN MIGRACION 006
-- ============================================================================
