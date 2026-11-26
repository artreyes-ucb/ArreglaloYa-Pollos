-- Migración 007 - Historial avanzado de solicitudes.
-- Ejecutar sobre arreglalo_ya_db después de 006_block4_cotizaciones_visitas.sql.
--
-- Objetivo:
--   1. Guardar una fotografía del responsable (nombre y rol) para que el
--      historial no cambie si el usuario actualiza su perfil o su rol activo.
--   2. Identificar de forma explícita los eventos automáticos del sistema.
--   3. Acelerar los filtros del endpoint GET /api/requests/:id/history.
--
-- La migración es idempotente: puede ejecutarse más de una vez sin duplicar
-- columnas, índices ni datos.

ALTER TABLE historial_solicitud
    ADD COLUMN IF NOT EXISTS actor_nombre VARCHAR(200);

ALTER TABLE historial_solicitud
    ADD COLUMN IF NOT EXISTS rol_actor VARCHAR(30);

ALTER TABLE historial_solicitud
    ADD COLUMN IF NOT EXISTS automatico BOOLEAN NOT NULL DEFAULT FALSE;

-- Relleno histórico: los eventos anteriores a esta migración obtienen el
-- nombre y rol actual del usuario referenciado. No se inventan actores.
UPDATE historial_solicitud h
SET actor_nombre = CONCAT(u.nombres, ' ', u.apellidos),
    rol_actor = u.rol_activo
FROM usuarios u
WHERE h.id_usuario_actor = u.id_usuario
  AND (h.actor_nombre IS NULL OR h.rol_actor IS NULL);

-- Todo evento sin usuario actor es automático (vencimiento, reducción de
-- prioridad, procesos programados, etc.).
UPDATE historial_solicitud
SET automatico = TRUE
WHERE id_usuario_actor IS NULL
  AND automatico = FALSE;

CREATE INDEX IF NOT EXISTS idx_historial_solicitud_tipo_evento
    ON historial_solicitud(id_solicitud, tipo_evento);

CREATE INDEX IF NOT EXISTS idx_historial_solicitud_actor
    ON historial_solicitud(id_solicitud, id_usuario_actor);

CREATE INDEX IF NOT EXISTS idx_historial_solicitud_fecha
    ON historial_solicitud(fecha_evento DESC);

-- Verificación rápida posterior a la ejecución:
--   SELECT tipo_evento, automatico, COUNT(*)
--   FROM historial_solicitud
--   GROUP BY tipo_evento, automatico
--   ORDER BY tipo_evento;
