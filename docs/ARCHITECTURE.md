# Arquitectura

## Vista general

MineTrack es un monorepo con dos workspaces de npm y una aplicación backend monolítica. El frontend y el backend se ejecutan y compilan de forma independiente; se comunican mediante HTTP y JSON.

```text
Navegador
   │
   ├── React SPA (apps/frontend)
   │      └── Axios → API REST
   │
   └── Express (apps/backend)
          ├── rutas → controladores → validaciones Zod
          └── Prisma Client → PostgreSQL
```

## Estructura del monorepo

```text
apps/
  frontend/
    src/api/          Cliente HTTP y endpoints
    src/components/   Componentes visuales y formularios
    src/hooks/        Hooks de TanStack Query
    src/pages/        Dashboard, equipos, mantenimiento y configuración
  backend/
    prisma/           Esquema y migraciones
    src/
      controllers/    Operaciones de dominio y respuestas HTTP
      lib/            Cliente Prisma compartido
      middleware/     Manejo de errores
      routes/         Registro de rutas Express
      utils/          Esquemas de validación
docs/                 Documentación del proyecto
package.json          Workspaces y comandos compartidos
```

La raíz declara `apps/*` como workspaces. No hay un paquete compartido de tipos: el frontend y el backend mantienen sus tipos en sus respectivos proyectos.

## Frontend

El frontend es una SPA de React y TypeScript servida y compilada por Vite. React Router conecta las páginas principales: panel (`/`), equipos (`/equipos`), mantenimiento (`/mantenimiento`), configuración de tipos (`/configuracion`) y ayuda (`/ayuda`).

Las consultas y mutaciones se gestionan con TanStack Query en `src/hooks/useApi.ts`; sus funciones consumen los endpoints Axios de `src/api/endpoints.ts`. La base HTTP procede de `VITE_API_URL` y, si falta, el cliente usa `/api`.

En desarrollo, Vite escucha en el puerto `5173` y proxifica `/api` hacia `http://localhost:3000`. Ese proxy pertenece al servidor de desarrollo. En producción, el navegador debe llamar directamente al backend usando una `VITE_API_URL` absoluta que incluya `/api`.

## Backend y comunicación

El backend es una aplicación Express única. `src/index.ts` configura CORS, JSON, registro de solicitudes, health check y las rutas:

- `/api/equipment-types`
- `/api/equipment`
- `/api/maintenance`

Los routers delegan en controladores. Los controladores validan cuerpos y algunos parámetros con Zod, aplican reglas de negocio y usan Prisma para la persistencia. Los errores se convierten en respuestas HTTP mediante `src/middleware/errorHandler.ts`.

El backend permite configurar `FRONTEND_URL` como uno o varios orígenes separados por comas. Si no se define, la configuración actual de CORS permite cualquier origen.

## Prisma y PostgreSQL

El modelo relacional está definido en [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma):

- `EquipmentType` tiene nombre único e intervalo de mantenimiento predeterminado.
- `Equipment` tiene código único, pertenece a un tipo y mantiene el horómetro actual, el horómetro del último mantenimiento y el intervalo aplicado.
- `Maintenance` registra el equipo, horómetro, descripción opcional y fecha. La relación con equipo tiene borrado en cascada.

El datasource Prisma usa `DATABASE_URL` para la conexión y `DIRECT_URL` como conexión directa. El cliente se exporta desde [`src/lib/prisma.ts`](../apps/backend/src/lib/prisma.ts) y se cachea en `globalThis` fuera de producción para reutilizarlo durante recargas en desarrollo. Su configuración de logs distingue `development` del resto de entornos.

## Flujo de registro y mantenimiento

1. En **Configuración**, se crean tipos con un intervalo predeterminado positivo.
2. Al crear un equipo, se selecciona un tipo y se registra su código y horómetro. El formulario propone el intervalo del tipo; la API requiere `appliedIntervalHours`. El horómetro del último mantenimiento se inicializa al horómetro de creación.
3. La API calcula el progreso del ciclo como `(horometer - lastMaintenanceHorometer) / appliedIntervalHours`, expresado en porcentaje y limitado a 100. El mantenimiento es requerido cuando las horas desde el último mantenimiento alcanzan el intervalo. El dashboard también identifica como próximo el mantenimiento a partir del 80 %.
4. Al registrar mantenimiento, la API exige que la lectura no sea menor que el horómetro actual ni que la lectura del último mantenimiento. En una transacción crea el registro histórico y actualiza el horómetro actual, el horómetro del último mantenimiento y el intervalo aplicado al intervalo vigente del tipo.
5. Las mutaciones del frontend invalidan las consultas relacionadas para actualizar equipos, historial y panel.

Consulta los contratos y particularidades de las rutas en [API REST](./API.md).
