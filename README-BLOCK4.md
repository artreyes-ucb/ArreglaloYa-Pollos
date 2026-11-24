# Bloque 4 — Cotizaciones, visitas previas y programación de servicios

## 1. Alcance

Este documento describe el estado real del Bloque 4 de ArreglaloYa-Pollos: cotizaciones, visitas previas, disponibilidad semanal y programación de servicios. La implementación original se integró en `main` mediante el Pull Request #1; las correcciones de esta revisión están en la rama `feature/block-4-cotizaciones-programacion` y pendientes en el Pull Request #2.

## 2. Funcionalidades implementadas

| Funcionalidad | Descripción |
| --- | --- |
| Cotizaciones | Creación, listado por solicitud, aceptación y rechazo. Incluye cálculo de totales, validación de roles, historial, notificaciones y transición de la solicitud a `CONTRATADA` cuando se acepta una cotización. |
| Visitas previas | Creación, consulta por solicitud y respuesta por parte del cliente o del trabajador. Incluye permisos, historial, auditoría y notificaciones. |
| Disponibilidad semanal | Configuración de los siete días de la semana con rangos horarios y persistencia en PostgreSQL. |
| Programación de servicios | Creación de `servicios_programados` a partir de una cotización aceptada, validación de disponibilidad, prevención de solapes y transición de la solicitud a `PROGRAMADA`. |
| Agenda y consulta | Agenda del trabajador y consulta de la programación desde las solicitudes del cliente. |

## 3. Estructura real del código

### Backend

- `backend/src/quotations/` — controlador, servicio, módulo y DTOs de cotizaciones.
- `backend/src/visits/` — controlador, servicio, módulo y DTOs de visitas previas.
- `backend/src/workers/workers.service.ts` — disponibilidad, agenda y programación de servicios.
- `backend/src/workers/dto/` — DTOs de disponibilidad y programación.
- `backend/src/entities/cotizacion.entity.ts`
- `backend/src/entities/visita-previa.entity.ts`
- `backend/src/entities/servicio-programado.entity.ts`
- `backend/src/entities/pago.entity.ts`
- `backend/src/entities/incremento-cotizacion.entity.ts`
- `backend/src/app.module.ts` — registro de módulos y configuración de TypeORM con `synchronize: false`.

### Frontend

- `frontend/src/app/core/models/` — modelos de cotizaciones, visitas y solicitudes.
- `frontend/src/app/core/services/` — servicios HTTP de cotizaciones, visitas, trabajadores y solicitudes.
- `frontend/src/app/pages/client-requests/` — consulta y respuesta de cotizaciones y visitas del cliente.
- `frontend/src/app/pages/worker-requests/` — cotizaciones y visitas del trabajador.
- `frontend/src/app/pages/worker-agenda/` — disponibilidad y agenda del trabajador.

### Base de datos

- `database/migrations/005_block5_economia_cierre_reclamos.sql`
- `database/migrations/006_block4_cotizaciones_visitas.sql`

## 4. Endpoints principales

| Método | Ruta | Función |
| --- | --- | --- |
| `POST` | `/api/quotations` | Crear cotización |
| `GET` | `/api/quotations/request/:idSolicitud` | Listar cotizaciones de una solicitud |
| `PATCH` | `/api/quotations/:idCotizacion/response` | Aceptar o rechazar cotización |
| `POST` | `/api/visits` | Crear visita previa |
| `GET` | `/api/visits/request/:idSolicitud` | Listar visitas previas de una solicitud |
| `PATCH` | `/api/visits/:idVisita/response` | Responder una visita previa |
| `POST` | `/api/workers/me/availability` | Guardar disponibilidad semanal |
| `GET` | `/api/workers/me/availability` | Consultar disponibilidad semanal |
| `POST` | `/api/workers/me/schedule` | Programar servicio |
| `GET` | `/api/workers/me/schedule` | Consultar agenda del trabajador |

## 5. Migración 006

La migración `database/migrations/006_block4_cotizaciones_visitas.sql` crea o amplía los objetos del Bloque 4:

- Tablas: `cotizaciones`, `incrementos_cotizacion`, `visitas_previas`.
- Columnas: `pagos.id_cotizacion` y `servicios_programados.id_cotizacion`.
- Restricciones: cheques de estados y precios, llaves foráneas de cotizaciones, visitas, pagos y programación.
- Índices: búsqueda por solicitud, perfil, estado y unicidad de cotización aceptada y programación por cotización.

Orden recomendado en instalaciones nuevas: `001` a `004`, luego `005_block5_economia_cierre_reclamos.sql` y finalmente `006_block4_cotizaciones_visitas.sql`. La migración 006 depende de 005 porque ambas amplían `pagos` y `servicios_programados`.

El inventario detallado de objetos, la comparación con las entidades y el procedimiento seguro de aplicación y reversión están en `AUDITORIA-BLOCK4.md`.

Antes de aplicar 006 en una base de datos con información real, se debe realizar una copia de seguridad y validar los objetos existentes. La migración no contiene un script de reversión; cualquier reversión estructural debe autorizarse por separado porque puede implicar eliminación de columnas o restricciones con datos asociados.

## 6. Estado de verificación

- Backend y frontend compilados correctamente tras las correcciones.
- 18/18 escenarios derivados del README ejecutados sobre la API HTTP real, sin fallos; el detalle está en `PRUEBAS-BLOCK4.md`.
- Validación visual parcial en navegador de visitas previas y agenda del trabajador, con 0 errores de consola; no se ejecutó automatización E2E completa desde navegador para los 18 escenarios.
- Verificaciones adicionales mediante consultas SQL sobre la base de datos local; el detalle está en `PRUEBAS-BLOCK4.md`.
- La auditoría de migraciones está en `AUDITORIA-BLOCK4.md`.

## 7. Credenciales

Las cuentas temporales utilizadas durante las pruebas locales son solo de entorno de desarrollo y no deben reutilizarse en entornos reales. No se registran contraseñas, tokens ni secretos en este documento, en commits ni en archivos versionados.

## 8. Integración

La implementación original del Bloque 4 se integró en `main` mediante el Pull Request #1, ya fusionado y cerrado. Esta revisión no realizó merges adicionales.

Las correcciones técnicas y la documentación actualizada están publicadas en `feature/block-4-cotizaciones-programacion` y forman parte del Pull Request #2 (`https://github.com/artreyes-ucb/ArreglaloYa-Pollos/pull/2`), que queda pendiente de revisión, aprobación e integración autorizada a `main`.
