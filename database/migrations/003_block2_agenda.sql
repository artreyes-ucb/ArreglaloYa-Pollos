-- Migración 003 - Bloque 2: disponibilidad y agenda de trabajadores.
-- Ejecutar después de 002_block2_perfil_trabajador.sql.

CREATE TABLE IF NOT EXISTS disponibilidad_trabajador (
    id_disponibilidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_perfil UUID NOT NULL REFERENCES perfiles_trabajador(id_perfil) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_disponibilidad_horario
        CHECK (hora_inicio < hora_fin),
    CONSTRAINT uq_disponibilidad_trabajador_dia
        UNIQUE (id_perfil, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_trabajador_perfil
    ON disponibilidad_trabajador(id_perfil);

CREATE TABLE IF NOT EXISTS servicios_programados (
    id_programacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID NOT NULL UNIQUE
        REFERENCES solicitudes_servicio(id_solicitud) ON DELETE CASCADE,
    id_perfil UUID NOT NULL
        REFERENCES perfiles_trabajador(id_perfil) ON DELETE RESTRICT,
    fecha_servicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADO',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_servicio_programado_horario
        CHECK (hora_inicio < hora_fin),
    CONSTRAINT chk_servicio_programado_estado
        CHECK (estado IN ('PROGRAMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_servicios_programados_perfil_fecha
    ON servicios_programados(id_perfil, fecha_servicio);

CREATE INDEX IF NOT EXISTS idx_servicios_programados_estado
    ON servicios_programados(estado);
