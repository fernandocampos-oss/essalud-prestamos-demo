# Arquitectura de la demo

## Decisión central

Un solo proyecto y un solo despliegue lógico: Angular se compila a archivos estáticos y Node.js entrega tanto la API como ese build bajo el mismo dominio. SQLite contiene solo datos ficticios. No habrá microservicios, frontends independientes, proxy adicional ni CORS en producción.

```text
Internet / HTTPS
        │ único dominio
Node.js
  ├─ /api/*                 API y autorización
  ├─ /health                health check sin datos sensibles
  ├─ /prestamos/verificar/* verificación pública mínima
  └─ Angular compilado      resto de rutas SPA
        │ volumen local/persistente
SQLite ficticio
```

## Capas y módulos

```text
frontend/src/app/
  core/                       sesión, HTTP, guards, layouts, configuración
  shared/ui/                  tokens y componentes de catálogo
  features/somos/             entrada visual mínima
  features/prestamos/
    trabajador/               capacidad, solicitudes, propuestas
    banco/                    bandeja, asignación, evaluación
    administracion/           períodos, parámetros, seguimiento
    verificacion/             constancia pública
  features/sap-web/           trabajador, planilla, capacidad
  features/dev-ui/            catálogo /dev/ui

backend/src/
  http/                       rutas, DTOs, validación, middleware
  modules/identity/           sesión demostrativa, roles, organización
  modules/payroll/            puerto de datos, períodos, snapshots
  modules/capacity/           reglas y resultados versionados
  modules/loan-requests/      solicitud, propuesta, autorización, préstamo
  modules/certificates/       código, verificación, revocación
  modules/administration/     parámetros y cierre
  modules/audit/              eventos inmutables
  platform/                   SQLite, reloj, IDs, entorno, logging
  adapters/payroll/           SQLite demo; futuro SAP/API
database/                     migraciones, seeds y plantillas ficticias
```

Las rutas HTTP validan entrada y delegan. Las reglas, transiciones, autorización contextual y transacciones viven en servicios de dominio. Los repositorios no deciden reglas.

## Frontend único y modular

La separación se hace por features con carga diferida y layouts, no por aplicaciones Angular. `core` es singleton; `shared/ui` no conoce dominio; cada feature mantiene páginas, fachada y componentes específicos. Los componentes básicos se consultan primero en `/dev/ui`. Ninguna página crea su propia variante de tabla, botón, retorno, badge, modal, tokens o header si el catálogo ya cubre la necesidad.

## API, seguridad y concurrencia

- Todas las APIs privadas requieren sesión simulada, rol y autorización de objeto/organización en backend.
- La organización del banco se toma de la sesión, jamás de la URL o cuerpo del cliente.
- Los DTOs se proyectan por audiencia; no se filtran datos solo en Angular.
- Toda mutación sensible incluye `Idempotency-Key`, control de versión y evento de auditoría.
- La creación de solicitud usa una transacción SQLite breve que valida y reserva exclusividad desde `CREADA`.
- Configurar SQLite local con claves foráneas, WAL, `busy_timeout`, manejo de `SQLITE_BUSY` y una sola instancia de aplicación en producción. WAL no se usa sobre un filesystem de red.
- Dinero: céntimos enteros. Fechas: ISO y zona declarada. Estados/tipos: enums de texto descriptivo.

## Adaptador de planilla

El dominio conoce una interfaz interna `PayrollDataSource` para buscar trabajador, obtener período/snapshot y conceptos. `SqliteDemoPayrollDataSource` será la implementación inicial. Un conector SAP futuro reemplaza el adaptador, no el frontend ni los servicios de capacidad.

## Entornos y configuración

Solo `development` y `production`.

| Variable futura | Desarrollo | Producción | Propósito |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | Perfil de ejecución/logs. |
| `PORT` | Puerto local configurable | Valor entregado por proveedor | Node enlaza `0.0.0.0`. |
| `DB_PATH` | Ruta local ignorada por Git | Ruta del volumen persistente | Archivo SQLite. `DATABASE_PATH` se acepta como alias de compatibilidad. |
| `SESSION_SECRET` | Valor local en `.env` | Secreto del proveedor | Firma de sesión simulada. |
| `PUBLIC_APP_URL` | `http://localhost:4200` | URL HTTPS pública | Construir enlaces/QR. `APP_BASE_URL` se acepta solo como alias de compatibilidad. |
| `DEMO_MODE` | `true` | `true` mientras sea demo | Habilita cuentas/seeds demostrativos. |
| `LOG_LEVEL` | `debug` | `info` | Nivel de logging sin PII. |
| `CORS_ORIGIN` | Origen Angular local | Vacío/mismo origen | Solo desarrollo separado. |

Crear después `.env.example` sin valores sensibles; `.env` y SQLite quedan ignorados por Git. La configuración se valida al iniciar y nunca se devuelve por API.

## Desarrollo local futuro

El `package.json` raíz coordina dependencias y scripts: `npm install`, `npm start`, `npm run dev:status`, `npm run dev:stop`, `npm run build`, `npm test`, `npm run demo:reset`. En desarrollo, el lanzador reserva los puertos fijos 3000/API y 4200/Angular, registra únicamente sus procesos y evita una segunda instancia; el detalle operativo está en `LOCAL_DEVELOPMENT.md`. Angular usa proxy local y Node puede exponer CORS limitado al origen exacto; en producción ambos comparten origen y CORS no es necesario.

`demo:reset` será un comando explícito y visible: detiene acceso de escritura, reemplaza la base de demo por una plantilla limpia/versionada, ejecuta migraciones/seeds ficticios, valida escenarios y registra el reset. Nunca se ejecuta automáticamente en producción al reiniciar; se usa conscientemente antes de una exposición.
