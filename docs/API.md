# API REST

## Base y formato

- Producción: `https://minetrackbackend-production.up.railway.app`
- Local: `http://localhost:3000`
- Las rutas de recursos usan el prefijo `/api`; `GET /health` está fuera de ese prefijo.
- Los cuerpos de escritura son JSON.
- Los listados paginados reciben `page` (entero positivo, predeterminado `1`) y `limit` (entero positivo, predeterminado `20`, máximo `100`).

Las rutas se contrastaron con [`src/index.ts`](../apps/backend/src/index.ts), los routers de [`src/routes/`](../apps/backend/src/routes/) y sus controladores.

## Health y metadatos

### `GET /health`

Comprueba PostgreSQL con una consulta `SELECT 1`.

- `200 OK`: `status: "ok"` y `database.connected: true`.
- `503 Service Unavailable`: `status: "degraded"` y `database.connected: false`; la respuesta incluye `database.error`.

La respuesta también contiene `timestamp`, `uptime`, `environment` y, si aplica, la latencia.

### `GET /api`

Devuelve metadatos del servicio, actualmente con `name`, `version` y `status`.

## Tipos de equipo

### `GET /api/equipment-types`

Query: `page`, `limit`.

Devuelve `{ data, pagination }`. Cada tipo incluye sus campos persistidos y `_count.equipment`.

### `GET /api/equipment-types/:id`

Devuelve un tipo y sus equipos asociados, limitados a `id`, `code`, `horometer`, `lastMaintenanceHorometer` y `appliedIntervalHours`.

`id` corresponde al identificador de base de datos. A diferencia de las rutas de equipo y mantenimiento, este controlador no valida explícitamente el parámetro con el esquema UUID de Zod.

### `POST /api/equipment-types`

Cuerpo:

```json
{
  "name": "Excavadora",
  "maintenanceIntervalHours": 500
}
```

Validaciones: `name` es una cadena de 1 a 255 caracteres; `maintenanceIntervalHours` debe ser un entero positivo. Devuelve el tipo creado con `201 Created`.

### `PUT /api/equipment-types/:id`

Cuerpo parcial:

```json
{
  "name": "Excavadora",
  "maintenanceIntervalHours": 600
}
```

Ambos campos son opcionales; si se envían, tienen las mismas validaciones que en `POST`. Devuelve el tipo actualizado con `200 OK`.

### `DELETE /api/equipment-types/:id`

Si el tipo tiene equipos asociados, responde `400 BAD_REQUEST`. Si no, elimina el tipo y responde `204 No Content`.

## Equipos

### `GET /api/equipment`

Query:

| Parámetro | Uso actual |
|---|---|
| `page`, `limit` | Paginación validada con Zod. |
| `equipmentTypeId` | Filtro de tipo, se pasa a Prisma sin validación Zod explícita en esta ruta. |
| `maintenanceRequired` | La ruta compara el texto `true` o `false` con `maintenanceProgress.maintenanceRequired`. |
| `status` | El controlador intenta pasarlo a Prisma, pero el modelo `Equipment` no declara un campo `status`; no se debe asumir que este filtro funciona. |

Devuelve `{ data, pagination }`. Cada elemento incluye el resumen de tipo seleccionado y `maintenanceProgress`:

```json
{
  "hoursSinceMaintenance": 120,
  "progress": 48,
  "maintenanceRequired": false
}
```

La lista se pagina en Prisma antes de aplicar el filtro `maintenanceRequired`; cuando se usa ese filtro, `pagination.total` refleja la longitud filtrada de esa página y no un recuento global independiente.

### `GET /api/equipment/:id`

`id` debe ser UUID. Devuelve el equipo, el tipo relacionado, los últimos diez mantenimientos en orden descendente y `maintenanceProgress`. Si no existe, responde `404 NOT_FOUND`.

### `POST /api/equipment`

Cuerpo:

```json
{
  "code": "TRK-001",
  "equipmentTypeId": "00000000-0000-4000-8000-000000000001",
  "horometer": 1200,
  "appliedIntervalHours": 250
}
```

Validaciones: `code` es una cadena de 1 a 255 caracteres; `equipmentTypeId` debe ser UUID; `horometer` es opcional, entero no negativo y predeterminado a `0`; `appliedIntervalHours` es obligatorio y entero positivo. El tipo debe existir y el código debe ser único. Al crear, `lastMaintenanceHorometer` se inicializa al horómetro. Devuelve el equipo con `maintenanceProgress` y `201 Created`.

### `PUT /api/equipment/:id`

`id` debe ser UUID. Cuerpo parcial: `code`, `equipmentTypeId`, `horometer` y `appliedIntervalHours`; cada propiedad es opcional y debe cumplir las validaciones del esquema de creación. El tipo debe existir si se cambia. No se permite disminuir el horómetro (`400 BAD_REQUEST`). Devuelve el equipo actualizado con `200 OK`.

### `DELETE /api/equipment/:id`

`id` debe ser UUID. Elimina el equipo; el esquema define borrado en cascada para sus mantenimientos. Devuelve `204 No Content` o `404 NOT_FOUND`.

## Mantenimientos

### `GET /api/maintenance`

Query: `page`, `limit`, `equipmentId`, `startDate`, `endDate`. Las fechas se convierten a `Date` para filtrar `performedAt`; el controlador no valida explícitamente el formato de `equipmentId` ni de las fechas.

Devuelve `{ data, pagination }`. Cada elemento incluye una selección relacionada de equipo (`id`, `code` y nombre del tipo).

### `GET /api/maintenance/equipment/:id`

`id` debe ser UUID. Query: `page`, `limit`. Verifica que el equipo exista y devuelve sus registros paginados. Si no existe, responde `404 NOT_FOUND`.

### `POST /api/maintenance/equipment/:id`

`id` debe ser UUID. Cuerpo:

```json
{
  "horometerAtMaintenance": 1450,
  "description": "Cambio de aceite"
}
```

`horometerAtMaintenance` es obligatorio, entero no negativo; `description` es opcional y debe ser una cadena. La lectura no puede ser menor que el horómetro actual ni que el horómetro del último mantenimiento; si incumple una de estas reglas, responde `400 BAD_REQUEST`.

La operación transaccional crea el registro y actualiza en el equipo el horómetro actual, `lastMaintenanceHorometer` y `appliedIntervalHours` al intervalo vigente del tipo. Devuelve `201 Created` con `{ maintenance, equipment }`; el equipo incluye `maintenanceProgress`.

## Errores

Las respuestas de error usan normalmente `{ error, code, details? }`. Los códigos implementados por el middleware son:

| HTTP | `code` | Situación |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Error de validación de Zod. |
| `400` | `BAD_REQUEST` | Regla de negocio incumplida o error de clave foránea. |
| `404` | `NOT_FOUND` | Recurso ausente o registro eliminado/no encontrado por Prisma. |
| `409` | `CONFLICT` | Valor duplicado para un campo único. |
| `500` | `INTERNAL_ERROR` | Error no reconocido. |

La respuesta para una ruta Express no registrada es `404` con `{ "error": "Not found" }`, sin `code`. Las respuestas `204` no contienen cuerpo.

Las reglas de traducción de errores están en [`src/middleware/errorHandler.ts`](../apps/backend/src/middleware/errorHandler.ts); las validaciones, en [`src/utils/validation.ts`](../apps/backend/src/utils/validation.ts).
