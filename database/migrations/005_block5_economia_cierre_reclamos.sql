-- ============================================================================
-- MIGRACIÓN 005 - BLOQUE 5: MOTOR ECONÓMICO, CIERRE DUAL, EVALUACIONES Y RECLAMOS
-- Ejecutar sobre arreglalo_ya_db después de 004_block3_solicitudes_notificaciones.sql
-- ============================================================================

-- 1. Ampliación de servicios_programados (cierre dual, precio acordado y cancelación)
ALTER TABLE servicios_programados
  ADD COLUMN IF NOT EXISTS precio_acordado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marcado_terminado_por_trabajador BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_declaracion_trabajador TIMESTAMP,
  ADD COLUMN IF NOT EXISTS confirmado_por_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_cliente TIMESTAMP,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_por_usuario_id UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP;

-- 2. Ampliación de pagos (vinculación con servicio programado y confirmación bilateral - CU-18 / RNF-06)
-- Nota: se reutilizan las columnas existentes de 01_init: tipo, estado, confirmado_cliente, confirmado_trabajador
ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS id_programacion UUID REFERENCES servicios_programados(id_programacion) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS monto_reportado_cliente NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_cliente TIMESTAMP,
  ADD COLUMN IF NOT EXISTS monto_reportado_trabajador NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_trabajador TIMESTAMP,
  ADD COLUMN IF NOT EXISTS referencia VARCHAR(150);

-- 3. Tabla de Comisiones (5% plataforma / 95% trabajador - CU-20 / RN-09)
CREATE TABLE IF NOT EXISTS comisiones (
  id_comision UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_programacion UUID NOT NULL UNIQUE REFERENCES servicios_programados(id_programacion) ON DELETE CASCADE,
  precio_final NUMERIC(10, 2) NOT NULL,
  porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  monto_comision NUMERIC(10, 2) NOT NULL,
  monto_neto_trabajador NUMERIC(10, 2) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'REGISTRADA', -- REGISTRADA | LIQUIDADA
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Reembolsos de Anticipo (CU-19 / RN-13)
CREATE TABLE IF NOT EXISTS reembolsos (
  id_reembolso UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_programacion UUID NOT NULL REFERENCES servicios_programados(id_programacion) ON DELETE CASCADE,
  id_pago UUID NOT NULL REFERENCES pagos(id_pago) ON DELETE CASCADE,
  id_cliente UUID NOT NULL REFERENCES usuarios(id_usuario),
  monto_solicitado NUMERIC(10, 2) NOT NULL,
  motivo TEXT NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE | APROBADO | RECHAZADO | COMPLETADO
  resuelto_por_admin_id UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  observacion_admin TEXT,
  fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP
);

-- 5. Tabla de Evaluaciones / Calificaciones (CU-08 / HU-F15)
CREATE TABLE IF NOT EXISTS evaluaciones (
  id_evaluacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_programacion UUID NOT NULL UNIQUE REFERENCES servicios_programados(id_programacion) ON DELETE CASCADE,
  id_cliente UUID NOT NULL REFERENCES usuarios(id_usuario),
  id_trabajador UUID NOT NULL REFERENCES usuarios(id_usuario),
  puntuacion SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT,
  fecha_evaluacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Reclamos dentro de 7 días (CU-07 / HU-F16 / HU-F17)
CREATE TABLE IF NOT EXISTS reclamos (
  id_reclamo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_programacion UUID NOT NULL REFERENCES servicios_programados(id_programacion) ON DELETE CASCADE,
  id_cliente UUID NOT NULL REFERENCES usuarios(id_usuario),
  id_trabajador UUID NOT NULL REFERENCES usuarios(id_usuario),
  descripcion TEXT NOT NULL,
  evidencia_url TEXT,
  estado VARCHAR(30) NOT NULL DEFAULT 'ABIERTO', -- ABIERTO | EN_REVISION | RESUELTO | RECHAZADO | CERRADO
  resolucion TEXT,
  resuelto_por_admin_id UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  fecha_reclamo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_programacion ON pagos(id_programacion);
CREATE INDEX IF NOT EXISTS idx_comisiones_programacion ON comisiones(id_programacion);
CREATE INDEX IF NOT EXISTS idx_reembolsos_programacion ON reembolsos(id_programacion);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_trabajador ON evaluaciones(id_trabajador);
CREATE INDEX IF NOT EXISTS idx_reclamos_programacion ON reclamos(id_programacion);
CREATE INDEX IF NOT EXISTS idx_reclamos_estado ON reclamos(estado);