# MineTrack

MineTrack es una aplicación web para organizar equipos mineros y dar seguimiento a sus ciclos de mantenimiento. Permite mantener un catálogo de tipos de equipo, registrar equipos y horómetros, consultar el avance hacia el próximo mantenimiento y conservar un historial de mantenimientos.

## Enlaces

- **Aplicación web:** [frontend en Vercel](https://frontend-five-pied-58.vercel.app)
- **API:** [backend en Railway](https://minetrackbackend-production.up.railway.app)
- **Estado del backend:** [GET /health](https://minetrackbackend-production.up.railway.app/health)
- **Repositorio:** [SebastianRetamozo/MineTrack](https://github.com/SebastianRetamozo/MineTrack)

## Funcionalidades

- Administrar tipos de equipo y sus intervalos de mantenimiento predeterminados.
- Crear, editar, consultar, filtrar y eliminar equipos.
- Registrar lecturas de horómetro y calcular el progreso del ciclo de mantenimiento.
- Registrar mantenimientos y consultar su historial por equipo o fecha.
- Consultar en el panel principal el resumen de equipos, los equipos que requieren atención y los registros recientes.

El panel clasifica como próximo el mantenimiento cuando el progreso alcanza el 80 %; el backend marca el mantenimiento como requerido al alcanzar o superar el intervalo aplicado.

## Stack y arquitectura

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query, Axios y Tailwind CSS |
| Backend | Node.js 20+, TypeScript, Express y Zod |
| Persistencia | Prisma ORM y PostgreSQL |
| Organización | Monorepo con workspaces de npm: `apps/frontend` y `apps/backend` |

El frontend es una SPA independiente y consume la API REST del backend. El backend concentra las rutas, controladores, validaciones y acceso a PostgreSQL mediante Prisma. El esquema y las migraciones existentes están en `apps/backend/prisma/`.

```text
apps/
  frontend/   React, páginas, componentes, hooks y cliente HTTP
  backend/    Express, API, Prisma y lógica de dominio
docs/          Arquitectura, API, pruebas y uso de IA
package.json   Workspaces y comandos del monorepo
```

Consulta [Arquitectura](./docs/ARCHITECTURE.md) y [API](./docs/API.md) para más detalle.

## Requisitos

- Node.js **20 o superior** (requisito declarado en `package.json`).
- npm.
- Una base de datos PostgreSQL accesible para el backend. El esquema Prisma usa las variables `DATABASE_URL` y `DIRECT_URL`.

## Instalación y configuración local

Desde la raíz del repositorio, instala las dependencias de ambos workspaces:

```bash
npm install
```

Copia la plantilla de variables para el backend y completa las conexiones de PostgreSQL con valores propios:

```powershell
Copy-Item .env.example apps\backend\.env
```

En macOS/Linux:

```bash
cp .env.example apps/backend/.env
```

Para desarrollo local, el frontend usa el proxy de Vite. Crea `apps/frontend/.env` con:

```env
VITE_API_URL=/api
```

El proxy reenvía `/api` a `http://localhost:3000`. Si `VITE_API_URL` no se define, el cliente también usa `/api` por defecto.

> **Nota sobre la plantilla:** el `.env.example` raíz contiene `VITE_API_URL=http://localhost:3000`. El frontend requiere una base que incluya el prefijo `/api`; para usar el proxy local, establece `VITE_API_URL=/api` en `apps/frontend/.env`. No copies valores reales de conexión a documentación ni al repositorio.

### Variables de entorno

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `DATABASE_URL` | Backend / Prisma | URL de conexión de la aplicación a PostgreSQL. |
| `DIRECT_URL` | Backend / Prisma | URL de conexión directa utilizada por Prisma para tareas como migraciones. |
| `PORT` | Backend | Puerto HTTP; el valor predeterminado en el código es `3000`. |
| `NODE_ENV` | Backend | Controla el nivel de logs de Prisma; el código habilita logs de consultas en `development`. |
| `FRONTEND_URL` | Backend | Opcional. Origen u orígenes permitidos por CORS, separados por comas. Si no se define, Express CORS permite cualquier origen. |
| `VITE_API_URL` | Frontend | URL base de la API. Local con proxy: `/api`. Despliegue actual: `https://minetrackbackend-production.up.railway.app/api`. |

Las variables con credenciales deben permanecer en archivos `.env` locales o en el gestor de variables del proveedor. Git ignora estos archivos, excepto `.env.example`.

En Vercel, configura `VITE_API_URL` con el valor indicado en la tabla. Vite incorpora esta variable durante el build del frontend. Si Railway limita CORS mediante `FRONTEND_URL`, configura allí el origen de Vercel: `https://frontend-five-pied-58.vercel.app`.

## Desarrollo

Desde la raíz:

```bash
# Frontend y backend
npm run dev

# Solo frontend (Vite, puerto 5173)
npm run dev:frontend

# Solo backend (Express, puerto predeterminado 3000)
npm run dev:backend
```

El backend expone `GET /health` y la API bajo `/api`. La documentación de rutas está en [docs/API.md](./docs/API.md).

## Build y comprobaciones estáticas

```bash
# Build de todos los workspaces
npm run build

# Builds individuales
npm run build:frontend
npm run build:backend

# TypeScript en ambos workspaces
npm run typecheck
```

El build del backend genera el cliente Prisma y compila TypeScript; el del frontend ejecuta `tsc` y `vite build`. Estos comandos no sustituyen pruebas funcionales manuales. Consulta [docs/TESTING.md](./docs/TESTING.md).

Para iniciar el backend compilado: `npm run start`. `npm run start:frontend` ejecuta `vite preview` para previsualizar localmente un build, no sustituye el hosting de producción.

## Documentación

- [Arquitectura](./docs/ARCHITECTURE.md)
- [API REST](./docs/API.md)
- [Pruebas y verificación](./docs/TESTING.md)
- [Uso de IA](./docs/AI_USAGE.md)
- [Esquema Prisma](./apps/backend/prisma/schema.prisma)
