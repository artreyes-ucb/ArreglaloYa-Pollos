# Pruebas del Bloque 4

## 1. Entorno

- Backend: `http://localhost:3000` (NestJS sobre el build de `backend/dist`).
- Frontend: `http://localhost:4200`.
- Base de datos: `arreglalo_ya_db` (PostgreSQL local).
- Verificación: peticiones HTTP reales, consultas SQL y revisión del DOM en el navegador integrado.
- Compilación de backend y frontend: correcta sobre el estado final de este trabajo.
- Los 18 escenarios se derivaron de los endpoints documentados en `README-BLOCK4.md` y se ejecutaron sobre la API con las cuentas locales de cliente y trabajador. La validación visual se hizo por separado en el navegador.

## 2. Los 18 escenarios E2E

| # | Escenario (derivado del README) | Resultado |
| --- | --- | --- |
| 1 | Login de cliente | HTTP 200. |
| 2 | Login de trabajador | HTTP 200. |
| 3 | `POST /api/requests`: crear solicitud | HTTP 200. |
| 4 | `GET /api/requests/mine`: listar solicitudes del cliente | HTTP 200. |
| 5 | `POST /api/quotations`: crear cotización | HTTP 200. |
| 6 | `GET /api/quotations/request/:idSolicitud`: listar cotizaciones | HTTP 200. |
| 7 | `PATCH /api/quotations/:id/response`: aceptar cotización | HTTP 200. |
| 8 | `PATCH /api/quotations/:id/response`: rechazar cotización de otra solicitud | HTTP 200. |
| 9 | Aceptar una segunda cotización de la misma solicitud | HTTP 400, `Ya existe una cotización aceptada para esta solicitud.` |
| 10 | `POST /api/visits`: crear visita previa | HTTP 200. |
| 11 | `GET /api/visits/request/:idSolicitud`: listar visitas | HTTP 200. |
| 12 | `PATCH /api/visits/:id/response`: cliente acepta visita | HTTP 200. |
| 13 | `PATCH /api/visits/:id/response`: trabajador finaliza visita | HTTP 200. |
| 14 | Transición de visita no permitida (`REALIZADA` → `RECHAZADA`) | HTTP 400. |
| 15 | Visita con fecha inexistente (`2026-02-31`) | HTTP 400. |
| 16 | `GET /api/workers/me/availability`: consultar disponibilidad | HTTP 200. |
| 17 | `POST /api/workers/me/availability`: guardar disponibilidad semanal | HTTP 200. |
| 18 | `POST /api/workers/me/schedule`: programar servicio | HTTP 200; programación `0680d569-6988-458a-ab82-de2771910fca`. |

Resultado: **18/18 escenarios OK, 0 fallos**.

Comprobaciones adicionales de la misma ejecución:

- `GET /api/workers/me/schedule` devuelve la programación con `Cliente: Juan Peredo`.
- Programar dos veces la misma solicitud con otro horario: HTTP 400.
- Las cotizaciones `COTIZACION_ENVIADA` y `COTIZACION_ACEPTADA` y las visitas `VISITA_PREVIA_SOLICITADA`, `VISITA_PREVIA_ACEPTADA` y `VISITA_PREVIA_REALIZADA` tienen su registro de auditoría y su notificación correspondiente.

## 3. Correcciones técnicas de esta revisión

| Corrección | Verificación real |
| --- | --- |
| Auditoría y notificaciones dentro de la misma transacción en cotizaciones y visitas | Tras la refactorización se siguen generando los registros de auditoría y las notificaciones listados arriba. |
| Cotizaciones sobre solicitudes vencidas | Solicitud de prueba con `fecha_vencimiento` en el pasado: `POST /api/quotations` devuelve HTTP 400, `La solicitud ya venció y no admite nuevas cotizaciones.` |
| Timeouts en las cargas de la agenda | `obtenerDisponibilidad()` y `obtenerAgenda()` usan `timeout(15000)` y mensaje específico ante `TimeoutError`. Compilación correcta. |
| Bloqueos pesimistas y validación de cotización aceptada | Segunda aceptación: HTTP 400 en lugar del HTTP 500 del índice único. |
| Permisos y transiciones de visitas | Trabajador sin cotización aceptada: HTTP 403; transición inválida: HTTP 400. |
| Doble programación | HTTP 400 en lugar de error de unicidad. |

## 4. Validación visual en navegador

- Se inició sesión como trabajador y se abrió **Buscar solicitudes** → **Ver detalle**. La sección «Visitas previas» cargó la visita `2026-12-18 10:00`, estado `SOLICITADA`, con su nota y los botones «Aceptar» y «Rechazar». Antes de la corrección la sección no cargaba visitas al abrir el detalle.
- Se abrió **Mi agenda**: los servicios aparecen ordenados por fecha y hora y muestran «Cliente: Juan Peredo», confirmando la carga de `solicitud.cliente`.
- Consola del navegador: **0 errores** en la página de agenda.

La evidencia es el árbol de accesibilidad/DOM del navegador integrado; no se generó una grabación de clics ni una captura legible en este entorno.

## 5. Caso Juan/Pedro

No se dispone de la fecha y hora exactas del reporte original. Se reprodujo el comportamiento HTTP 400 con las mismas cuentas locales en los dos caminos que lo producían: segunda aceptación de cotización y programación duplicada de la misma solicitud. Queda pendiente contrastarlo con los datos literales del reporte si se facilitan.

## 6. Observaciones

- La respuesta de aceptación de cotización y de programación todavía devuelve el objeto solicitud con el estado previo a la transacción; la base de datos queda con el estado correcto y la UI se actualiza al recargar.
- La validación de la migración 006 está en `AUDITORIA-BLOCK4.md`.
- No se publican credenciales en este archivo.

## 7. Pendiente

- Coordinar credenciales definitivas y normalizar las contraseñas temporales.
- Confirmar la migración 006 en la base de datos de entrega.
- Revisión y aprobación del PR #2 e integración a `main`.
- Contraste del caso Juan/Pedro con la fecha y hora exactas del reporte original.
