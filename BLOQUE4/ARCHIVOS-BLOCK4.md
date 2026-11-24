# Archivos Block 4 (rutas originales)

## Backend
| Ruta | Descripción |
|---|---|
| backend/src/quotations/quotations.controller.ts | Endpoints cotizaciones: crear, listar por solicitud, responder aceptar/rechazar |
| backend/src/quotations/quotations.service.ts | Lógica cotizaciones, validaciones, transición a CONTRATADA, historial/notificaciones |
| backend/src/quotations/quotations.module.ts | Módulo cotizaciones |
| backend/src/quotations/dto/crear-cotizacion.dto.ts | DTO crear cotización |
| backend/src/quotations/dto/responder-cotizacion.dto.ts | DTO aceptar/rechazar cotización |
| backend/src/visits/visits.controller.ts | Endpoints visitas previas |
| backend/src/visits/visits.service.ts | Lógica visitas previas, permisos, historial, auditoría, notificaciones |
| backend/src/visits/visits.module.ts | Módulo visitas previas |
| backend/src/visits/dto/crear-visita-previa.dto.ts | DTO crear visita |
| backend/src/visits/dto/responder-visita-previa.dto.ts | DTO responder visita |
| backend/src/workers/workers.service.ts | Disponibilidad semanal y programación de servicios; auditoría transaccional |
| backend/src/workers/workers.controller.ts | Endpoints disponibilidad/agenda/programación trabajador |
| backend/src/entities/cotizacion.entity.ts | Entidad cotización |
| backend/src/entities/visita-previa.entity.ts | Entidad visita previa |
| backend/src/entities/disponibilidad-trabajador.entity.ts | Entidad disponibilidad |
| backend/src/entities/servicio-programado.entity.ts | Entidad servicio programado |
| backend/src/entities/historial-solicitud.entity.ts | Historial de solicitud |
| backend/src/app.module.ts | Registro de módulos, incluye VisitsModule |

## Frontend
| Ruta | Descripción |
|---|---|
| frontend/src/app/core/models/quotations.models.ts | Modelos cotizaciones |
| frontend/src/app/core/models/visits.models.ts | Modelos visitas previas |
| frontend/src/app/core/services/quotations.service.ts | Servicio HTTP cotizaciones |
| frontend/src/app/core/services/visits.service.ts | Servicio HTTP visitas previas |
| frontend/src/app/pages/client-requests/client-requests.component.ts | UI cliente: cotizaciones y visitas previas |
| frontend/src/app/pages/client-requests/client-requests.component.html | Template cliente cotizaciones/visitas |
| frontend/src/app/pages/worker-requests/worker-requests.component.ts | UI trabajador: cotización y visitas previas |
| frontend/src/app/pages/worker-requests/worker-requests.component.html | Template trabajador cotización/visitas |
| frontend/src/app/pages/worker-agenda/worker-agenda.component.ts | UI disponibilidad/agenda/programación |

## Database
| Ruta | Descripción |
|---|---|
| database/migrations/006_block4_cotizaciones_visitas.sql | Migración Block 4: cotizaciones, visitas, disponibilidad, servicios programados, auditoría/historial relacionado |
