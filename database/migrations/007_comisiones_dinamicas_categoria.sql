-- ============================================================================
-- MIGRACIÓN 007: COMISIONES DINÁMICAS POR CATEGORÍA DE SERVICIO
-- Sistema: Arréglalo Ya
-- Ejecutar después de 006_block4_cotizaciones_visitas.sql
-- ============================================================================

-- 1. Agregar porcentaje de comisión configurable por categoría (por defecto 5.00%)
ALTER TABLE categorias_servicio
  ADD COLUMN IF NOT EXISTS porcentaje_comision NUMERIC(5, 2) NOT NULL DEFAULT 5.00;

-- 2. Restricción de integridad para garantizar un porcentaje válido entre 0% y 100%
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_categoria_porcentaje_comision'
          AND conrelid = 'categorias_servicio'::regclass
    ) THEN
        ALTER TABLE categorias_servicio
            ADD CONSTRAINT chk_categoria_porcentaje_comision
            CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100);
    END IF;
END
$$;

-- 3. Asegurar que la tabla comisiones conserve el porcentaje histórico aplicado
ALTER TABLE comisiones
  ALTER COLUMN porcentaje SET NOT NULL,
  ALTER COLUMN porcentaje SET DEFAULT 5.00;