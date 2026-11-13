# Despliegue automatizado

El comando `npm run deploy` coordina el build y los despliegues del backend en Railway y del frontend en Vercel. No se ejecutó ningún despliegue al añadir este flujo.

## Requisitos

- Node.js 20 o superior y npm.
- Railway CLI (`npm install --global @railway/cli`) y Vercel CLI (`npm install --global vercel`).
- Un token de proyecto de Railway y un token de Vercel con acceso al servicio y proyecto indicados.
- Variables de entorno de producción configuradas en Railway y Vercel.

## Configuración explícita

Antes de ejecutar el comando, establece en la sesión de terminal:

| Variable local | Propósito |
|---|---|
| `RAILWAY_TOKEN` | Token de Railway; debe permitir acceso al proyecto configurado. |
| `RAILWAY_PROJECT_ID` | Proyecto Railway que se desplegará. |
| `RAILWAY_ENVIRONMENT_ID` | Entorno Railway objetivo. |
| `RAILWAY_SERVICE_ID` | Servicio Railway del backend. |
| `VERCEL_TOKEN` | Token de Vercel con acceso al proyecto configurado. |
| `VERCEL_ORG_ID` | Organización o equipo propietario del proyecto. |
| `VERCEL_PROJECT_ID` | Proyecto Vercel del frontend. |
| `VERCEL_TARGET_ENVIRONMENT` | Debe establecerse explícitamente como `production`. |
| `MINETRACK_BACKEND_URL` | Origen HTTPS público del backend, sin ruta; por ejemplo `https://minetrackbackend-production.up.railway.app`. |
| `MINETRACK_FRONTEND_URL` | Origen HTTPS público del frontend, sin ruta; por ejemplo `https://frontend-five-pied-58.vercel.app`. |

Ejemplo de configuración en PowerShell (sustituye los marcadores por valores propios; no guardes tokens en Git):

```powershell
$env:RAILWAY_TOKEN = '<token de Railway>'
$env:RAILWAY_PROJECT_ID = '<id del proyecto>'
$env:RAILWAY_ENVIRONMENT_ID = '<id del entorno>'
$env:RAILWAY_SERVICE_ID = '<id del servicio backend>'
$env:VERCEL_TOKEN = '<token de Vercel>'
$env:VERCEL_ORG_ID = '<id de la organización>'
$env:VERCEL_PROJECT_ID = '<id del proyecto frontend>'
$env:VERCEL_TARGET_ENVIRONMENT = 'production'
$env:MINETRACK_BACKEND_URL = 'https://minetrackbackend-production.up.railway.app'
$env:MINETRACK_FRONTEND_URL = 'https://frontend-five-pied-58.vercel.app'

npm run deploy
```

Los valores de ejemplo de URL corresponden a los endpoints públicos observados durante la implementación. Los IDs y tokens no se detectan ni se eligen automáticamente.

## Variables de los proveedores

El preflight consulta las variables del servicio y del entorno explícitos de Railway, sin imprimir sus valores. Exige:

- `DATABASE_URL` y `DIRECT_URL`.
- `FRONTEND_URL` igual a `MINETRACK_FRONTEND_URL`.
- `NODE_ENV=production`.

En Vercel, exige que `VITE_API_URL` del entorno `production` sea exactamente `${MINETRACK_BACKEND_URL}/api`. La variable `PORT` la proporciona Railway y no se fija desde el script.

Si falta alguna variable o no coincide, el flujo se detiene antes de migrar o desplegar. Configura los valores requeridos en el panel del proveedor antes de volver a intentarlo; el script no crea, modifica ni imprime variables remotas.

## Orden y seguridad

1. Valida configuración local, versiones de Node.js/npm/CLIs, acceso de lectura a las variables remotas de ambos proveedores, que el dominio del backend corresponda al proyecto/entorno/servicio Railway explícitos y que el dominio frontend esté verificado en el proyecto Vercel indicado. Vercel se consulta con el scope y proyecto configurados.
2. Ejecuta `npm run build` para ambos workspaces, usando la URL API especificada para el build local del frontend.
3. Inspecciona la tabla `_prisma_migrations`, los checksums y las migraciones pendientes. Detiene el flujo ante un baseline ambiguo, una migración incompleta o revertida, diferencias de historial/checksum u operaciones SQL no permitidas.
4. Si hay migraciones pendientes aprobables por el análisis conservador, ejecuta únicamente `prisma migrate deploy`.
5. Despliega el backend con `railway up --detach --json`, obtiene su ID y espera que ese mismo ID figure como `SUCCESS` en `railway deployment list --json`. Después espera `/health` con HTTP 200, `status: ok` y `database.connected: true`.
6. Despliega el frontend con Vercel CLI en producción. Obtiene el ID y URL de la salida JSON, inspecciona ese mismo ID con `vercel inspect --json` y exige estado `READY`, destino `production` y el alias configurado asociado al deployment. Finalmente comprueba HTML tanto en la URL de ese deployment como en el alias configurado, y vuelve a comprobar la salud del backend.

No se ejecutan `prisma migrate dev`, `prisma db push` ni rollback automático. El análisis permite únicamente SQL aditivo conocido (creación de tablas, índices, tipos y restricciones; columnas nuevas solo si son anulables y sin valor por defecto). Operaciones desconocidas, destructivas o que cambien datos requieren revisión manual. Un fallo detiene las etapas siguientes y devuelve código distinto de cero; las etapas remotas ya completadas no se revierten automáticamente.

El build y el análisis local no modifican datos. Ejecutar nuevamente el comando no reaplica migraciones ya registradas, aunque Railway y Vercel pueden crear un nuevo despliegue en cada ejecución.

### Límite de validación de permisos

Las verificaciones de preflight son de lectura: confirman acceso a la configuración del proyecto/servicio y a los valores requeridos, pero **no prueban permisos de escritura** para migraciones ni despliegues. No hay una prueba de permisos sin realizar una operación mutante real. Por eso, la autorización efectiva solo se confirma cuando se intenta `prisma migrate deploy` o el despliegue correspondiente; cualquier fallo se informa en esa etapa y detiene las posteriores. El script no ejecuta operaciones de prueba ni rollback para anticipar permisos.

Las comprobaciones de identidad usan el ID devuelto por la propia operación de despliegue y consultan ese mismo ID en la CLI del proveedor. Si la CLI no devuelve una identidad verificable, o si no se puede asociar el alias de producción al deployment nuevo, el script termina con error y no declara el servicio verificado.
