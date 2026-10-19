# Desarrollo, producción y Docker

## Recomendación para la demo web

Desplegar una sola instancia de una aplicación Node.js en un proveedor de contenedores/web services con dominio HTTPS y disco persistente. Node sirve la API y el build Angular. Es la opción más simple para una demo: un enlace, una configuración, un proceso, una base SQLite y sin CORS en producción.

Como referencia actual, Render ofrece web service con Docker, variable `PORT`, health check, HTTPS/dominio y disco persistente; su disco es de una sola instancia, lo cual coincide con la limitación de SQLite. No es una elección irrevocable de proveedor: antes de publicar se compararán costo, región, cuenta disponible y retención de disco.

## Producción/demo

| Aspecto | Decisión recomendada |
| --- | --- |
| Proceso | Un Node.js que sirve `/api`, `/health` y Angular compilado. |
| Dominio | Uno, HTTPS gestionado por el proveedor; `PUBLIC_APP_URL` usa ese dominio para QR y enlaces verificables. |
| Puerto | Escuchar `process.env.PORT` en `0.0.0.0`; no fijar 3000 en producción. |
| SQLite | `DB_PATH=/var/data/essalud-demo.sqlite` en volumen persistente local al contenedor (`DATABASE_PATH` se acepta como alias). |
| Escala | Una instancia. No escalar horizontalmente ni compartir el archivo por red. |
| Health | `GET /health` responde disponibilidad del proceso y conexión SQLite, sin PII. |
| Logs | Salida estructurada estándar; no almacenar DNI, planilla, tokens ni secretos. |
| Reinicio | El proveedor reinicia el proceso; el volumen preserva datos. Aplicar migración idempotente al inicio controlado. |
| Backup | Exportar/copia consistente antes de cambios importantes; snapshot del proveedor ayuda pero no reemplaza un procedimiento de backup. |
| Reset | Ejecutar la acción explícita documentada antes de una presentación; nunca al boot. |

El riesgo aceptado es una corta interrupción al desplegar con disco persistente. Para una demo programada es preferible a introducir infraestructura de base de datos externa.

## Estrategia Docker futura

No crear Dockerfile todavía. Cuando se implemente, usar un único Dockerfile multi-stage:

1. **Dependencias/build:** instalar de forma reproducible (`npm ci`), compilar Angular y backend desde el root.
2. **Runtime:** imagen Node mínima con dependencias de producción, build backend y `frontend/dist` copiados; proceso no root cuando sea compatible.
3. **Inicio:** inicializar/migrar SQLite de forma idempotente, confirmar que existe `DATABASE_PATH` y ejecutar Node.
4. **Volumen:** montar solo `/var/data`; el código y build permanecen inmutables.
5. **Healthcheck:** consultar `/health` localmente y dejar que el proveedor haga el check externo.

`.dockerignore` futuro excluye `node_modules`, builds locales, `.env*` salvo ejemplos, bases `.sqlite*`, logs, cobertura, archivos de IDE y documentación no necesaria para el build. No usar Docker Compose para producción. En local será opcional: `npm start` continúa siendo el camino preferido; Docker valida paridad antes del despliegue.

## Operación de una exposición

1. Ejecutar `demo:reset` intencionalmente y validar el dataset/recorridos.
2. Verificar `/health`, URL pública, HTTPS y cuenta de trabajador/bancos ficticios.
3. Abrir los recorridos en sesión limpia e intentar el escenario de aislamiento entre bancos.
4. Conservar una copia de la base recién reseteada y un plan de restauración manual simple.
5. Evitar redeploys durante la exposición salvo incidencia; un disco persistente puede impedir despliegue sin corte.

No se crean hosting, Dockerfile, volumen, credenciales ni despliegue en esta fase.
