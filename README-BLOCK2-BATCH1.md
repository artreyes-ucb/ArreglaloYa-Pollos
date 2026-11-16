# Arréglalo Ya — Bloque 2, Batch 1 (CU-11)

Este paquete agrega la primera parte del Bloque 2: edición del perfil profesional del trabajador, servicios ofrecidos con precio estimado y zonas de cobertura.

## Archivos incluidos

- `backend/src/workers/`: módulo, controlador, servicio y DTOs de perfil del trabajador.
- `backend/src/entities/servicio-trabajador.entity.ts`: entidad para servicios ofrecidos.
- `backend/src/entities/perfil-trabajador.entity.ts`: relaciones con servicios y zonas.
- `backend/src/app.module.ts`: registro del módulo y entidad.
- `backend/src/common/guards/roles.guard.ts`: corrige autorización para exigir el rol activo.
- `database/migrations/002_block2_perfil_trabajador.sql`: tablas nuevas requeridas.

## Cómo aplicar

1. Haz una copia de seguridad de tu rama y confirma que estás en `feature/block-2`.
2. Extrae el contenido de este ZIP en la raíz del repositorio, conservando las rutas. Acepta reemplazar los archivos indicados.
3. Abre PostgreSQL/pgAdmin y selecciona la base `arreglalo_ya_db`.
4. Ejecuta una sola vez el contenido de `database/migrations/002_block2_perfil_trabajador.sql`.
5. Desde la carpeta `backend`, ejecuta `npm run build`.
6. Si compila, ejecuta `npm test -- --runInBand` y luego `npm run start:dev`.

No habilites `synchronize: true`. La migración SQL es la que crea las tablas nuevas.

## Endpoints

- `GET /api/workers/me` — perfil propio del trabajador. Requiere JWT y rol activo `TRABAJADOR`. Incluye los datos bancarios del propio trabajador.
- `PATCH /api/workers/me` — actualiza el perfil propio. Requiere JWT y rol activo `TRABAJADOR`.
- `GET /api/workers/:idPerfil` — perfil público. Solo devuelve perfiles con estado `APROBADO`; no devuelve datos bancarios ni documento de identidad.

### Ejemplo de PATCH

```json
{
  "descripcion": "Técnico con experiencia en instalaciones y reparaciones domésticas.",
  "anosExperiencia": 5,
  "datosBancarios": "Datos bancarios privados",
  "servicios": [
    {
      "idCategoria": 1,
      "nombreServicio": "Reparación de grifos",
      "descripcion": "Cambio de grifería y reparación de fugas.",
      "precioEstimado": 120.00
    }
  ],
  "zonasIds": [1, 2]
}
```

Las listas `servicios` y `zonasIds`, cuando se envían, reemplazan las listas existentes. Enviar `[]` permite borrar la lista correspondiente. Omitirlas conserva sus valores actuales.

## Decisiones y límites de este batch

- Los servicios ofrecidos se relacionan con una categoría existente y guardan nombre, descripción y precio estimado.
- Las zonas se relacionan mediante `trabajador_zonas`.
- El precio se almacena como `NUMERIC(10,2)`. La moneda no está definida en el esquema entregado; el equipo debe confirmar si todos los precios se expresarán en Bs antes de fijar etiquetas en la interfaz.
- `datos_bancarios` ya existía como columna de texto en el esquema inicial. En este batch se protege evitando incluirlo en la respuesta pública, pero no se implementa cifrado en reposo. Eso debe tratarse como una mejora de seguridad antes de producción.
- El campo heredado `documento_identidad` no se devuelve en ninguno de estos endpoints.
- El perfil público solo es visible cuando `estado_validacion = 'APROBADO'`. La aprobación administrativa pertenece al siguiente batch (CU-09).
- La actualización de servicios y zonas se realiza dentro de una transacción para evitar cambios parciales.
- La auditoría registra los nombres de campos modificados y cantidades, nunca el contenido de datos bancarios.

## Verificación manual mínima

1. Con un usuario cuyo rol activo sea `TRABAJADOR`, llamar `GET /api/workers/me`.
2. Llamar `PATCH /api/workers/me` con el JSON de ejemplo y comprobar que guarda servicios y zonas.
3. Enviar un `idCategoria` o `zonasIds` inexistente y comprobar que responde `400` sin guardar cambios parciales.
4. Cambiar el rol activo a `CLIENTE` y comprobar que las rutas `/me` responden `403`.
5. Consultar `GET /api/workers/:idPerfil` de un perfil pendiente y comprobar que responde `404`.
6. Comprobar que el perfil público aprobado no contiene `datosBancarios` ni `documentoIdentidad`.

Este paquete no se considera terminado hasta que el build y estas pruebas se ejecuten correctamente en el repositorio local conectado a PostgreSQL.
