\# BLOQUE 4 – COTIZACIONES, VISITAS PREVIAS Y PROGRAMACIÓN DE SERVICIOS



\## 1. Descripción general



El Bloque 4 implementa las funcionalidades de gestión de cotizaciones, visitas previas, disponibilidad de trabajadores y programación de servicios en ArreglaloYa-Pollos.



\## 2. Funcionalidades principales



\- Creación y gestión de cotizaciones.

\- Aceptación y rechazo de cotizaciones.

\- Actualización del estado de solicitudes a CONTRATADA.

\- Solicitud y gestión de visitas previas.

\- Historial y notificaciones.

\- Configuración de disponibilidad semanal.

\- Programación de servicios.

\- Consulta de agenda del trabajador.

\- Consulta de servicios programados por el cliente.



\## 3. Backend



Tecnologías: NestJS y TypeORM.



\- Módulo de cotizaciones.

\- Módulo de visitas previas.

\- Gestión de trabajadores y programación.

\- Controladores, DTOs y validaciones.

\- Auditoría e historial de operaciones.



\## 4. Frontend



Tecnología: Angular.



\- Gestión de cotizaciones del cliente.

\- Gestión de visitas previas del cliente y trabajador.

\- Configuración de disponibilidad.

\- Agenda del trabajador.

\- Consulta de servicios programados.



\## 5. Base de datos



Motor: PostgreSQL.



Migración principal:



`database/migrations/006\_block4\_cotizaciones\_visitas.sql`



\## 6. Tecnologías utilizadas



\- Angular

\- NestJS

\- TypeORM

\- PostgreSQL

\- Git y GitHub



\## 7. Validación



El backend y frontend fueron compilados y se realizaron verificaciones mediante API y base de datos. La validación E2E completa desde navegador queda sujeta a certificación.



\## 8. Rama de desarrollo



`feature/block-4-cotizaciones-programacion`



\## 9. Integración



Bloque integrado en la rama `main` mediante el Pull Request #1.

