# Guía para clonar y ejecutar Arréglalo Ya

Esta guía explica cómo descargar el proyecto, preparar la base de datos, instalar las dependencias y ejecutar el backend y el frontend en una computadora nueva.

> **Repositorio:** https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git
>
> **Alcance:** Bloque 1 — Tarjetas T1 a T7.
>
> **Documentación de arquitectura:** `backend/AGENTS.md`.

---

## 1. Requisitos

| Herramienta | Versión recomendada | Verificación |
|---|---|---|
| Node.js | 24 (también funciona 22.12 o superior) | `node -v` |
| npm | 11 o superior | `npm -v` |
| PostgreSQL | 16 o superior (probado con 18) | `psql --version` |
| Git | Cualquier versión reciente | `git --version` |
| Navegador | Chrome, Edge o Firefox | — |

En Windows, PostgreSQL suele instalarse en:

```text
C:\Program Files\PostgreSQL\18\bin
```

Si `psql` no se reconoce en la terminal, usa la ruta completa o agrega esa carpeta al `PATH`.

---

## 2. Clonar el repositorio

```powershell
git clone https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git
cd ArreglaloYa-Pollos
```

La rama principal es `main`. También existe `bloque-1-completado` con el mismo contenido.

---

## 3. Crear la base de datos

### 3.1 Crear la base

En Windows PowerShell:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

& $psql -U postgres -c "CREATE DATABASE arreglalo_ya_db;"
```

En Linux o macOS:

```bash
sudo -u postgres psql -c "CREATE DATABASE arreglalo_ya_db;"
```

Si la base ya existe, PostgreSQL mostrará un error indicando que ya existe; puedes continuar.

### 3.2 Ejecutar el script de estructura y datos iniciales

Desde la raíz del repositorio, en Windows:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

& $psql -U postgres -d arreglalo_ya_db -f "database\01_init_arreglalo_ya.sql"
```

En Linux o macOS:

```bash
psql -U postgres -d arreglalo_ya_db -f database/01_init_arreglalo_ya.sql
```

El script crea:

- La extensión `uuid-ossp`.
- Las tablas `usuarios`, `registros_auditoria`, `categorias_servicio`, `zonas`, `perfiles_trabajador`, `solicitudes_servicio` y `pagos`.
- Cuatro categorías de servicio y cinco zonas de ejemplo.

Para comprobar que todo se creó:

```powershell
& $psql -U postgres -d arreglalo_ya_db -c "\dt"
& $psql -U postgres -d arreglalo_ya_db -c "SELECT * FROM categorias_servicio;"
& $psql -U postgres -d arreglalo_ya_db -c "SELECT * FROM zonas;"
```

---

## 4. Configurar y ejecutar el backend

Abre una terminal en la raíz del repositorio:

```powershell
cd backend
npm ci
```

> `npm ci` instala exactamente las versiones del `package-lock.json`. Si tu versión de npm no lo soporta, usa `npm install`.

Copia el archivo de ejemplo y edítalo:

```powershell
Copy-Item .env.example .env
notepad .env
```

Contenido mínimo del `.env`:

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

Reemplaza `TU_CLAVE_DE_POSTGRES` y `UN_SECRETO_LARGO_Y_PRIVADO`. Puedes generar un secreto con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

El archivo `.env` es privado: no se sube a GitHub y cada persona debe crear el suyo.

Inicia el backend en modo desarrollo:

```powershell
npm run start:dev
```

Debe aparecer un mensaje similar a:

```text
Nest application successfully started
```

y el aviso de que la cuenta SUPERADMIN fue creada o ya existe.

Comprueba que responde:

```powershell
Invoke-RestMethod http://localhost:3000/api
# Resultado esperado: Hello World!
```

La API queda disponible en `http://localhost:3000/api`.

---

## 5. Ejecutar el frontend

Abre una **segunda terminal** en la raíz del repositorio:

```powershell
cd frontend
npm ci
npm start
```

Abre el navegador en:

```text
http://localhost:4200
```

La ruta raíz redirige a `/profile`. Si no hay sesión, el guard redirige a `/login`.

Si el puerto 4200 está ocupado:

```powershell
npm start -- --port 4201
```

La URL de la API se configura en `frontend/src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
```

Si cambias el puerto del backend, actualiza también ese archivo.

---

## 6. Cuenta inicial

Al arrancar el backend, el `SeedService` crea una cuenta SUPERADMIN si no existe:

| Campo | Valor |
|---|---|
| Correo | `superadmin@arreglaloya.bo` |
| Contraseña | `SuperAdmin2026!` |

Con esa cuenta puedes entrar a `/superadmin`, crear administradores y revisar la auditoría.

> Esta cuenta es académica. En un entorno real se debe cambiar la contraseña y no dejar credenciales por defecto.

---

## 7. Verificar que todo funciona

### 7.1 API

```powershell
$base = 'http://localhost:3000/api'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType 'application/json' `
  -Body (@{
    correo = 'superadmin@arreglaloya.bo'
    contrasena = 'SuperAdmin2026!'
  } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.access_token)" }

Invoke-RestMethod -Uri "$base/users/me" -Headers $headers | Format-List
Invoke-RestMethod -Uri "$base/superadmin/admins" -Headers $headers | Format-Table
```

### 7.2 Compilación

Backend:

```powershell
cd backend
npm run build
```

Frontend:

```powershell
cd frontend
npm run build
```

Ambos comandos deben terminar sin errores de TypeScript.

### 7.3 Base de datos

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

& $psql -U postgres -d arreglalo_ya_db -c "SELECT correo, roles, rol_activo, estado FROM usuarios;"
& $psql -U postgres -d arreglalo_ya_db -c "SELECT accion, entidad_afectada, fecha_evento FROM registros_auditoria ORDER BY fecha_evento DESC LIMIT 10;"
```

---

## 8. Compilar para producción

### 8.1 Backend

```powershell
cd backend
npm run build
npm run start:prod
```

El backend compilado queda en `backend/dist` y se ejecuta con `node dist/main`.

### 8.2 Frontend

```powershell
cd frontend
npm run build
```

Los archivos estáticos quedan en:

```text
frontend/dist/frontend/browser
```

Puedes servirlos con cualquier servidor HTTP estático. Para la demostración del Bloque 1 no es necesario: basta con `npm start`.

---

## 9. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `psql` no se reconoce | No está en el `PATH` | Usa `C:\Program Files\PostgreSQL\18\bin\psql.exe` o agrega la carpeta al `PATH` |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL detenido o puerto incorrecto | Inicia el servicio `postgresql-x64-18` y revisa `DB_HOST` y `DB_PORT` |
| `password authentication failed` | Contraseña incorrecta en `.env` | Corrige `DB_PASSWORD` y reinicia el backend |
| `database "arreglalo_ya_db" does not exist` | No se creó la base | Créala y ejecuta `database/01_init_arreglalo_ya.sql` |
| `Port 3000 is already in use` | Otro proceso usa el puerto | Cierra el proceso o cambia `PORT` en `.env` y la URL del frontend |
| `Port 4200 is already in use` | Otro proceso usa el puerto | `npm start -- --port 4201` |
| `npm ci` falla por versión de Node | Node demasiado antiguo | Instala Node 24 y vuelve a intentar |
| Error al instalar `bcrypt` | Falta compilador o binario incompatible | Ejecuta `npm rebuild bcrypt`; si persiste, usa Node LTS |
| La cuenta semilla no aparece | El backend no conectó a la base | Revisa los logs, la conexión y reinicia el backend |
| `401 Unauthorized` | Token ausente, vencido o inválido | Vuelve a iniciar sesión y copia el token nuevo |
| `403 Forbidden` | El rol activo no tiene permiso | Revisa `rolActivo`; para `/superadmin` debe ser `SUPERADMIN` |
| Error de CORS | Backend apagado o URL incorrecta | Verifica `http://localhost:3000/api` y que el backend esté activo |

---

## 10. Qué hay y qué no hay en el repositorio

El repositorio contiene **el código fuente y los archivos necesarios para reconstruir el proyecto**:

- `backend/src`, `frontend/src` y `database/`.
- `package.json` y `package-lock.json` de backend y frontend.
- `backend/.env.example`.
- `backend/AGENTS.md`.
- Configuración de TypeScript, Angular, ESLint y Prettier.

No se suben estos archivos porque se generan o son privados:

| Archivo o carpeta | Motivo | Cómo se obtiene |
|---|---|---|
| `backend/node_modules`, `frontend/node_modules` | Dependencias de ~405 MB | `npm ci` |
| `backend/dist`, `frontend/dist` | Resultado de compilación | `npm run build` |
| `frontend/.angular` | Caché de Angular | Se genera al ejecutar `npm start` |
| `backend/.env` | Contiene contraseñas y secretos | Copiar `.env.example` y editarlo |

Por eso, después de `git clone`, es normal que no exista `dist`. Se crea al compilar.

---

## 11. Estructura rápida

```text
ArreglaloYa-Pollos/
├── backend/
│   ├── src/
│   │   ├── auth/           Registro, login, recuperación y JWT
│   │   ├── users/          Perfil, alternancia y habilitación de trabajador
│   │   ├── superadmin/     Administradores y auditoría
│   │   ├── audit/          Registro de eventos
│   │   ├── common/         Guards, decoradores, enums y utilidades
│   │   ├── entities/       Entidades TypeORM
│   │   └── seed/           Cuenta SUPERADMIN inicial
│   ├── .env.example
│   └── AGENTS.md
├── frontend/
│   └── src/app/
│       ├── core/           Servicios, guards, interceptor y modelos
│       ├── pages/          Login, registro, perfil y superadmin
│       └── layout/         Navegación
├── database/
│   └── 01_init_arreglalo_ya.sql
└── INSTRUCCIONES.md
```

---

## 12. Comandos rápidos

```powershell
# 1. Clonar
git clone https://github.com/artreyes-ucb/ArreglaloYa-Pollos.git
cd ArreglaloYa-Pollos

# 2. Base de datos (Windows)
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -c "CREATE DATABASE arreglalo_ya_db;"
& $psql -U postgres -d arreglalo_ya_db -f "database\01_init_arreglalo_ya.sql"

# 3. Backend (terminal 1)
cd backend
npm ci
Copy-Item .env.example .env
notepad .env
npm run start:dev

# 4. Frontend (terminal 2, desde la raíz)
cd frontend
npm ci
npm start
```

Abre `http://localhost:4200` e inicia sesión con `superadmin@arreglaloya.bo` / `SuperAdmin2026!`.
