# Pruebas Bloque 4 (registro real)

## Ejecutadas con backend en http://localhost:3000 y Postgres arreglalo_ya_db

1. Login cliente y trabajador con credenciales temporales: HTTP 200.
2. Crear solicitud desde cliente (`POST /api/requests`): HTTP 201; id `5ed5260c-0b02-41e9-96a0-1b9f604295eb`.
3. Crear cotización por trabajador (`POST /api/quotations`): HTTP 201; total Bs 120.00.
4. Aceptar cotización `e111e007...` (`PATCH /api/quotations/:id/response`): HTTP 200; DB confirma solicitud `a2340054...` = `CONTRATADA`; historial `COTIZACION_ACEPTADA`, `SOLICITUD_CONTRATADA`.
5. Rechazar cotización `91a7e740...`: HTTP 200; DB muestra cotización `RECHAZADA`, notificación al trabajador.
6. Crear visita previa cliente (`POST /api/visits`): HTTP 201; id `a30a2436...`, estado `SOLICITADA`; historial `VISITA_PREVIA_SOLICITADA`; notificación al trabajador.
7. Listar visitas cliente y trabajador (`GET /api/visits/request/:id`): HTTP 200.
8. Responder visita por trabajador (`PATCH /api/visits/:id/response`): HTTP 200; estado `ACEPTADA`; confirmación fecha/hora; historial `VISITA_PREVIA_ACEPTADA`; notificación al cliente.
9. Consultar disponibilidad trabajador: HTTP 200, 7 registros, martes 09:00-17:00 disponible.
10. Programar servicio (`POST /api/workers/me/schedule`) con solicitud `2b6d99e2...`, 2026-12-01 09:00-10:00: HTTP 200; DB `servicios_programados` creado y solicitud `PROGRAMADA`.
11. Consultar solicitudes del cliente: HTTP 200; programación visible en la solicitud.
12. Compilación backend y frontend: OK.

## Observaciones
- La verificación se realizó por API HTTP + consultas SQL directas; no se ejecutó automatización de navegador (Playwright/Cypress) ni clics manuales en la UI.
- La disponibilidad se consultó vía API después de reiniciar backend; los 7 días persisten en DB.
- Credenciales de prueba temporales: `wilder.negrete@ucb.edu.bo` y `diazwilder38@gmail.com`, contraseña `Test1234!` (solo BD local).
- Caso HTTP 400 Juan/Pedro: no reproducido con datos actuales; la validación normaliza HH:mm y HH:mm:ss y la programación válida funcionó. Queda observación si el reporte original usaba otro día/hora.
