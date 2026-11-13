# Pruebas y verificación

## Pruebas funcionales manuales

El desarrollador confirmó que se ejecutaron manualmente las cinco pruebas siguientes y que todas funcionaron correctamente. El repositorio no incluye una bitácora detallada de pasos, fecha o entorno; por ello, el resultado se registra al nivel de cada módulo y no se atribuyen casos específicos que no fueron reportados.

| Área | Alcance funcional | Resultado |
|---|---|---|
| **Equipment Types** | Administración de tipos de equipo y sus intervalos de mantenimiento. | Ejecutada; funcionamiento correcto, confirmado por el desarrollador. |
| **Equipment** | Gestión y consulta de equipos, incluidos horómetros y tipos asociados. | Ejecutada; funcionamiento correcto, confirmado por el desarrollador. |
| **Maintenance** | Registro y consulta de mantenimientos de equipos. | Ejecutada; funcionamiento correcto, confirmado por el desarrollador. |
| **Dashboard** | Consulta del resumen de equipos, ciclos de mantenimiento y actividad reciente. | Ejecutada; funcionamiento correcto, confirmado por el desarrollador. |
| **Persistencia** | Comprobación manual de persistencia de los datos de la aplicación. | Ejecutada; funcionamiento correcto, confirmado por el desarrollador. |

Estas pruebas funcionales fueron verificaciones manuales del desarrollador; no son una suite automatizada ni fueron ejecutadas por el asistente de IA.

## Build y comprobación de tipos

Build y typecheck son comprobaciones técnicas separadas de las pruebas funcionales anteriores. Su aprobación no sustituye la verificación de flujos en la interfaz.

```bash
npm run build
npm run typecheck
```

En el repositorio, `npm run build` delega a todos los workspaces: backend ejecuta `prisma generate` y `tsc`; frontend ejecuta `tsc` y `vite build`. `npm run typecheck` ejecuta `tsc --noEmit` en backend y frontend. No hay un comando `test` declarado en los `package.json` raíz o de los workspaces ni archivos `*.test.*` o `*.spec.*`.

## Registro de futuras ejecuciones

Para registrar nuevas ejecuciones funcionales, anotar fecha, entorno, pasos realizados y resultado observado. Use una base de desarrollo o pruebas, no producción. `GET /health` comprueba conectividad con PostgreSQL, pero no sustituye las pruebas funcionales de los módulos.
