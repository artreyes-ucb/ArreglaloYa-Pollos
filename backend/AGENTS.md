# AGENTS.md — Memoria Arquitectónica de "Arréglalo Ya"

> **Propósito:** este archivo es la fuente de verdad para cualquier agente de IA o desarrollador que trabaje en el proyecto. Debe leerse antes de escribir código. Si una instrucción contradice este documento, se detiene el trabajo y se consulta al equipo.
>
> **Proyecto:** Sistema "Arréglalo Ya" — Grupo 2 — Ingeniería de Sistemas — Universidad Católica Boliviana (UCB).
>
> **Bloque actual:** Bloque 1 — Integrante 1 (Tarjetas T1 a T7). Cualquier funcionalidad fuera de este alcance pertenece a los Bloques 2–5 y **no debe implementarse aquí**.

---

## 1. Stack Tecnológico Obligatorio

### 1.1 Backend
- **NestJS** con **TypeScript** sobre **Node.js**.
- **TypeORM** como ORM.
- **PostgreSQL** como base de datos.
- **@nestjs/jwt** + **@nestjs/passport** + **passport-jwt** para autenticación JWT.
- **bcrypt** para hash de contraseñas y tokens temporales.
- **class-validator** y **class-transformer** para validación y transformación de DTOs.

### 1.2 Frontend
- **Angular** con **Standalone Components**.
- **Reactive Forms** para formularios.
- **HttpClient** para consumo de la API.
- **Router** para navegación.
- **CSS moderno y responsivo** para móvil y escritorio, cumpliendo **RNF-04**.

### 1.3 Base de datos
- PostgreSQL.
- Nombre de la base de datos: **`arreglalo_ya_db`**.
- El esquema se gobierna con el script `Arreglalo_ya.sql` de la raíz. **No usar `synchronize: true`** contra la base real; las entidades deben reflejar el SQL, no al revés.
- Extension requerida: `uuid-ossp` (ya incluida en el script).

### 1.4 Convenciones de infraestructura
- Backend ubicado en `/backend`.
- Frontend ubicado en `/frontend` (si se implementa en este bloque; el alcance funcional actual es backend).
- Prefijo global de API: **`/api`**.
- CORS habilitado para el origen del frontend Angular.
- `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`.
- Variables de entorno mediante `.env`; nunca commitear secretos. Proveer `.env.example`.

Variables mínimas:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=arreglalo_ya_db
JWT_SECRET=
JWT_EXPIRES_IN=2h
FRONTEND_URL=http://localhost:4200
BCRYPT_ROUNDS=12
```

---

## 2. Alcance Exclusivo de Implementación Actual — BLOQUE 1 (Integrante 1)

Solo se implementan las siguientes tarjetas. **No ampliar el alcance sin autorización explícita.**

### Tarjeta 1 (T1/T2) — Configuración base y persistencia
- Inicializar NestJS en `/backend`.
- Configurar `TypeOrmModule.forRootAsync` con las variables de entorno.
- Conectar a PostgreSQL `arreglalo_ya_db`.
- Crear las entidades base:
  - `Usuario`
  - `RegistroAuditoria`
  - Entidades troncales: `CategoriaServicio`, `Zona`, `PerfilTrabajador`, `SolicitudServicio`, `Pago`.
- Las entidades deben mapear exactamente las tablas y columnas de `Arreglalo_ya.sql`.

### Tarjeta 2 (CU-10 / HU-F01) — Registro de usuarios
- Endpoint: `POST /api/auth/register`.
- Valida todos los datos obligatorios.
- Verifica unicidad de correo (normalizado a minúsculas).
- Encripta la contraseña con `bcrypt` antes de persistir.
- Rol inicial: `CLIENTE`; `rol_activo`: `CLIENTE`; `estado`: `ACTIVO`.
- Nunca devuelve `contrasena_hash` ni `reset_token`.

### Tarjeta 3 (CU-10 / HU-F02 / RNF-03) — Inicio de sesión y perfil propio
- Endpoint: `POST /api/auth/login`.
- Valida credenciales y que la cuenta esté `ACTIVO`.
- Emite un **JWT** firmado.
- Endpoints de perfil propio:
  - `GET /api/users/me`
  - `PATCH /api/users/me`
- El `PATCH` solo permite editar datos personales permitidos; **no** permite modificar `roles`, `rol_activo`, `estado`, `contrasena_hash` ni `reset_token`.

### Tarjeta 4 (RNF-03 / HU-NF03) — Seguridad por roles
- Implementar `JwtAuthGuard`.
- Implementar el decorador `@Roles(...)`.
- Implementar `RolesGuard`.
- Roles del sistema: **`CLIENTE`, `TRABAJADOR`, `ADMIN`, `SUPERADMIN`**.
- Los endpoints protegidos exigen JWT válido; los endpoints con `@Roles` exigen además que el rol activo del usuario esté autorizado.
- Distinguir correctamente `401 Unauthorized` (no autenticado / token inválido) de `403 Forbidden` (autenticado sin permiso).

### Tarjeta 5 (HU-F03) — Alternancia de roles en una misma cuenta
- Endpoint: `PATCH /api/users/switch-role`.
- Endpoint: `POST /api/users/enable-worker-role`.
- Un usuario puede cambiar entre `CLIENTE` y `TRABAJADOR` sin duplicar cuentas.
- `switch-role` solo permite activar un rol que el usuario ya posee en su arreglo `roles`.
- `enable-worker-role` agrega `TRABAJADOR` al arreglo `roles` si no existe y crea el `PerfilTrabajador` en estado `PENDIENTE` si aún no existe.
- Al cambiar el rol activo se emite un **nuevo JWT** para que el token refleje el `rolActivo` actualizado.

### Tarjeta 6 (CU-12) — Recuperación de acceso a cuenta
- Endpoint: `POST /api/auth/forgot-password`.
- Endpoint: `POST /api/auth/reset-password`.
- `forgot-password` genera un token temporal con vigencia de **15 minutos**.
- El token se almacena **hasheado** en `reset_token` (nunca en texto plano) y su expiración en `reset_token_expira`.
- La respuesta de `forgot-password` es genérica para no revelar si el correo existe.
- `reset-password` valida correo + token + vigencia, restablece la contraseña con `bcrypt` y limpia `reset_token` y `reset_token_expira` (uso único).
- Nunca devuelve el token ni el hash en la respuesta JSON.

### Tarjeta 7 (CU-24 / HU-F19 / CA-12) — Módulo exclusivo de SUPERADMIN
- Prefijo: `/api/superadmin/admins`.
- Acciones permitidas, todas protegidas con `@Roles('SUPERADMIN')`:
  - Crear cuentas `ADMIN`.
  - Listar cuentas `ADMIN`.
  - Modificar roles/permisos de un `ADMIN`.
  - Activar/desactivar cuentas `ADMIN`.
- Cada operación crítica se registra en `registros_auditoria` con:
  - `id_usuario_actor` (actor),
  - `accion`,
  - `entidad_afectada`,
  - `id_entidad_afectada`,
  - `detalle` (JSONB),
  - `fecha_evento`.
- Un `SUPERADMIN` no puede desactivarse a sí mismo ni degradar su propio rol.
- El sistema no tiene tabla de permisos en el Bloque 1: los permisos son derivados del rol. No inventar una tabla nueva.

---

## 3. Modelo de Datos y Entidades

### 3.1 Tabla `usuarios`
| Columna SQL | Tipo | Regla de entidad |
|---|---|---|
| `id_usuario` | UUID PK | `@PrimaryGeneratedColumn('uuid')` |
| `nombres` | VARCHAR(100) | obligatorio |
| `apellidos` | VARCHAR(100) | obligatorio |
| `correo` | VARCHAR(150) UNIQUE | obligatorio, normalizado a minúsculas |
| `telefono` | VARCHAR(30) | obligatorio |
| `contrasena_hash` | VARCHAR(255) | `select: false`, `@Exclude()` |
| `roles` | TEXT[] | `@Column('text', { array: true })`; mínimo `['CLIENTE']` |
| `rol_activo` | VARCHAR(30) | enum de aplicación; por defecto `CLIENTE` |
| `estado` | VARCHAR(20) | `ACTIVO`, `INACTIVO`, `SUSPENDIDO`; por defecto `ACTIVO` |
| `reset_token` | VARCHAR(255) | `select: false`, `@Exclude()`, nullable |
| `reset_token_expira` | TIMESTAMP | nullable |
| `fecha_registro` | TIMESTAMP | por defecto `CURRENT_TIMESTAMP` |

### 3.2 Tabla `registros_auditoria`
| Columna SQL | Tipo | Regla de entidad |
|---|---|---|
| `id_auditoria` | UUID PK | `@PrimaryGeneratedColumn('uuid')` |
| `id_usuario_actor` | UUID FK nullable | `ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })` |
| `accion` | VARCHAR(100) | obligatorio |
| `entidad_afectada` | VARCHAR(100) | obligatorio |
| `id_entidad_afectada` | VARCHAR(100) | nullable |
| `detalle` | JSONB | nullable |
| `fecha_evento` | TIMESTAMP | por defecto `CURRENT_TIMESTAMP` |

### 3.3 Entidades troncales
Mapear sin alterar el esquema:
- `categorias_servicio`
- `zonas`
- `perfiles_trabajador`
- `solicitudes_servicio`
- `pagos`

En el Bloque 1 solo `Usuario`, `RegistroAuditoria` y `PerfilTrabajador` tienen lógica de escritura. Las demás quedan como scaffolding de persistencia para los Bloques 2–5.

### 3.4 Reglas de mapeo TypeORM
- Nombres explícitos: `@Entity('usuarios')`, `@Column({ name: 'contrasena_hash' })`, etc.
- No renombrar columnas ni tablas.
- No agregar columnas que no existan en `Arreglalo_ya.sql` sin aprobación.
- `synchronize: false` siempre.
- Para login, el repositorio debe usar `addSelect('usuario.contrasena_hash')` porque el campo tiene `select: false`.
- `roles` es un arreglo PostgreSQL (`TEXT[]`); no usar `simple-array` (mapea a `text`, no a `text[]`).

---

## 4. Contrato de API

### 4.1 Autenticación — `/api/auth`

#### `POST /api/auth/register`
```json
{
  "nombres": "Ana",
  "apellidos": "Pérez",
  "correo": "ana@example.com",
  "telefono": "71234567",
  "contrasena": "Segura123"
}
```
- `201 Created`.
- Respuesta: datos públicos del usuario; sin `contrasena_hash` ni `reset_token`.
- Errores: `400` validación, `409` correo ya registrado.

#### `POST /api/auth/login`
```json
{
  "correo": "ana@example.com",
  "contrasena": "Segura123"
}
```
- `200 OK`.
- Respuesta:
```json
{
  "access_token": "jwt...",
  "usuario": {
    "id_usuario": "uuid",
    "nombres": "Ana",
    "apellidos": "Pérez",
    "correo": "ana@example.com",
    "telefono": "71234567",
    "roles": ["CLIENTE"],
    "rol_activo": "CLIENTE",
    "estado": "ACTIVO"
  }
}
```
- Credenciales incorrectas: `401` con mensaje genérico (`Credenciales inválidas`).
- Cuenta no activa: `403`.

#### `POST /api/auth/forgot-password`
```json
{ "correo": "ana@example.com" }
```
- `200 OK` siempre con mensaje genérico.
- Genera token temporal de 15 minutos, lo hashea y lo guarda en `reset_token` / `reset_token_expira`.

#### `POST /api/auth/reset-password`
```json
{
  "correo": "ana@example.com",
  "token": "token-recibido",
  "nuevaContrasena": "NuevaSegura123"
}
```
- `200 OK` si el token es válido y no expiró.
- `400` si el token es inválido, expiró o ya fue usado.
- Limpia `reset_token` y `reset_token_expira` tras el cambio.

### 4.2 Usuarios — `/api/users` (requieren JWT)

#### `GET /api/users/me`
- Devuelve el perfil del usuario autenticado.
- Sin campos sensibles.

#### `PATCH /api/users/me`
- Campos editables: `nombres`, `apellidos`, `telefono`.
- Opcionalmente cambio de contraseña mediante un flujo separado; **no** aceptar `roles`, `rol_activo`, `estado`, `contrasena_hash` ni `reset_token`.

#### `PATCH /api/users/switch-role`
```json
{ "rol": "TRABAJADOR" }
```
- Solo roles presentes en `usuario.roles`.
- Actualiza `rol_activo` y devuelve un JWT nuevo.
- `400` si el rol no está habilitado para la cuenta.

#### `POST /api/users/enable-worker-role`
- Agrega `TRABAJADOR` a `roles` si no existe.
- Crea `PerfilTrabajador` con `estado_validacion = 'PENDIENTE'` si no existe.
- No duplica cuentas.
- Devuelve el usuario actualizado y un JWT nuevo.

### 4.3 Superadmin — `/api/superadmin/admins` (solo `SUPERADMIN`)

| Método | Ruta | Acción |
|---|---|---|
| `POST` | `/api/superadmin/admins` | Crear administrador |
| `GET` | `/api/superadmin/admins` | Listar administradores |
| `PATCH` | `/api/superadmin/admins/:id` | Modificar rol/permisos de administrador |
| `PATCH` | `/api/superadmin/admins/:id/estado` | Activar/desactivar administrador |

Reglas:
- No permitir que el actor se desactive o se degrade a sí mismo.
- Toda mutación registra auditoría con actor, acción, entidad, id afectado, detalle y fecha.
- No devolver `contrasena_hash` ni `reset_token` en ningún listado.

### 4.4 Formato uniforme de errores
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request",
  "timestamp": "2026-11-06T00:00:00.000Z",
  "path": "/api/auth/register"
}
```

---

## 5. Seguridad y Control de Acceso

### 5.1 JWT
Payload mínimo:
```json
{
  "sub": "uuid-del-usuario",
  "correo": "ana@example.com",
  "roles": ["CLIENTE", "TRABAJADOR"],
  "rolActivo": "CLIENTE"
}
```
- Firmado con `JWT_SECRET`.
- Expiración configurable (`JWT_EXPIRES_IN`, recomendado `2h`).
- Estrategia `passport-jwt` valida el token y carga el usuario actual desde la base.
- Si el usuario fue desactivado, el token deja de ser aceptado.

### 5.2 Roles y permisos
- Enum central:
```ts
export enum Rol {
  CLIENTE = 'CLIENTE',
  TRABAJADOR = 'TRABAJADOR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}
```
- `@Roles(...)` compara contra `rol_activo` (no contra todo el arreglo `roles`).
- `JwtAuthGuard` protege todos los endpoints salvo los públicos de `/api/auth` (register, login, forgot-password, reset-password).
- `RolesGuard` se aplica después de `JwtAuthGuard`.
- Principio de mínimo privilegio: cada endpoint declara explícitamente sus roles.

### 5.3 Contraseñas y tokens
- `bcrypt` con `BCRYPT_ROUNDS=12` (mínimo 10).
- Nunca registrar contraseñas, hashes, tokens o JWT completos en logs.
- `reset_token` se guarda hasheado; nunca se devuelve en JSON ni se escribe en claro en la base.
- Comparaciones de tokens con `bcrypt.compare` o hash determinista equivalente; no comparar texto plano.
- Mensajes de login/forgot-password no deben permitir enumeración de correos.

### 5.4 Serialización
- `contrasena_hash`, `reset_token` y `reset_token_expira` deben tener `select: false` en la entidad y `@Exclude()` de `class-transformer`.
- Activar `ClassSerializerInterceptor` global o serializar explícitamente con DTOs de respuesta.
- Regla absoluta: **ninguna respuesta JSON puede incluir `contrasena_hash` ni `reset_token`**.

---

## 6. Criterios de Calidad ISO/IEC 25010

### 6.1 Seguridad
- Hash de contraseñas con bcrypt.
- Hash de tokens de recuperación.
- JWT firmado y con expiración.
- Guards por rol en todos los endpoints protegidos.
- Validación estricta de entrada con DTOs.
- No exponer campos sensibles.
- No filtrar existencia de cuentas en recuperación de contraseña.
- Auditoría de operaciones críticas de administración.

### 6.2 Mantenibilidad (RNF-08)
Código modular separado obligatoriamente en:

```
backend/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/jwt.strategy.ts
│   └── dto/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── superadmin/
│   ├── superadmin.module.ts
│   ├── superadmin.controller.ts
│   ├── superadmin.service.ts
│   └── dto/
├── audit/
│   ├── audit.module.ts
│   └── audit.service.ts
├── common/
│   ├── decorators/roles.decorator.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── guards/roles.guard.ts
│   ├── enums/rol.enum.ts
│   └── filters/http-exception.filter.ts
├── entities/
│   ├── usuario.entity.ts
│   ├── registro-auditoria.entity.ts
│   ├── categoria-servicio.entity.ts
│   ├── zona.entity.ts
│   ├── perfil-trabajador.entity.ts
│   ├── solicitud-servicio.entity.ts
│   └── pago.entity.ts
├── app.module.ts
└── main.ts
```

Reglas:
- Sin lógica de negocio en controladores.
- DTOs separados de entidades; nunca exponer entidades directamente.
- Un módulo no accede a repositorios de otro módulo; usa el servicio exportado.
- Evitar `any`; tipar DTOs, payloads y respuestas.
- Nombres de dominio en español (entidades, DTOs, rutas) y nombres de infraestructura en inglés (guards, services, modules) según las convenciones de NestJS.
- Documentación y mensajes de error en español.

### 6.3 Usabilidad y portabilidad (RNF-04)
- Contratos JSON estables y consistentes para el frontend Angular.
- El frontend debe ser responsivo para móvil y escritorio.
- Errores claros y accionables para el usuario final.

---

## 7. Reglas de Trabajo para Agentes

1. **Leer este archivo antes de modificar código.**
2. Verificar siempre contra `Arreglalo_ya.sql`; no inventar tablas ni columnas.
3. No implementar funcionalidades de Bloques 2–5 (solicitudes, cotizaciones, pagos, validación de trabajadores, reportes, etc.).
4. No cambiar el stack ni agregar dependencias sin justificación y aprobación.
5. No usar `synchronize: true`.
6. No commitear `.env` ni secretos.
7. Toda operación crítica de `SUPERADMIN` debe auditarse.
8. Toda respuesta debe respetar la regla de no exponer `contrasena_hash` ni `reset_token`.
9. Mantener la estructura modular `auth`, `users`, `superadmin`, `audit`.
10. Si una tarea no está contemplada en las Tarjetas 1–7, detenerse y consultar.

---

## 8. Fuera de Alcance (Bloques 2–5)

No implementar en este bloque:
- Publicación y gestión de solicitudes de servicio.
- Cotizaciones y contratación.
- Pagos, comisiones y conciliación.
- Validación/aprobación de perfiles de trabajadores por parte de administradores.
- Calificaciones, reportes o reputación.
- Notificaciones, chat o mensajería.
- Paneles o pantallas completas del frontend, salvo lo mínimo necesario para consumir los endpoints del Bloque 1.

---

## 9. Definición de Terminado (Bloque 1)

Una tarjeta se considera terminada cuando:
- El endpoint responde con el contrato documentado.
- Los DTOs validan entradas con `class-validator`.
- El endpoint está protegido por `JwtAuthGuard` y, cuando corresponde, por `RolesGuard`.
- No se filtran campos sensibles en ninguna respuesta.
- Las operaciones de superadmin generan registro en `registros_auditoria`.
- Existe una prueba manual documentada (curl/Postman) del flujo feliz y de los errores principales.
- El código respeta la estructura modular y compila sin errores de TypeScript.
