-- Migración 007 - Preferencias de notificaciones por usuario
-- Permite configurar qué categorías de avisos desea recibir cada usuario dentro de la plataforma.

CREATE TABLE IF NOT EXISTS preferencias_notificacion (
    id_preferencia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL UNIQUE REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    notif_solicitudes BOOLEAN NOT NULL DEFAULT TRUE,
    notif_cotizaciones BOOLEAN NOT NULL DEFAULT TRUE,
    notif_servicios BOOLEAN NOT NULL DEFAULT TRUE,
    notif_pagos BOOLEAN NOT NULL DEFAULT TRUE,
    notif_reclamos BOOLEAN NOT NULL DEFAULT TRUE,
    notif_sistema BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_preferencias_notif_usuario
    ON preferencias_notificacion(id_usuario);

-- Poblar preferencias predeterminadas para los usuarios existentes
INSERT INTO preferencias_notificacion (id_usuario)
SELECT id_usuario FROM usuarios
ON CONFLICT (id_usuario) DO NOTHING;
