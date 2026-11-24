# Pruebas del Bloque 4

## 1. Entorno

- Backend: `http://localhost:3000` (NestJS sobre el build de `backend/dist`).
- Frontend: `http://localhost:4200`.
- Base de datos: `arreglalo_ya_db` (PostgreSQL local).
- Verificación: peticiones HTTP reales y consultas directas a la base de datos. No se ejecutó automatización de navegador.

## 2. Pruebas previas verificadas

| Escenario | Resultado |
| --- | --- |
| Login de cliente y trabajador | HTTP 200. |
| Creación de solicitud | HTTP 201. |
| Creación y aceptación de cotización | HTTP 201/200; solicitud en `CONTRATADA`; historial `COTIZACION_ACEPTADA` y `SOLICITUD_CONTRATADA`. |
| Rechazo de cotización | HTTP 200; cotización `RECHAZADA`; notificación al trabajador. |
| Creación y listado de visitas previas | HTTP 201/200. |
| Respuesta de visita por trabajador con cotización aceptada | HTTP 200; visita `ACEPTADA`; historial y notificación. |
| Consulta de disponibilidad | HTTP 200; siete días, martes 09:00–17:00 disponible. |
| Programación de servicio | HTTP 200; solicitud en `PROGRAMADA`; auditoría `SERVICIO_PROGRAMADO`. |
| Consulta de solicitudes del cliente con programación | HTTP 200; programación visible. |
| Compilación de backend y frontend | Correcta. |

## 3. Pruebas de las correcciones de esta revisión

| Escenario | Resultado real |
| --- | --- |
| Aceptar una segunda cotización de la misma solicitud | HTTP 400 con `Ya existe una cotización aceptada para esta solicitud.` Antes terminaba en HTTP 500 por el índice único parcial. |
| Trabajador sin cotización aceptada responde visita sin perfil asignado | HTTP 403. Ya no cualquier trabajador puede reclamar la visita. |
| Cliente rechaza visita en estado `SOLICITADA` | HTTP 200; transición permitida. |
| Crear visita con fecha inexistente (`2026-02-31`) | HTTP 400. Antes podía terminar en error de PostgreSQL. |
| Programar dos veces la misma solicitud con distinto horario | HTTP 400 con `La solicitud ya tiene un servicio programado`. Antes terminaba en error de unicidad. |
| Flujo completo nuevo: cotizar → aceptar → programar | HTTP 201/200/200; programación `b657a537-410d-48a7-8243-6f195ebf5c81`. |
| Historial de la programación | `COTIZACION_ENVIADA`, `COTIZACION_ACEPTADA`, `SOLICITUD_CONTRATADA`, `SOLICITUD_PROGRAMADA` y eventos de visita. |
| Notificación al cliente por programación | Registro `Servicio programado` con fecha 2026-12-15, 10:00–11:00. |
| Auditoría de programación | `SERVICIO_PROGRAMADO` sobre `servicios_programados`. |
| Agenda del trabajador con nombre del cliente | HTTP 200; devuelve `Juan Peredo`. |

## 4. Observaciones

- La respuesta de aceptación de cotización y de programación todavía devuelve el objeto solicitud con el estado previo a la transacción; la base de datos queda con el estado correcto. No afecta la persistencia y se resuelve al recargar desde la UI.
- La validación de la migración 006 se documenta en `AUDITORIA-BLOCK4.md`.
- No se publican credenciales en este archivo.

## 5. Pendiente

- Certificación E2E desde navegador de los 18 escenarios funcionales.
- Reproducción del caso HTTP 400 original Juan/Pedro con la fecha y hora exactas del reporte.
- Validación visual final de agenda y visitas en la interfaz.
