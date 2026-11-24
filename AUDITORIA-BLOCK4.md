# Auditoría de migraciones del Bloque 4

## 1. Alcance y migraciones revisadas

| Migración | Revisión |
| --- | --- |
| `database/migrations/005_block5_economia_cierre_reclamos.sql` | Revisada en detalle por compatibilidad con el Bloque 4. |
| `database/migrations/006_block4_cotizaciones_visitas.sql` | Auditada en detalle: tablas, columnas, restricciones, índices y orden. |
| `001` a `004` y `database/01_init_arreglalo_ya.sql` | Solo como dependencias de orden; no se modificaron. |

Se corrigió únicamente la cabecera de la migración 006, que indicaba «MIGRACION 005» y no declaraba la dependencia de 005. No se cambió ningún objeto estructural.

## 2. Orden de ejecución

Instalación nueva: `001` → `002` → `003` → `004` → `005` → `006`.

La migración 006 depende de 005 porque ambas amplían `pagos` y `servicios_programados`; 005 además crea `comisiones`, `reembolsos`, `evaluaciones` y `reclamos`. La migración 006 solo se aplicó en la base local después de 005.

## 3. Objetos declarados por la migración 006

### Tablas

- `cotizaciones`: `id_cotizacion`, `id_solicitud`, `id_perfil`, `precio_mano_obra`, `precio_materiales`, `precio_total`, `alcance`, `condiciones`, `estado`, `fecha_envio`, `fecha_respuesta`, `fecha_vencimiento`, `id_usuario_decision`.
- `incrementos_cotizacion`: `id_incremento`, `id_cotizacion`, `motivo`, `precio_anterior`, `monto_incremento`, `precio_nuevo`, `conceptos_adicionales`, `estado`, `fecha_solicitud`, `fecha_respuesta`, `id_usuario_decision`.
- `visitas_previas`: `id_visita`, `id_solicitud`, `id_perfil`, `id_usuario_solicitante`, `id_usuario_respuesta`, `fecha_propuesta`, `hora_propuesta`, `fecha_confirmada`, `hora_confirmada`, `estado`, `resultado`, `fecha_creacion`, `fecha_actualizacion`.

### Columnas añadidas a tablas existentes

- `pagos.id_cotizacion` (UUID, nullable).
- `servicios_programados.id_cotizacion` (UUID, nullable).

### Restricciones

- Llaves primarias de las tres tablas nuevas.
- Foreign keys: cotizaciones → solicitudes/perfiles/usuarios; incrementos → cotizaciones/usuarios; visitas → solicitudes/perfiles/usuarios; `pagos` → `cotizaciones(id_cotizacion, id_solicitud)`; `servicios_programados` → `cotizaciones(id_cotizacion, id_solicitud, id_perfil)`.
- Cheques: `chk_cotizacion_precios`, `chk_cotizacion_estado`, `chk_incremento_precios`, `chk_incremento_estado`, `chk_visita_estado`, `chk_visita_fecha_confirmada`, `chk_pago_cotizacion_solicitud`.
- Unicidad: `uq_cotizacion_relacion`, `uq_cotizacion_pago_relacion`.

### Índices

- `idx_cotizaciones_solicitud`, `idx_cotizaciones_perfil`, `idx_cotizaciones_estado`, `uq_cotizacion_aceptada_solicitud` (parcial).
- `idx_incrementos_cotizacion`, `idx_incrementos_estado`, `uq_incremento_pendiente` (parcial).
- `idx_visitas_solicitud`, `idx_visitas_perfil_fecha`, `idx_visitas_estado`.
- `idx_pagos_cotizacion`, `uq_pago_anticipo_cotizacion` (parcial).
- `uq_programacion_cotizacion` (parcial).

## 4. Comparación con las entidades TypeORM

| Entidad | Resultado |
| --- | --- |
| `cotizacion.entity.ts` | Coincide en columnas, tipos, nulabilidad y relaciones con `cotizaciones`. `solicitud` CASCADE, `perfil` RESTRICT, `usuarioDecision` nullable. |
| `incremento-cotizacion.entity.ts` | Coincide con `incrementos_cotizacion`. |
| `visita-previa.entity.ts` | Coincide con `visitas_previas`, incluido `perfil` y `usuarioRespuesta` opcionales. |
| `servicio-programado.entity.ts` | Coincide con la tabla existente ampliada por 005 y 006; incluye `cotizacion` opcional. |
| `pago.entity.ts` | Coincide con `pagos`, incluidas `idCotizacion` y `idProgramacion` opcionales. |
| `registro-auditoria.entity.ts` | Apunta a `registros_auditoria`, tabla existente; no es creada por 006. |

No se encontraron columnas o relaciones faltantes entre las entidades del Bloque 4 y el catálogo de la base local.

## 5. Compatibilidad con la migración 005

- 005 amplía `servicios_programados` y `pagos`; 006 añade `id_cotizacion` a esas mismas tablas con `ADD COLUMN IF NOT EXISTS`. No hay colisión de nombres.
- 005 crea `pagos.id_programacion` con FK a `servicios_programados`; 006 crea `pagos.id_cotizacion` con FK compuesta a `cotizaciones`. Ambas restricciones coexisten.
- 006 elimina únicamente `fk_pagos_cotizacion` y `fk_programacion_cotizacion` si existen con esos nombres, y las recrea con nombres compuestos. No elimina columnas ni datos.
- 005 no crea las tablas `cotizaciones`, `incrementos_cotizacion` ni `visitas_previas`; por eso 006 puede ejecutarse después sin conflictos.

## 6. Estado en la base de datos local (`arreglalo_ya_db`)

Objetos verificados como existentes:

- Tablas: `cotizaciones`, `incrementos_cotizacion`, `visitas_previas`, `servicios_programados`, `pagos`, `solicitudes_servicio`, `perfiles_trabajador`, `usuarios`, `historial_solicitud`, `registros_auditoria`, `notificaciones`, `disponibilidad_trabajador`, `comisiones`, `reembolsos`, `evaluaciones`, `reclamos`.
- Columnas: todas las listadas en el apartado 3, más las columnas económicas añadidas por 005.
- Restricciones y índices: todos los listados en el apartado 3, confirmados en `pg_constraint` y `pg_indexes`.
- Objeto adicional heredado: `servicios_programados_id_solicitud_key` (UNIQUE sobre `id_solicitud`), procedente de la migración 003 y no creado por 006.

Objetos faltantes en el entorno local: ninguno.

## 7. Cambios necesarios

- Documentales: corregida la numeración y la dependencia en la cabecera de 006; aclarado el endpoint real de agenda en `README-BLOCK4.md`.
- De aplicación: la existencia del índice único parcial `uq_cotizacion_aceptada_solicitud` y del UNIQUE por `id_solicitud` en `servicios_programados` exige validar en código antes de guardar. Se agregaron validaciones para devolver HTTP 400 en lugar de un error 500 de base de datos cuando se intenta aceptar una segunda cotización o programar dos veces la misma solicitud.
- No se requieren cambios estructurales en la migración ni ejecución de `DROP` sobre la base local.

## 8. Resultado de la validación

- La migración 006 se validó previamente con `BEGIN; ... ROLLBACK;` sobre la base local: no terminó en error; solo produjo avisos (`NOTICE`) por objetos ya existentes.
- El catálogo actual confirma que los objetos de 006 están presentes, por lo que una reejecución sería idempotente para tablas, columnas e índices con `IF NOT EXISTS`.
- No se ejecutó ninguna sentencia destructiva ni se eliminaron registros durante esta auditoría.

## 9. Procedimiento seguro de aplicación en otro entorno

1. Realizar copia de seguridad completa de la base destino.
2. Verificar objetos existentes con `information_schema.columns`, `pg_constraint` y `pg_indexes`.
3. Ejecutar la migración dentro de una transacción de prueba y hacer `ROLLBACK`; revisar errores y avisos.
4. Aplicar 005 antes que 006 si aún no están presentes.
5. Aplicar 006 sin transacción de prueba y verificar tablas, columnas, restricciones e índices.
6. No habilitar `synchronize: true` en TypeORM; la configuración actual es `synchronize: false`.

## 10. Reversión

La migración 006 no incluye script `DOWN`. Una reversión estructural implicaría, en orden inverso: eliminar índices, restricciones foráneas, columnas `id_cotizacion` y finalmente las tres tablas nuevas. Esa operación puede afectar datos de cotizaciones, visitas y pagos, por lo que debe autorizarse explícitamente y ejecutarse solo sobre una copia de seguridad. No se ejecutó en esta revisión.

## 11. Confirmación de aplicación

- Entorno local: los objetos de 006 están presentes y fueron verificados por catálogo; 005 también está aplicada.
- Esta revisión: no se aplicó 006 de forma real; únicamente se revisó el archivo y se validó previamente con transacción de prueba.
- Entornos de entrega: queda pendiente aplicar el procedimiento del apartado 9 con copia de seguridad previa.
