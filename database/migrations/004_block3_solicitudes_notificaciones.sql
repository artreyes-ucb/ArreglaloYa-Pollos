-- Migración 004 - Bloque 3: fotografías de solicitudes, historial de cambios y notificaciones internas.
-- Ejecutar sobre arreglalo_ya_db después de 003_block2_agenda.sql.
-- No altera las tablas troncales creadas en 01_init_arreglalo_ya.sql.

CREATE TABLE IF NOT EXISTS fotografias_solicitud (
    id_fotografia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID NOT NULL REFERENCES solicitudes_servicio(id_solicitud) ON DELETE CASCADE,
    ruta_imagen TEXT NOT NULL,
    descripcion VARCHAR(200),
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fotografias_solicitud_solicitud
    ON fotografias_solicitud(id_solicitud);

CREATE TABLE IF NOT EXISTS historial_solicitud (
    id_evento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID NOT NULL REFERENCES solicitudes_servicio(id_solicitud) ON DELETE CASCADE,
    id_usuario_actor UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    detalle JSONB,
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historial_solicitud_solicitud_fecha
    ON historial_solicitud(id_solicitud, fecha_evento DESC);

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    entidad_relacionada VARCHAR(50),
    id_entidad_relacionada VARCHAR(100),
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_fecha
    ON notificaciones(id_usuario, fecha_envio DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida
    ON notificaciones(id_usuario, leida);
