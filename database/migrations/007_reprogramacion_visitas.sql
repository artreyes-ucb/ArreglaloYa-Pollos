-- ============================================================================
-- MIGRACION 007 - REPROGRAMACION DE VISITAS PREVIAS
-- Sistema: Arreglalo Ya
-- Requiere migracion 006. No modifica migraciones 001-006.
-- PostgreSQL
-- ============================================================================
-- Esta migracion es aditiva y no destructiva:
-- - Agrega columnas nullable a visitas_previas para hora fin.
-- - Crea tabla reprogramaciones_visita para propuestas e historial.
-- - Agrega checks, FKs e indices.
-- No ejecuta DROP de tablas/columnas ni DELETE/UPDATE de datos.

-- 1. Extender visitas_previas con hora fin (aditivo, nullable)
ALTER TABLE visitas_previas
    ADD COLUMN IF NOT EXISTS hora_fin_propuesta TIME;

ALTER TABLE visitas_previas
    ADD COLUMN IF NOT EXISTS hora_fin_confirmada TIME;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_visita_hora_fin_propuesta'
          AND conrelid = 'visitas_previas'::regclass
    ) THEN
        ALTER TABLE visitas_previas
            ADD CONSTRAINT chk_visita_hora_fin_propuesta
            CHECK (
                hora_fin_propuesta IS NULL
                OR hora_fin_propuesta > hora_propuesta
            );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_visita_hora_fin_confirmada'
          AND conrelid = 'visitas_previas'::regclass
    ) THEN
        ALTER TABLE visitas_previas
            ADD CONSTRAINT chk_visita_hora_fin_confirmada
            CHECK (
                (hora_fin_confirmada IS NULL)
                OR (
                    hora_confirmada IS NOT NULL
                    AND hora_fin_confirmada > hora_confirmada
                )
            );
    END IF;
END
$$;

-- 2. Tabla de propuestas de reprogramacion
CREATE TABLE IF NOT EXISTS reprogramaciones_visita (
    id_reprogramacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    id_visita UUID NOT NULL
        REFERENCES visitas_previas(id_visita) ON DELETE CASCADE,

    id_usuario_solicitante UUID NOT NULL
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    rol_solicitante VARCHAR(20) NOT NULL,

    fecha_anterior DATE NOT NULL,
    hora_inicio_anterior TIME NOT NULL,
    hora_fin_anterior TIME,

    fecha_propuesta DATE NOT NULL,
    hora_inicio_propuesta TIME NOT NULL,
    hora_fin_propuesta TIME NOT NULL,

    motivo TEXT NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    id_usuario_respuesta UUID
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,

    fecha_respuesta TIMESTAMP,
    motivo_respuesta TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_reprogramacion_rol_solicitante
        CHECK (rol_solicitante IN ('CLIENTE', 'TRABAJADOR')),

    CONSTRAINT chk_reprogramacion_estado
        CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA')),

    CONSTRAINT chk_reprogramacion_horas_propuestas
        CHECK (hora_fin_propuesta > hora_inicio_propuesta),

    CONSTRAINT chk_reprogramacion_horas_anteriores
        CHECK (
            hora_fin_anterior IS NULL
            OR hora_fin_anterior > hora_inicio_anterior
        ),

    CONSTRAINT chk_reprogramacion_respuesta
        CHECK (
            (
                estado = 'PENDIENTE'
                AND id_usuario_respuesta IS NULL
                AND fecha_respuesta IS NULL
            )
            OR (
                estado IN ('ACEPTADA', 'RECHAZADA', 'CANCELADA')
                AND id_usuario_respuesta IS NOT NULL
                AND fecha_respuesta IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_visita
    ON reprogramaciones_visita(id_visita);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_estado
    ON reprogramaciones_visita(estado);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_solicitante
    ON reprogramaciones_visita(id_usuario_solicitante);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_fecha_propuesta
    ON reprogramaciones_visita(fecha_propuesta, hora_inicio_propuesta, hora_fin_propuesta);

-- Solo una propuesta pendiente por visita.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reprogramacion_pendiente_visita
    ON reprogramaciones_visita(id_visita)
    WHERE estado = 'PENDIENTE';

-- ============================================================================
-- FIN MIGRACION 007
-- Reversion (requiere autorizacion; puede afectar datos de reprogramaciones):
--   DROP TABLE IF EXISTS reprogramaciones_visita;
--   ALTER TABLE visitas_previas DROP CONSTRAINT IF EXISTS chk_visita_hora_fin_confirmada;
--   ALTER TABLE visitas_previas DROP CONSTRAINT IF EXISTS chk_visita_hora_fin_propuesta;
--   ALTER TABLE visitas_previas DROP COLUMN IF EXISTS hora_fin_confirmada;
--   ALTER TABLE visitas_previas DROP COLUMN IF EXISTS hora_fin_propuesta;
-- ============================================================================
