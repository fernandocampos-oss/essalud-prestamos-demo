# Decisiones de arquitectura y producto

| ID | Decisión | Razón | Estado |
| --- | --- | --- | --- |
| ADR-01 | Un monolito de demo: Angular + Node + SQLite en un repositorio y despliegue. | El alcance es ejecutivo y de corto plazo; reduce complejidad operacional. | Aprobada por requerimiento. |
| ADR-02 | SOMOS es una entrada visual mínima, no un sistema a reconstruir. | Mantiene el foco en Préstamos y SAP Web. | Aprobada por requerimiento. |
| ADR-03 | La consulta de capacidad es independiente de cualquier operación. | Evita bloqueos y representa el flujo futuro descrito. | Aprobada por requerimiento. |
| ADR-04 | No habrá simulador de monto/plazo/tasa/cuota de EsSalud. | La evaluación crediticia corresponde al banco. | Aprobada por requerimiento. |
| ADR-05 | Capacidad inicial con parámetro de 35% y regla versionada. | El histórico usa 40%/50% contradictorios; se requiere administración. | Aprobada parcialmente; fórmula completa pendiente. |
| ADR-06 | SAP Web se implementará detrás de un adaptador de origen de planilla. | SQLite ficticio puede ser reemplazado por SAP/API sin reescribir el dominio. | Aprobada por diseño. |
| ADR-07 | Solicitudes individuales y estados descriptivos, no lotes/TXT ni códigos mágicos. | La meta elimina la validación inicial por archivos y mejora trazabilidad. | Aprobada por diseño. |
| ADR-08 | Constancia como entidad verificable con código opaco/URL/QR futuro. | Permite estado vivo, expiración por período y exposición mínima. | Aprobada por diseño; campos finales pendientes. |
| ADR-09 | Aislamiento de bancos aplicado por backend desde organización de sesión. | Un guard frontend o una URL no constituyen autorización. | Aprobada por requerimiento. |
| ADR-10 | Exclusividad desde `CREADA` de la solicitud formal creada por trabajador. | Es la regla confirmada y evita solicitudes simultáneas incompatibles desde el inicio. | Aprobada por requerimiento. |
| ADR-11 | SISCON es referencia histórica secundaria, no fuente de verdad. | Contiene arquitectura, UX, listas y fórmulas históricas que no deben condicionar el diseño nuevo. | Aprobada por requerimiento. |
| ADR-12 | Separar `loan_request`, `loan_proposal`, `authorization` y `loan`. | Hace explícito quién crea cada hito, cuándo bloquea y qué ocurre tras la firma. | Aprobada por diseño. |
| ADR-13 | Constancia con código opaco + QR/URL y verificación online mínima; PDF privado descargable solo para autorizaciones vigentes. | El PDF facilita la demostración documental sin sustituir la verificación online ni crear una nueva autorización. Lleva identificación visible de demostración y reutiliza el mismo código/QR. | Implementada. |
| ADR-14 | Producción demo: una instancia Node sirve API + Angular; SQLite en volumen persistente local. | Es suficiente para una presentación y respeta las limitaciones de SQLite sin infraestructura extra. | Aprobada por diseño. |
| ADR-15 | La regla demostrativa de capacidad usa `(ingreso neto del snapshot × porcentaje parametrizable) − cuotas vigentes`; los ingresos variables seed participan solo como dato demostrativo. | Permite trazabilidad, escenarios de baja capacidad y revalidación sin afirmar una fórmula institucional pendiente. | Implementada, rotulada como demostrativa. |
| ADR-16 | El catálogo demo muestra Banco de Crédito del Perú (BCP), BBVA Perú e Interbank solo como nombres textuales de referencia; los identificadores internos de organización se conservan estables. | La presentación requiere entidades reconocibles y se autorizó expresamente su uso nominal. No se incorporan logotipos, integraciones, convenios ni afirmaciones de relación comercial. | Implementada. |
| ADR-17 | La demo usa `node:sqlite` de Node 24 para el archivo SQLite. | Evita una cadena de compilación nativa adicional en el entorno de demo sin alterar el modelo SQLite, transacciones ni el despliegue de instancia única. | Implementada. |
| ADR-18 | El desarrollo local se inicia con un lanzador propio que reserva 3000/4200, registra procesos y los detiene solo cuando puede verificar su pertenencia al repositorio. | Evita instancias Angular/Node huérfanas y conflictos `EADDRINUSE` sin cerrar otros proyectos Node del equipo. | Implementada. |
| ADR-19 | El catálogo bancario se migra de forma idempotente al inicio y mediante `demo:migrate-catalog`, sin requerir reset. | Las bases locales existentes deben reflejar los nombres aprobados sin eliminar solicitudes ni cambiar los IDs usados para aislamiento. | Implementada. |
| ADR-20 | La constancia informativa de capacidad se registra como documento independiente de una autorización. | El trabajador puede acreditar el importe mensual registrado antes de iniciar una solicitud, sin elegir banco, reservar capacidad ni bloquear el flujo. Conserva importe, período y fecha de emisión como evidencia histórica. Su vigencia demostrativa inicial se obtiene del parámetro `constancia.capacidad.vigencia_regla=FIN_PERIODO`, se persiste al emitir y no representa una política institucional. | Implementada para la demo. |
| ADR-21 | Las URL públicas de QR y constancias usan `PUBLIC_APP_URL`, no cabeceras HTTP ni el puerto del backend. | En desarrollo Angular funciona en `http://localhost:4200`; en producción Angular y Node comparten el dominio HTTPS. El alias heredado `APP_BASE_URL` se conserva solo para compatibilidad. | Implementada para la demo. |

## Diferencias registradas con el histórico

SISCON documenta capacidad con 40% y 50% en fuentes distintas, además de conceptos/rangos y fórmulas no verificables en archivos FoxPro compilados. La propuesta nueva parte de 35% parametrizable, catálogos versionados, SQLite ficticio y una arquitectura única. Ningún código, fórmula, UX, modelo o tabla histórica se adopta implícitamente.
