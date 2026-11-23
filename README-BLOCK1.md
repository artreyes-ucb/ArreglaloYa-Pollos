# Arréglalo Ya — Bloque 1

Implementación del **Bloque 1 (Tarjetas T1–T7)** del sistema Arréglalo Ya, proyecto académico del Grupo 2 de Ingeniería de Sistemas de la Universidad Católica Boliviana (UCB).

> Este documento describe exclusivamente el Bloque 1: configuración y persistencia base, autenticación, perfil, roles, recuperación de acceso y administración SUPERADMIN. El repositorio principal también puede contener aportes de otros bloques; sus README se mantienen por separado.

## Alcance del bloque

| Tarjeta | Funcionalidad | Resultado principal |
|---|---|---|
| T1 | Configuración base y persistencia | NestJS, TypeORM, PostgreSQL y entidades del esquema inicial |
| T2 | Registro de usuarios | Correo normalizado, validación DTO y contraseña con bcrypt |
| T3 | Inicio de sesión y perfil | JWT, lectura y edición del perfil propio |
| T4 | Seguridad basada en roles | Guards JWT y de roles; separación entre 401 y 403 |
| T5 | Alternancia de roles | Habilitar rol TRABAJADOR y alternar CLIENTE/TRABAJADOR sin duplicar cuenta |
| T6 | Recuperación de acceso | Código temporal, expiración y restablecimiento de contraseña |
| T7 | Administración SUPERADMIN | Gestión de administradores, autoprotección y auditoría |

## Funcionalidades

- Registro e inicio de sesión con validación de entradas y contraseñas hasheadas con bcrypt.
- Tokens JWT firmados y expirables; la estrategia recarga el usuario actual desde PostgreSQL.
- Perfil propio: consulta y actualización limitada a nombres, apellidos y teléfono.
- Roles del sistema: `CLIENTE`, `TRABAJADOR`, `ADMIN` y `SUPERADMIN`.
- Habilitación del rol trabajador en una cuenta existente y creación del perfil en estado `PENDIENTE`.
- Alternancia entre roles habilitados con emisión de un JWT actualizado.
- Recuperación de contraseña mediante código temporal de seis dígitos.
- Administración protegida de cuentas `ADMIN` y registro de operaciones críticas en auditoría.
- Frontend Angular responsive con registro, login, recuperación, perfil y panel SUPERADMIN.
- Validación global de solicitudes con `ValidationPipe` y serialización de respuestas para evitar exponer campos sensibles.

## Tecnologías

| Capa | Tecnologías | Uso |
|---|---|---|
| Backend | NestJS 11, TypeScript, Node.js | API REST modular |
| Persistencia | TypeORM, PostgreSQL | Acceso y almacenamiento relacional |
| Autenticación | `@nestjs/jwt`, Passport JWT, bcrypt | Sesiones JWT y hash de contraseñas |
| Validación | `class-validator`, `class-transformer` | Validación y transformación de DTOs |
| Frontend | Angular standalone, TypeScript, Reactive Forms | Interfaz web y formularios |
| Comunicación | Angular HttpClient, Router | Consumo de API y navegación |

## Arquitectura

```text
Angular (localhost:4200)
        │ HttpClient + Bearer JWT
        ▼
NestJS API (localhost:3000/api)
  ├── auth       Registro, login y recuperación
  ├── users      Perfil y alternancia de roles
  ├── superadmin Administración y consulta de auditoría
  ├── audit      Registro de eventos críticos
  ├── common     Guards, decoradores, enums y utilidades
  ├── seed       Creación idempotente de SUPERADMIN
  └── entities   Mapeo TypeORM del esquema PostgreSQL
        │
        ▼
PostgreSQL: arreglalo_ya_db
```

La configuración de TypeORM usa `synchronize: false`: el esquema se crea y controla mediante el script SQL, no mediante cambios automáticos del ORM.

### Estructura relevante

```text
backend/src/
├── auth/                 Autenticación, recuperación, JWT y DTOs
├── users/                Perfil y alternancia de roles
├── superadmin/           Gestión de administradores y DTOs
├── audit/                Registro de auditoría
├── common/               Guards, roles, interfaces y utilidades
├── entities/             Entidades TypeORM
├── seed/                 Cuenta semilla SUPERADMIN
├── app.module.ts
└── main.ts               Prefijo /api, CORS y validación global
frontend/src/app/
├── core/                 Servicios, guards, interceptor y modelos
├── layout/               Navegación
└── pages/                Login, registro, recuperación, perfil y superadmin
database/
└── 01_init_arreglalo_ya.sql
```

## Modelo de datos inicial

| Tabla | Propósito en el esquema |
|---|---|
| `usuarios` | Datos de cuenta, roles, estado y recuperación de acceso |
| `registros_auditoria` | Trazabilidad de acciones administrativas |
| `categorias_servicio` | Catálogo inicial de categorías |
| `zonas` | Catálogo inicial de zonas |
| `perfiles_trabajador` | Perfil asociado a una cuenta con rol trabajador |
| `solicitudes_servicio` | Tabla troncal para funcionalidades posteriores |
| `pagos` | Tabla troncal para funcionalidades posteriores |

El script habilita `uuid-ossp` y carga cuatro categorías y cinco zonas de Cochabamba. En el Bloque 1, las operaciones de escritura se concentran en usuarios, auditoría y perfiles de trabajador; las demás tablas son scaffolding de persistencia.

## API del Bloque 1

Todas las rutas usan el prefijo `/api`. Las rutas protegidas requieren `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registrar una cuenta CLIENTE | Público |
| `POST` | `/api/auth/login` | Validar credenciales y emitir JWT | Público |
| `POST` | `/api/auth/forgot-password` | Solicitar código temporal de recuperación | Público |
| `POST` | `/api/auth/reset-password` | Restablecer contraseña con código vigente | Público |

### Usuarios — `/api/users`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| `GET` | `/api/users/me` | Obtener el perfil propio | JWT |
| `PATCH` | `/api/users/me` | Actualizar nombres, apellidos o teléfono | JWT |
| `POST` | `/api/users/enable-worker-role` | Habilitar TRABAJADOR y crear perfil pendiente si hace falta | JWT |
| `PATCH` | `/api/users/switch-role` | Cambiar al rol habilitado indicado por `nuevoRol` y emitir JWT nuevo | JWT |

### Superadministración — `/api/superadmin`

Todas las rutas de este módulo requieren JWT válido y rol activo `SUPERADMIN`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/superadmin/admins` | Listar cuentas ADMIN |
| `POST` | `/api/superadmin/admins` | Crear cuenta ADMIN |
| `PATCH` | `/api/superadmin/admins/:id` | Actualizar datos o roles del administrador |
| `PATCH` | `/api/superadmin/admins/:id/estado` | Activar o desactivar una cuenta ADMIN |
| `GET` | `/api/superadmin/audit-logs` | Consultar los eventos de auditoría |

Las mutaciones administrativas registran actor, acción, entidad afectada, identificador, detalle y fecha. El SUPERADMIN no puede degradar ni desactivar su propia cuenta.

## Seguridad y validación

- `JwtAuthGuard` protege rutas autenticadas y la estrategia verifica la cuenta vigente.
- `RolesGuard` aplica el control de acceso a las rutas SUPERADMIN.
- La validación global usa `whitelist`, `forbidNonWhitelisted` y `transform`.
- `contrasena_hash` y los datos de recuperación se excluyen de la serialización pública.
- El correo se normaliza para evitar diferencias por mayúsculas.
- Los secretos locales se configuran en `backend/.env`, que no se versiona.
- Los endpoints distinguen autenticación fallida (`401`) de falta de autorización (`403`).

> **Nota de alcance académico:** el flujo de recuperación está preparado para la demostración local del Bloque 1 y presenta el código temporal en la interfaz; no integra un proveedor de correo. Para producción, el código debe entregarse por un canal privado y no devolverse en la respuesta de la API.

## Instalación y ejecución

Para el procedimiento completo para Windows, Linux y macOS, consulta [`INSTRUCCIONES.md`](./INSTRUCCIONES.md). Resumen:

### Requisitos

- Node.js 24 (o 22.12 o superior) y npm 11.
- PostgreSQL 16 o superior.
- Git.

### 1. Clonar y crear la base

```bash
git clone https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git
cd ArreglaloYa-Pollos
```

Crea la base `arreglalo_ya_db` en PostgreSQL y ejecuta el script desde la raíz:

```bash
psql -U postgres -c "CREATE DATABASE arreglalo_ya_db;"
psql -U postgres -d arreglalo_ya_db -f database/01_init_arreglalo_ya.sql
```

### 2. Configurar y arrancar el backend

```bash
cd backend
npm ci
```

Copia `.env.example` como `.env` y configura las credenciales locales de PostgreSQL y un secreto JWT privado. Luego:

```bash
npm run start:dev
```

La API estará en `http://localhost:3000/api`.

### 3. Arrancar el frontend

En otra terminal, desde la raíz:

```bash
cd frontend
npm ci
npm start
```

Abre `http://localhost:4200`.

### 4. Compilar

```bash
# Dentro de backend
npm run build

# Dentro de frontend
npm run build
```

`dist/`, `node_modules/` y `.angular/` son artefactos generados e ignorados por Git; se recrean con la instalación y compilación. No es necesario subirlos.

## Cuenta de demostración

Al iniciar el backend, el servicio seed crea la cuenta inicial si no existe:

```text
Correo:      superadmin@arreglaloya.bo
Contraseña:  SuperAdmin2026!
```

Es una credencial académica para desarrollo local. No reutilizarla en producción.

## Verificación manual sugerida

1. Registrar un cliente e iniciar sesión; verificar que la respuesta no contenga el hash de contraseña.
2. Consultar y actualizar `/api/users/me` con el JWT.
3. Llamar a `/api/users/me` sin token y comprobar `401`.
4. Intentar entrar a `/api/superadmin/admins` con una cuenta CLIENTE y comprobar `403`.
5. Habilitar el rol trabajador y comprobar el perfil `PENDIENTE`; alternar rol y revisar el JWT nuevo.
6. Probar recuperación de contraseña y el uso único del código.
7. Iniciar sesión como SUPERADMIN, crear o modificar un ADMIN y revisar `/api/superadmin/audit-logs`.
8. Ejecutar `npm run build` tanto en backend como en frontend.

## Responsable de este bloque

**Integrante 1 — Implementación del Bloque 1 (Tarjetas T1–T7).**

Proyecto académico del Grupo 2 — Ingeniería de Sistemas — Universidad Católica Boliviana (UCB).
