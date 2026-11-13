# Uso de inteligencia artificial

## Uso de IA durante el desarrollo

Se utilizó un asistente de inteligencia artificial como herramienta de apoyo de ingeniería durante el desarrollo de MineTrack, principalmente para:

- Inspeccionar la implementación existente y contrastar la documentación con las rutas, controladores, validaciones, tipos y esquema de Prisma.
- Diagnosticar y corregir problemas estructurales y de TypeScript en `MaintenancePage.tsx`.
- Centralizar la instancia de `PrismaClient` para reutilizarla desde los distintos módulos del backend.
- Apoyar la revisión técnica, depuración y preparación de la documentación del proyecto.

La IA participó en tareas concretas de implementación y revisión. Sin embargo, no se atribuye a esta herramienta la creación original del proyecto ni las decisiones funcionales y técnicas tomadas durante su desarrollo.

## Verificación y límites

- Los cambios de código fueron verificados mediante `npm run build` y `npm run typecheck`.
- Se realizaron comprobaciones funcionales manuales de Equipment Types, Equipment, Maintenance, Dashboard y persistencia de datos. El desarrollador confirmó el funcionamiento correcto de los cinco apartados.
- Estas comprobaciones manuales no constituyen una suite automatizada de pruebas.
- La IA se utilizó como apoyo para analizar y revisar el código, pero la validación funcional de la aplicación fue realizada por el desarrollador.
- La documentación debe mantenerse actualizada cuando cambien los contratos de API, el comportamiento de la aplicación o la infraestructura de despliegue.

El uso de inteligencia artificial complementó el proceso de desarrollo, sin sustituir la revisión técnica ni la validación del funcionamiento de la aplicación.