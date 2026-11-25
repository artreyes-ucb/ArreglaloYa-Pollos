# Arréglalo Ya

Plataforma web de intermediación y gestión de servicios domésticos (plomería, electricidad, albañilería, electrodomésticos, entre otros). Proyecto académico del **Grupo 2 — Ingeniería de Sistemas — Universidad Católica Boliviana (UCB)**.

> **Repositorio:** https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git  
> **Documentación arquitectónica:** `backend/AGENTS.md`

---

## Tabla de Contenidos

1. [Arquitectura y Stack Tecnológico](#1-arquitectura-y-stack-tecnológico)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Alcance Funcional por Bloques (1 al 5)](#3-alcance-funcional-por-bloques-1-al-5)
4. [Requisitos Previos](#4-requisitos-previos)
5. [Instalación y Ejecución Local](#5-instalación-y-ejecución-local)
6. [Cuenta Inicial de Demostración](#6-cuenta-inicial-de-demostración)
7. [Referencia de Endpoints de la API](#7-referencia-de-endpoints-de-la-api)
8. [Vistas del Frontend Angular](#8-vistas-del-frontend-angular)
9. [Seguridad, Auditoría y Reglas de Negocio](#9-seguridad-auditoría-y-reglas-de-negocio)
10. [Verificación y Solución de Problemas Comunes](#10-verificación-y-solución-de-problemas-comunes)

---

## 1. Arquitectura y Stack Tecnológico

```text
Angular (localhost:4200)
        │ HttpClient + Bearer JWT
        ▼
NestJS API (localhost:3000/api · Swagger: /api/docs)
  ├── auth           Registro, login, recuperación de acceso y JWT
  ├── users          Perfil propio y alternancia de roles
  ├── workers        Perfil profesional, validación admin, disponibilidad y agenda
  ├── requests       Publicación, búsqueda priorizada, vigencia (3/30d) y WhatsApp
  ├── quotations     Cotizaciones, cálculo de totales y aceptación/rechazo
  ├── visits         Visitas previas y confirmación de fechas
  ├── payments       Anticipo 25%, cierre dual, comisión 5%, reembolsos, evaluaciones y reclamos
  ├── notifications  Sistema de avisos internos en tiempo real
  ├── superadmin     Administración de cuentas ADMIN y auditoría
  ├── audit          Registro inmutable de eventos críticos
  └── seed           Creación idempotente de cuenta SUPERADMIN
        │
        ▼
PostgreSQL: arreglalo_ya_db (synchronize: false)
```

| Capa | Tecnologías | Uso |
| :--- | :--- | :--- |
| **Backend** | NestJS 11, TypeScript, Node.js | API REST modular con prefijo `/api` |
| **Persistencia** | TypeORM, PostgreSQL 16/18 | Esquema controlado estrictamente mediante scripts SQL |
| **Autenticación** | `@nestjs/jwt`, Passport JWT, `bcrypt` | Tokens JWT con rol activo y hash de contraseñas |
| **Validación y Docs** | `class-validator`, `class-transformer`, Swagger | Validación DTO (`whitelist`, `forbidNonWhitelisted`) y OpenAPI |
| **Frontend** | Angular 22 (Standalone), Reactive Forms, CSS responsivo | SPA modular con guards por rol e interceptor JWT |

---

## 2. Estructura del Proyecto

```text
ArreglaloYa-Pollos/
├── backend/
│   ├── src/
│   │   ├── audit/            Servicio de auditoría inmutable
│   │   ├── auth/             Registro, login, recuperación y estrategia JWT
│   │   ├── common/           Guards, decoradores, enums y utilidades
│   │   ├── entities/         Entidades TypeORM mapeadas al esquema SQL
│   │   ├── notifications/    Avisos internos y contador de no leídas
│   │   ├── payments/         Motor económico, cierre dual, evaluaciones y reclamos
│   │   ├── quotations/       Cotizaciones e incrementos de precio
│   │   ├── requests/         Solicitudes de servicio, vigencia y enlaces WhatsApp
│   │   ├── seed/             Semilla inicial de SUPERADMIN
│   │   ├── superadmin/       Gestión de administradores y logs de auditoría
│   │   ├── users/            Perfil y alternancia de rol CLIENTE / TRABAJADOR
│   │   ├── visits/           Gestión de visitas previas
│   │   ├── workers/          Perfil profesional, validación, disponibilidad y agenda
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   └── AGENTS.md
├── frontend/
│   └── src/app/
│       ├── core/             Servicios HTTP, guards, interceptor y modelos
│       ├── layout/           Barra de navegación dinámica según rol activo
│       └── pages/            Vistas por módulo funcional
├── database/
│   ├── 01_init_arreglalo_ya.sql
│   └── migrations/
│       ├── 002_block2_perfil_trabajador.sql
│       ├── 003_block2_agenda.sql
│       ├── 004_block3_solicitudes_notificaciones.sql
│       ├── 005_block5_economia_cierre_reclamos.sql
│       └── 006_block4_cotizaciones_visitas.sql
└── README.md
```

---

## 3. Alcance Funcional por Bloques (1 al 5)

### Bloque 1 — Cimientos, Usuarios, Roles y Superadministración (`T1`–`T7`)
- **Configuración y persistencia (`T1`):** Conexión TypeORM a PostgreSQL (`synchronize: false`) con tablas base y catálogos iniciales de Cochabamba (`categorias_servicio` y `zonas`).
- **Registro e inicio de sesión (`CU-10`, `HU-F01`, `HU-F02`):** Normalización de correo, hash con `bcrypt`, emisión de JWT y exclusión de campos sensibles (`contrasena_hash`, `reset_token`).
- **Seguridad basada en roles (`RNF-03`, `HU-NF03`):** Guards `JwtAuthGuard` y `RolesGuard` evaluando `rol_activo` (`CLIENTE`, `TRABAJADOR`, `ADMIN`, `SUPERADMIN`).
- **Alternancia de roles (`HU-F03`):** Habilitación del rol `TRABAJADOR` en una misma cuenta (creando perfil en estado `PENDIENTE`) y cambio dinámico de rol activo con emisión de nuevo JWT.
- **Recuperación de acceso (`CU-12`):** Generación de código temporal de 6 dígitos con vigencia de 15 minutos y restablecimiento de contraseña de un solo uso.
- **Administración SUPERADMIN (`CU-24`, `HU-F19`, `CA-12`):** Creación, edición, activación/desactivación de cuentas `ADMIN` con autoprotección y consulta de auditoría.

### Bloque 2 — Perfil Profesional, Validación, Disponibilidad y Agenda (`CU-05`, `CU-09`, `CU-11`, `CU-16`)
- **Perfil del trabajador (`CU-11`):** Gestión de descripción, años de experiencia, datos bancarios privados, catálogo de servicios ofrecidos con precio estimado y zonas de cobertura.
- **Validación administrativa (`CU-09`):** Listado y revisión de perfiles pendientes por `ADMIN` o `SUPERADMIN` para aprobarlos (`APROBADO`) o rechazarlos (`RECHAZADO` con observación obligatoria). Solo los perfiles aprobados son visibles públicamente.
- **Disponibilidad semanal y agenda (`CU-16`, `CU-05`):** Configuración de franjas horarias por día de la semana y programación de servicios vinculados a cotizaciones aceptadas, validando disponibilidad y evitando solapamientos.

### Bloque 3 — Solicitudes de Servicio, Búsqueda y Comunicación Externa (`T4`, `CU-01`, `CU-13`, `CU-14`, `CU-25`, `RF-09`)
- **Documentación Swagger (`T4`):** Interfaz OpenAPI en `/api/docs` con soporte Bearer JWT.
- **Publicación de solicitudes (`CU-01`, `HU-F04`):** Registro con categoría, zona, descripción, ubicación general (protegiendo dirección exacta), fecha preferida y hasta 5 fotografías (JPG/PNG/WEBP hasta 5 MB), con vigencia inicial de 30 días.
- **Buscador y filtrado activo (`CU-13`, `HU-F05`, `RNF-02`):** Búsqueda para trabajadores por categoría, zona y palabra clave, priorizando solicitudes `ACTIVA` sobre `PRIORIDAD_REDUCIDA` y coincidencias con el perfil, sin exponer datos privados del cliente.
- **Modificación y cancelación pre-contratación (`CU-14`):** Edición y cancelación permitidas solo al propietario antes de que la solicitud sea contratada/programada, conservando historial en `historial_solicitud`.
- **Control automático de vigencia (`RF-09`, `RN-05`):** A los **3 días** sin respuesta pasa a `PRIORIDAD_REDUCIDA`; a los **30 días** caduca automáticamente a `VENCIDA`.
- **Enlaces dinámicos a WhatsApp (`CU-25`, `HU-F20`, `RNF-09`):** Generación de `https://wa.me/...` solo para participantes autorizados, con advertencia explícita de canal externo.
- **Avisos internos (`HU-F21`):** Notificaciones persistentes en tiempo real con contador de no leídas en la barra superior.

### Bloque 4 — Cotizaciones y Visitas Previas
- **Cotizaciones:** Creación por trabajadores aprobados (desglosando mano de obra, materiales, alcance y condiciones), listado por solicitud y aceptación/rechazo por el cliente. Al aceptar una cotización, la solicitud pasa a `CONTRATADA` y se bloquea la aceptación de otras ofertas.
- **Visitas previas:** Solicitud de inspección previa (por cliente o trabajador), propuesta de fecha/hora y respuesta (`ACEPTADA`, `RECHAZADA`, `CANCELADA`, `REALIZADA`, `NO_REALIZADA`) con trazabilidad en historial y auditoría.
- **Conexión con agenda:** Habilita la programación formal en `servicios_programados` tras la aceptación de la cotización.

### Bloque 5 — Motor Económico, Cierre Dual, Evaluaciones y Reclamos
- **Anticipo del 25 % (`CU-04`, `HU-F08`, `RN-08`):** Cálculo automático del 25 % sobre el precio acordado y registro en `pagos` (`ANTICIPO_25`).
- **Confirmación manual bilateral (`CU-18`, `HU-F14`, `RNF-06`):** Registro de pago final (`PAGO_FINAL`) y confirmación independiente de montos por cliente y trabajador; pasa a `CONCILIADO` si coinciden o a `DISCREPANTE` si difieren.
- **Comisión de plataforma (`CU-20`, `RN-09`):** Cálculo automático del **5 %** para la plataforma y **95 %** neto para el trabajador sobre servicios completados (`comisiones`).
- **Cancelación y reembolsos (`CU-17`, `CU-19`, `RN-13`):** Cancelación de servicios programados validando el límite mínimo de **3 horas** antes de la cita para el cliente, solicitud de reembolso del anticipo y resolución administrativa (`APROBADO`, `RECHAZADO`, `COMPLETADO`).
- **Cierre dual (`CU-06`, `HU-F12`, `HU-F13`):** El trabajador declara el servicio terminado (`EN_PROCESO`) y el cliente confirma su conclusión (`COMPLETADO`).
- **Evaluación del trabajador (`CU-08`, `HU-F15`):** Calificación única de **1 a 5 estrellas** y comentario tras completar el servicio.
- **Reclamos formales (`CU-07`, `HU-F16`, `HU-F17`, `HU-F22`):** Presentación de reclamos dentro de los **7 días posteriores** al cierre del servicio y resolución por `ADMIN`/`SUPERADMIN` con auditoría inmutable.

---

## 4. Requisitos Previos

| Herramienta | Versión recomendada | Verificación |
| :--- | :--- | :--- |
| **Node.js** | 22.12 o 24 LTS | `node -v` |
| **npm** | 11 o superior | `npm -v` |
| **PostgreSQL** | 16 o 18 | `psql --version` |
| **Git** | Reciente | `git --version` |

---

## 5. Instalación y Ejecución Local

### 5.1 Clonar el repositorio

```powershell
git clone https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git
cd ArreglaloYa-Pollos
```

### 5.2 Crear la base de datos y ejecutar las migraciones en orden

En Windows PowerShell (ajusta la ruta de `psql.exe` si usas otra versión de PostgreSQL):

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# 1. Crear base de datos
& $psql -U postgres -c "CREATE DATABASE arreglalo_ya_db;"

# 2. Ejecutar esquema base y migraciones en orden obligatorio (01 -> 002 -> 003 -> 004 -> 005 -> 006)
& $psql -U postgres -d arreglalo_ya_db -f "database\01_init_arreglalo_ya.sql"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\002_block2_perfil_trabajador.sql"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\003_block2_agenda.sql"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\004_block3_solicitudes_notificaciones.sql"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\005_block5_economia_cierre_reclamos.sql"
& $psql -U postgres -d arreglalo_ya_db -f "database\migrations\006_block4_cotizaciones_visitas.sql"
```

> **Importante:** La migración `006` depende de la `005` porque ambas extienden `pagos` y `servicios_programados`. Respeta estrictamente el orden anterior.

### 5.3 Configurar y levantar el Backend (Terminal 1)

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Edita `backend/.env` con tus credenciales locales:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=TU_CLAVE_DE_POSTGRES
DB_NAME=arreglalo_ya_db
JWT_SECRET=UN_SECRETO_LARGO_Y_PRIVADO
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12
FRONTEND_URL=http://localhost:4200
```

Inicia el servidor en modo desarrollo:

```powershell
npm run start:dev
```

- **API REST:** `http://localhost:3000/api`
- **Documentación Swagger:** `http://localhost:3000/api/docs`

### 5.4 Configurar y levantar el Frontend (Terminal 2)

En una segunda terminal, desde la raíz del proyecto:

```powershell
cd frontend
npm ci
npm start
```

- **Aplicación Web:** `http://localhost:4200`

---

## 6. Cuenta Inicial de Demostración

Al arrancar el backend por primera vez, `SeedService` crea automáticamente la cuenta administradora principal:

| Campo | Valor |
| :--- | :--- |
| **Correo** | `superadmin@arreglaloya.bo` |
| **Contraseña** | `SuperAdmin2026!` |
| **Roles habilitados** | `SUPERADMIN`, `ADMIN`, `CLIENTE` |

> Credencial exclusivamente académica para pruebas locales.

---

## 7. Referencia de Endpoints de la API

Todos los endpoints llevan el prefijo `/api` y requieren `Authorization: Bearer <token>` salvo las rutas públicas de autenticación y perfil público de trabajador.

### Autenticación (`/api/auth`)
- `POST /api/auth/register` — Registrar cuenta `CLIENTE` (opcionalmente habilitando `TRABAJADOR`).
- `POST /api/auth/login` — Iniciar sesión y obtener JWT.
- `POST /api/auth/forgot-password` — Solicitar código temporal de recuperación (15 min).
- `POST /api/auth/reset-password` — Restablecer contraseña con código vigente.

### Usuarios (`/api/users`)
- `GET /api/users/me` — Consultar perfil propio.
- `PATCH /api/users/me` — Editar nombres, apellidos o teléfono.
- `POST /api/users/enable-worker-role` — Habilitar rol `TRABAJADOR` y crear perfil pendiente.
- `PATCH /api/users/switch-role` — Alternar rol activo (`CLIENTE` / `TRABAJADOR` / `ADMIN` / `SUPERADMIN`) y emitir nuevo JWT.

### Trabajadores y Agenda (`/api/workers`)
- `GET /api/workers/me` — Perfil profesional propio con datos bancarios (`TRABAJADOR`).
- `PATCH /api/workers/me` — Actualizar descripción, experiencia, datos bancarios, servicios y zonas (`TRABAJADOR`).
- `GET /api/workers/:idPerfil` — Perfil público (solo si `estado_validacion = 'APROBADO'`).
- `GET /api/workers/admin/pending` — Listar perfiles pendientes de validación (`ADMIN`, `SUPERADMIN`).
- `GET /api/workers/admin/:idPerfil` — Detalle de perfil para revisión administrativa (`ADMIN`, `SUPERADMIN`).
- `PATCH /api/workers/admin/:idPerfil/validation` — Aprobar o rechazar perfil (`ADMIN`, `SUPERADMIN`).
- `POST /api/workers/me/availability` | `GET /api/workers/me/availability` — Configurar y consultar disponibilidad semanal (`TRABAJADOR`).
- `POST /api/workers/me/schedule` | `GET /api/workers/me/schedule` — Programar servicio desde cotización aceptada y consultar agenda (`TRABAJADOR`).

### Solicitudes de Servicio (`/api/requests`)
- `GET /api/requests/catalogs` — Categorías y zonas disponibles.
- `POST /api/requests/upload-photo` — Subir fotografía opcional (JPG/PNG/WEBP, máx. 5 MB).
- `POST /api/requests` — Publicar solicitud (`CLIENTE`).
- `GET /api/requests/mine` — Listar solicitudes propias (`CLIENTE`).
- `GET /api/requests/search` — Buscador filtrado y priorizado (`TRABAJADOR`).
- `GET /api/requests/:id` — Detalle e historial cronológico de la solicitud.
- `PATCH /api/requests/:id` — Modificar solicitud antes de contratación (`CLIENTE`).
- `PATCH /api/requests/:id/cancel` — Cancelar solicitud antes de contratación (`CLIENTE`).
- `GET /api/requests/:id/whatsapp-link` — Generar enlace dinámico a WhatsApp con advertencia externa (`CLIENTE`, `TRABAJADOR`).
- `POST /api/requests/vigencia/evaluar` — Ejecutar evaluación manual de reglas de 3 y 30 días (`ADMIN`, `SUPERADMIN`).

### Cotizaciones y Visitas Previas (`/api/quotations`, `/api/visits`)
- `POST /api/quotations` — Enviar cotización sobre solicitud disponible (`TRABAJADOR` aprobado).
- `GET /api/quotations/request/:idSolicitud` — Listar cotizaciones de una solicitud.
- `PATCH /api/quotations/:idCotizacion/response` — Aceptar o rechazar cotización (`CLIENTE`).
- `POST /api/visits` — Solicitar visita previa (`CLIENTE`, `TRABAJADOR`).
- `GET /api/visits/request/:idSolicitud` — Listar visitas previas de una solicitud.
- `PATCH /api/visits/:idVisita/response` — Aceptar, rechazar, cancelar o finalizar visita previa.

### Pagos, Cierre Dual, Evaluaciones y Reclamos (`/api/payments`)
- `GET /api/payments/services` — Listar servicios contratados con pagos, comisión, evaluación, reclamos y reembolso.
- `POST /api/payments/services/:idProgramacion/anticipo` — Calcular y registrar anticipo del 25 % (`CLIENTE`).
- `POST /api/payments/services/:idProgramacion/pago-final` — Registrar pago final (`CLIENTE`).
- `PATCH /api/payments/:idPago/confirm` — Confirmación manual bilateral de pago (`CLIENTE`, `TRABAJADOR`).
- `POST /api/payments/services/:idProgramacion/comision` — Calcular comisión 5 % / neto 95 % (`ADMIN`, `SUPERADMIN`, `TRABAJADOR`).
- `PATCH /api/payments/services/:idProgramacion/worker-finish` — Trabajador declara servicio terminado (`TRABAJADOR`).
- `PATCH /api/payments/services/:idProgramacion/client-confirm` — Cliente confirma conclusión / cierre dual (`CLIENTE`).
- `PATCH /api/payments/services/:idProgramacion/cancel` — Cancelar servicio contratado validando límite de 3 horas (`CLIENTE`, `TRABAJADOR`).
- `POST /api/payments/services/:idProgramacion/reembolso` — Solicitar reembolso del anticipo (`CLIENTE`).
- `GET /api/payments/reembolsos` | `PATCH /api/payments/reembolsos/:idReembolso/resolve` — Gestión administrativa de reembolsos (`ADMIN`, `SUPERADMIN`).
- `POST /api/payments/services/:idProgramacion/evaluacion` — Calificar al trabajador del 1 al 5 (`CLIENTE`).
- `POST /api/payments/services/:idProgramacion/reclamo` — Presentar reclamo dentro de 7 días (`CLIENTE`).
- `GET /api/payments/reclamos` | `PATCH /api/payments/reclamos/:idReclamo/resolve` — Listar y resolver reclamos (`ADMIN`, `SUPERADMIN`).

### Notificaciones y Superadministración (`/api/notifications`, `/api/superadmin`)
- `GET /api/notifications` | `GET /api/notifications/unread-count` — Listar avisos internos y contador de no leídas.
- `PATCH /api/notifications/:id/read` | `PATCH /api/notifications/read-all` — Marcar avisos como leídos.
- `GET /api/superadmin/admins` | `POST /api/superadmin/admins` | `PATCH /api/superadmin/admins/:id` | `PATCH /api/superadmin/admins/:id/estado` — Gestión de administradores (`SUPERADMIN`).
- `GET /api/superadmin/audit-logs` — Consulta de registros inmutables de auditoría (`SUPERADMIN`).

---

## 8. Vistas del Frontend Angular

| Ruta | Acceso | Descripción |
| :--- | :--- | :--- |
| `/login` · `/register` · `/forgot-password` | Público | Autenticación, registro y recuperación de cuenta |
| `/profile` | Autenticado | Edición de datos personales, activación de rol trabajador y alternancia de rol |
| `/requests` | `CLIENTE` | Publicación, edición, cancelación, cotizaciones recibidas, visitas y WhatsApp |
| `/worker-requests` | `TRABAJADOR` | Buscador priorizado de solicitudes, envío de cotizaciones, visitas y WhatsApp |
| `/worker-agenda` | `TRABAJADOR` | Configuración de disponibilidad semanal y programación de servicios aceptados |
| `/payments` | Autenticado | Panel unificado de anticipos, conciliación bilateral, cierre dual, comisiones, calificaciones, reclamos y reembolsos |
| `/notifications` | Autenticado | Centro de avisos internos con badge en tiempo real |
| `/superadmin` | `ADMIN` / `SUPERADMIN` | Aprobación de perfiles de trabajadores, gestión de admins y auditoría |

---

## 9. Seguridad, Auditoría y Reglas de Negocio

- **Control de acceso estricto:** Las rutas protegidas validan `rol_activo` en el token JWT y en base de datos, diferenciando `401 Unauthorized` y `403 Forbidden`.
- **Protección de privacidad (`RNF-02`):** El buscador de solicitudes no expone correo, teléfono ni dirección exacta del cliente; el perfil público del trabajador omite `datos_bancarios` y `documento_identidad`.
- **Auditoría inmutable (`registros_auditoria`):** Todas las acciones críticas (altas, cambios de rol, validaciones de perfiles, cotizaciones, visitas, programación, pagos, comisiones, cierres, cancelaciones, reembolsos, calificaciones y reclamos) generan un registro persistente sin endpoints de modificación ni borrado.
- **Reglas temporales:**
  - `3 días` sin respuesta en solicitud $\rightarrow$ `PRIORIDAD_REDUCIDA`.
  - `30 días` desde publicación $\rightarrow$ `VENCIDA`.
  - `3 horas` de antelación mínima para que el cliente cancele un servicio programado.
  - `7 días` posteriores al cierre dual como plazo máximo para presentar reclamos formales.

---

## 10. Verificación y Solución de Problemas Comunes

### Compilación de verificación
```powershell
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### Problemas frecuentes

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| `ECONNREFUSED 127.0.0.1:5432` | Servicio PostgreSQL detenido | Inicia el servicio de PostgreSQL y revisa `DB_HOST` / `DB_PORT` en `backend/.env` |
| `password authentication failed` | Clave incorrecta en `.env` | Corrige `DB_PASSWORD` en `backend/.env` y reinicia el backend |
| Error de columna o tabla inexistente | Faltó ejecutar alguna migración | Ejecuta los scripts de `database/migrations/` del `002` al `006` en orden |
| `Port 3000` o `4200 already in use` | Proceso previo activo | Cierra la terminal anterior o usa `npm start -- --port 4201` en frontend |
| `403 Forbidden` al navegar | Rol activo distinto al requerido | Cambia el rol activo en la barra superior (`CLIENTE` / `TRABAJADOR`) |
