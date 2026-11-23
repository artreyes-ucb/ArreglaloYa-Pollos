# Arréglalo Ya — Bloque 5 (Motor Económico, Cierre Dual, Evaluaciones y Reclamos)

Implementación completa de las 7 tarjetas del **Bloque 5** en la rama `feature/block-5`.

## Tarjetas implementadas

1. **[CU-04][HU-F08][RN-08] Cálculo y registro de anticipo del 25 %**
   - Calcula automáticamente el 25 % sobre el precio acordado del servicio programado y lo registra en `pagos` con tipo `ANTICIPO_25` y estado inicial `PENDIENTE`.
   - Actualiza `precio_acordado` en `servicios_programados`, registra el evento en `registros_auditoria` y notifica al trabajador asignado.
2. **[CU-18][HU-F14][RNF-06] Confirmación manual bilateral de pagos y detección de discrepancias**
   - Permite registrar el pago final (`PAGO_FINAL`) y confirmar de forma independiente los montos reportados por cliente y trabajador.
   - Si ambas partes confirman el mismo monto, el pago pasa automáticamente a `CONCILIADO`; si existe diferencia, se marca como `DISCREPANTE` para trazabilidad.
3. **[CU-20][RN-09] Cálculo de comisión de plataforma (5 %) y neto del trabajador (95 %)**
   - Calcula y registra en la tabla `comisiones` el 5 % correspondiente a la plataforma (`monto_comision`) y el 95 % para el trabajador (`monto_neto_trabajador`) sobre servicios completados.
   - Se dispara automáticamente al concretarse el cierre dual o la conciliación del pago final, y también puede invocarse mediante endpoint dedicado.
4. **[CU-17][CU-19][RN-13] Cancelación de servicios contratados y reembolso de anticipo**
   - Permite cancelar un servicio programado validando el límite mínimo de **3 horas de anticipación** antes de la cita para el cliente.
   - Si existe un anticipo registrado sobre un servicio cancelado, habilita al cliente a solicitar el reembolso (`PENDIENTE`) y al administrador a aprobarlo, rechazarlo o marcarlo como completado con observaciones.
5. **[CU-06][HU-F12][HU-F13] Cierre dual del servicio**
   - Flujo en dos pasos obligatorios: primero el trabajador declara el servicio como terminado (`EN_PROCESO`), y posteriormente el cliente confirma su conclusión (`COMPLETADO`).
   - Al confirmar el cliente, actualiza también la solicitud asociada a `COMPLETADA`, genera la comisión del 5 % y emite notificaciones internas.
6. **[CU-08][HU-F15] Evaluación y calificación del trabajador**
   - Permite al cliente calificar al trabajador con una puntuación de **1 a 5 estrellas** y comentario opcional una vez que el servicio está `COMPLETADO`.
   - Restringe a una sola evaluación por servicio programado (`UNIQUE (id_programacion)`).
7. **[CU-07][HU-F16][HU-F17][HU-F22] Reclamos formales (plazo de 7 días) y resolución administrativa**
   - Permite al cliente presentar un reclamo con descripción obligatoria y evidencia opcional únicamente dentro de los **7 días posteriores** a la confirmación de cierre del servicio.
   - Permite a `ADMIN` y `SUPERADMIN` gestionar estados (`EN_REVISION`, `RESUELTO`, `RECHAZADO`, `CERRADO`), documentar la resolución y registrar la trazabilidad inmutable en `registros_auditoria` y `notificaciones`.

---

## Migración de base de datos

Ejecutar una sola vez sobre `arreglalo_ya_db` (después de `01_init_arreglalo_ya.sql`, `002_block2_perfil_trabajador.sql`, `003_block2_agenda.sql` y `004_block3_solicitudes_notificaciones.sql`):

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\005_block5_economia_cierre_reclamos.sql"

Tablas nuevas creadas:

comisiones

reembolsos

evaluaciones

reclamos

Tablas ampliadas (mediante ALTER TABLE ... ADD COLUMN IF NOT EXISTS):

servicios_programados (precio_acordado, campos de cierre dual y cancelación)

pagos (id_programacion, montos y fechas de confirmación bilateral y referencia)

Endpoints del Bloque 5
Pagos, Cierre, Evaluaciones y Reclamos (/api/payments)
GET /api/payments/services — Listar servicios contratados/programados con pagos, comisión, evaluación, reclamos y reembolso (CLIENTE, TRABAJADOR, ADMIN, SUPERADMIN).

POST /api/payments/services/:idProgramacion/anticipo — Calcular y registrar anticipo del 25 % (CLIENTE).

POST /api/payments/services/:idProgramacion/pago-final — Registrar pago final del servicio (CLIENTE).

PATCH /api/payments/:idPago/confirm — Confirmación manual bilateral de pago (CLIENTE, TRABAJADOR).

POST /api/payments/services/:idProgramacion/comision — Calcular y registrar comisión 5 % / 95 % (ADMIN, SUPERADMIN, TRABAJADOR).

PATCH /api/payments/services/:idProgramacion/worker-finish — Trabajador declara el servicio como terminado (TRABAJADOR).

PATCH /api/payments/services/:idProgramacion/client-confirm — Cliente confirma conclusión / cierre dual (CLIENTE).

PATCH /api/payments/services/:idProgramacion/cancel — Cancelar servicio contratado validando límite de 3 horas (CLIENTE, TRABAJADOR).

POST /api/payments/services/:idProgramacion/reembolso — Solicitar reembolso del anticipo (CLIENTE).

GET /api/payments/reembolsos — Listar solicitudes de reembolso (ADMIN, SUPERADMIN).

PATCH /api/payments/reembolsos/:idReembolso/resolve — Aprobar, rechazar o completar reembolso (ADMIN, SUPERADMIN).

POST /api/payments/services/:idProgramacion/evaluacion — Calificar al trabajador del 1 al 5 (CLIENTE).

POST /api/payments/services/:idProgramacion/reclamo — Presentar reclamo formal dentro de 7 días (CLIENTE).

GET /api/payments/reclamos — Listar reclamos propios o todos para administración (CLIENTE, TRABAJADOR, ADMIN, SUPERADMIN).

PATCH /api/payments/reclamos/:idReclamo/resolve — Resolver reclamo con auditoría inmutable (ADMIN, SUPERADMIN).

Documentación interactiva
GET /api/docs — Interfaz Swagger UI (etiqueta Bloque 5 - Pagos, Cierre, Evaluaciones y Reclamos).

Auditoría y Notificaciones integradas
Auditoría inmutable (registros_auditoria): registra automáticamente REGISTRAR_ANTICIPO_25, REGISTRAR_PAGO_FINAL, CONFIRMAR_PAGO_BILATERAL, CALCULAR_COMISION_5, TRABAJADOR_MARCA_TERMINADO, CLIENTE_CONFIRMA_CONCLUSION, CANCELAR_SERVICIO_CONTRATADO, SOLICITAR_REEMBOLSO, REEMBOLSO_*, EVALUAR_TRABAJADOR, CREAR_RECLAMO y RESOLVER_RECLAMO.

Notificaciones internas (notificaciones): emite avisos automáticos a la contraparte en cada cambio de estado (anticipo registrado, pago final, servicio terminado, servicio completado, cancelación, resolución de reembolso, nueva evaluación y reclamos).

Vistas Angular agregadas
/payments — Panel unificado Servicios y Pagos (authGuard), accesible desde la barra de navegación y adaptado dinámicamente según el rol activo:

Cliente: registro de anticipo 25 % y pago final, confirmación bilateral, confirmación de conclusión, calificación (1–5), presentación de reclamos (7 días), cancelación y solicitud de reembolso.

Trabajador: confirmación bilateral de pagos recibidos, declaración de término del servicio, visualización de comisión 5 % / neto 95 % y cancelación.

Admin / Superadmin: supervisión de servicios, resolución de reclamos y aprobación/rechazo de reembolsos con auditoría.

Ejecución local
Ejecutar la migración 005_block5_economia_cierre_reclamos.sql sobre arreglalo_ya_db.

Levantar el backend (cd backend && npm run start:dev) → API en http://localhost:3000/api y Swagger en http://localhost:3000/api/docs.

Levantar el frontend (cd frontend && npm start) → App en http://localhost:4200/payments.