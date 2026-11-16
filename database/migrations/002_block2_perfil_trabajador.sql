-- Migración 002 - Bloque 2, CU-11: servicios ofrecidos y zonas de cobertura.
-- Ejecutar una sola vez sobre arreglalo_ya_db después de 01_init_arreglalo_ya.sql.

CREATE TABLE IF NOT EXISTS servicios_trabajador (
    id_servicio_trabajador UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_perfil UUID NOT NULL REFERENCES perfiles_trabajador(id_perfil) ON DELETE CASCADE,
    id_categoria INT NOT NULL REFERENCES categorias_servicio(id_categoria) ON DELETE RESTRICT,
    nombre_servicio VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_estimado NUMERIC(10, 2) NOT NULL CHECK (precio_estimado >= 0),
    CONSTRAINT uq_servicio_trabajador_nombre
      UNIQUE (id_perfil, id_categoria, nombre_servicio)
);

CREATE INDEX IF NOT EXISTS idx_servicios_trabajador_perfil
    ON servicios_trabajador(id_perfil);
CREATE INDEX IF NOT EXISTS idx_servicios_trabajador_categoria
    ON servicios_trabajador(id_categoria);

CREATE TABLE IF NOT EXISTS trabajador_zonas (
    id_perfil UUID NOT NULL REFERENCES perfiles_trabajador(id_perfil) ON DELETE CASCADE,
    id_zona INT NOT NULL REFERENCES zonas(id_zona) ON DELETE RESTRICT,
    CONSTRAINT pk_trabajador_zonas PRIMARY KEY (id_perfil, id_zona)
);

CREATE INDEX IF NOT EXISTS idx_trabajador_zonas_zona
    ON trabajador_zonas(id_zona);
