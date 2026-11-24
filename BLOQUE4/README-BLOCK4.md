# BLOQUE 4 - Cotizaciones, Visitas Previas, Disponibilidad y Programación

## Alcance
Implementación y auditoría del Bloque 4 en rama eature/block-4-cotizaciones-programacion (PR #1), sin modificar main.

## Componentes
- **Cotizaciones**: creación/listado/aceptación/rechazo, validaciones, historial, notificaciones, transición de solicitud a CONTRATADA al aceptar.
- **Visitas previas**: backend POST /api/visits, GET /api/visits/request/:idSolicitud, PATCH /api/visits/:idVisita/response; UI cliente en detalle de solicitud; UI trabajador en detalle de solicitud.
- **Disponibilidad semanal**: configuración 7 días, persistencia, validación HH:mm/HH:mm:ss.
- **Programación**: agendamiento con cotización aceptada y horario disponible, auditoría transaccional, transición solicitud a PROGRAMADA.

## Estado resumido
- Backend/Frontend compilan.
- Corrección aplicada: auditoría de programación dentro de transacción (RegistroAuditoria vía manager) para evitar Query runner already released.
- Visitas previas: backend implementado; frontend cliente/trabajador integrado en pantallas de solicitudes.
- Pendiente verificación E2E UI completa en navegador para todos los escenarios A-E y caso Juan/Pedro.

## Rutas clave
- Backend: ackend/src/quotations/*, ackend/src/visits/*, ackend/src/workers/workers.service.ts, ackend/src/requests/*.
- Frontend: rontend/src/app/pages/client-requests/*, rontend/src/app/pages/worker-requests/*, rontend/src/app/pages/worker-agenda/*, rontend/src/app/core/services/visits.service.ts.
- DB: database/migrations/006_block4_cotizaciones_visitas.sql (revisada; dry-run ROLLBACK en DB local).
