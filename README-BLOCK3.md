# Arréglalo Ya — Bloque 3 (Solicitudes de Servicio, Búsqueda y Comunicación Externa)

Implementación completa de las 7 tarjetas del **Bloque 3** en la rama `feature/block-3`.

## Tarjetas implementadas

1. **[T4] Documentación automática en Swagger**
   - Disponible en `http://localhost:3000/api/docs` (y esquema JSON en `http://localhost:3000/api/docs-json`).
   - Configurado con autenticación Bearer JWT (`Authorize`) y etiquetas para todos los módulos (`Autenticación`, `Usuarios`, `Trabajadores`, `Solicitudes de Servicio`, `Notificaciones`, `Superadministración`).
2. **[CU-01][HU-F04] Publicación de solicitudes de servicio**
   - Registro con categoría, zona, descripción, ubicación general (protegiendo dirección exacta), fecha preferida opcional y hasta 5 fotografías opcionales (carga multipart JPG/PNG/WEBP hasta 5 MB).
   - Genera identificador UUID, estado inicial `ACTIVA`, fecha de publicación y fecha de vencimiento automática (+30 días).
3. **[CU-13][HU-F05] Buscador y filtrado de solicitudes activas**
   - Búsqueda para `TRABAJADOR` filtrable por especialidad (`idCategoria`), zona (`idZona`), palabra clave (`q`) y coincidencias con el perfil.
   - Prioriza solicitudes `ACTIVA` sobre `PRIORIDAD_REDUCIDA` y aquellas que coinciden con especialidades y zonas del trabajador.
   - Excluye solicitudes `CANCELADA`, `VENCIDA`, `PROGRAMADA`, `CONTRATADA` y `COMPLETADA`; no expone correo, teléfono ni dirección exacta del cliente (`RNF-02`).
4. **[CU-14] Modificación y cancelación de solicitudes antes de la contratación**
   - Solo el cliente propietario puede modificar o cancelar solicitudes en estado `ACTIVA`, `PRIORIDAD_REDUCIDA` o `EN_COTIZACION`.
   - Si la solicitud ya fue programada/contratada (`PROGRAMADA`/`CONTRATADA`), bloquea la operación y remite al flujo de cancelación de servicio contratado (`CU-17`).
   - Conserva trazabilidad completa en `historial_solicitud` y `registros_auditoria`.
5. **[RF-09][RN-05] Control de estados y vigencia de solicitudes**
   - **Regla de 3 días sin respuesta**: pasa automáticamente a `PRIORIDAD_REDUCIDA`, pierde prioridad en el buscador, registra evento en historial/auditoría y notifica al cliente.
   - **Regla de 30 días de caducidad máxima**: pasa automáticamente a `VENCIDA`, queda excluida del buscador, registra evento y notifica al cliente.
   - Se ejecuta automáticamente en consultas, de manera periódica y bajo demanda mediante `POST /api/requests/vigencia/evaluar` (`ADMIN`/`SUPERADMIN`).
6. **[CU-25][HU-F20][RNF-09] Generador dinámico de enlaces a WhatsApp**
   - Genera `https://wa.me/...` dinámicamente solo para participantes autorizados (trabajadores con perfil `APROBADO` o cliente propietario hacia su trabajador asignado/seleccionado).
   - Incluye advertencia obligatoria de que la comunicación ocurre fuera de Arréglalo Ya y que los acuerdos formales deben registrarse en la plataforma (`CA-13`, `CNF-08`).
7. **[HU-F21] Sistema de avisos y notificaciones internas**
   - Persistencia en tabla `notificaciones` con contador de no leídas en tiempo real en la barra de navegación y vista `/notifications`.
   - Emite notificaciones automáticas al publicar, modificar, cancelar, detectar oportunidades compatibles para trabajadores aprobados, reducir prioridad (3 días) y vencer solicitudes (30 días).

---

## Migración de base de datos

Ejecutar una sola vez sobre `arreglalo_ya_db` (después de `01_init_arreglalo_ya.sql`, `002_block2_perfil_trabajador.sql` y `003_block2_agenda.sql`):

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\004_block3_solicitudes_notificaciones.sql"
```

Tablas nuevas (no altera tablas troncales):
- `fotografias_solicitud`
- `historial_solicitud`
- `notificaciones`

---

## Endpoints del Bloque 3

### Solicitudes (`/api/requests`)
- `GET /api/requests/catalogs` — Categorías y zonas vigentes (JWT).
- `POST /api/requests/upload-photo` — Subir fotografía opcional (`CLIENTE`).
- `POST /api/requests` — Publicar solicitud (`CLIENTE`).
- `GET /api/requests/mine` — Listar solicitudes propias (`CLIENTE`).
- `GET /api/requests/search` — Buscar y filtrar solicitudes disponibles (`TRABAJADOR`).
- `GET /api/requests/:id` — Detalle e historial autorizado (`CLIENTE`, `TRABAJADOR`, `ADMIN`, `SUPERADMIN`).
- `PATCH /api/requests/:id` — Modificar solicitud propia antes de contratación (`CLIENTE`).
- `PATCH /api/requests/:id/cancel` — Cancelar solicitud propia antes de contratación (`CLIENTE`).
- `GET /api/requests/:id/whatsapp-link` — Generar enlace dinámico de WhatsApp (`CLIENTE`, `TRABAJADOR`).
- `POST /api/requests/vigencia/evaluar` — Ejecutar evaluación de reglas de 3 y 30 días (`ADMIN`, `SUPERADMIN`).

### Notificaciones (`/api/notifications`)
- `GET /api/notifications` — Listar notificaciones del usuario autenticado (`?soloNoLeidas=true`).
- `GET /api/notifications/unread-count` — Contador de notificaciones no leídas.
- `PATCH /api/notifications/:id/read` — Marcar una notificación como leída.
- `PATCH /api/notifications/read-all` — Marcar todas como leídas.

### Documentación interactiva
- `GET /api/docs` — Interfaz Swagger UI.

---

## Vistas Angular agregadas
- `/requests` — Gestión de solicitudes del cliente (`clientGuard`): publicar, adjuntar fotos, editar, cancelar, historial y WhatsApp.
- `/worker-requests` — Buscador de oportunidades para trabajador (`workerGuard`): filtros por especialidad/zona/texto, priorización y contacto externo WhatsApp con modal de advertencia.
- `/notifications` — Centro de avisos y notificaciones internas con badge en la barra de navegación.
