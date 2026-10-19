# Guía de continuación para agentes

## Propósito y límites

Este repositorio es una demostración ejecutiva de EsSalud, no un producto productivo ni una réplica literal de SISCON. Integra visualmente tres superficies en una sola aplicación: una entrada mínima de SOMOS EsSalud, el Sistema de Préstamos y SAP Web de consulta de planillas/capacidad. Toda la información de la demo debe ser ficticia.

Antes de implementar, lea todos los documentos de `docs/`. Ellos son la fuente de verdad de este proyecto. El repositorio histórico `David528785502/siscon` es una demo histórica secundaria, no una fuente de verdad: sus fórmulas, esquemas, UX, nombres y código no se copian ni se adoptan sin una decisión documentada.

## Orden recomendado para la siguiente sesión

1. Leer `docs/PROJECT.md`, `docs/BUSINESS_RULES.md`, `docs/LOAN_FLOW.md`, `docs/STATE_MODEL.md` y `docs/OPEN_QUESTIONS.md`.
2. Crear el esqueleto único acordado en `docs/ARCHITECTURE.md` y los datos ficticios definidos en `docs/DEMO_SCENARIOS.md`.
3. Implementar primero el design system y el catálogo `/dev/ui`; luego autenticación simulada, autorización de backend y rutas; finalmente los recorridos de demo por fases. Leer antes `docs/RESEARCH.md` y `docs/DEPLOYMENT.md`.
4. Mantener las decisiones y pendientes actualizados en `docs/DECISIONS.md` y `docs/OPEN_QUESTIONS.md` cuando se confirme información nueva.

## Reglas obligatorias de implementación

- Stack único: Angular en `frontend/`, Node.js en `backend/`, SQLite en `database/`. No crear frontend separado, microservicios ni varios repositorios.
- No usar datos personales, entidades, credenciales o nombres reales. Todo seed, constancia y ejemplo será ficticio.
- Las reglas de negocio viven en servicios de dominio del backend y son verificadas por el backend. Angular solo presenta información y solicita acciones.
- No confiar solo en guards del frontend: cada API debe autenticar, autorizar por rol y validar la organización del banco.
- Usar nombres descriptivos y enums, por ejemplo `NUEVO`, `AMPLIACION`, `COMPRA_DEUDA`; nunca códigos numéricos mágicos para reglas o estados.
- No hardcodear porcentajes, fechas de apertura/cierre, vigencias, listas de conceptos ni reglas administrativas. Persistirlos como parámetros o versiones de regla cuando corresponda.
- Una consulta de capacidad no crea solicitud, no reserva capacidad y no bloquea al trabajador.
- La solicitud formal la crea el trabajador para un banco. Desde su creación bloquea otra solicitud incompatible mientras se encuentre en un estado bloqueante. La propuesta es posterior y la crea el banco; no confundirla con la solicitud.
- No implementar simulador de préstamo: EsSalud muestra/autoriza capacidad; el banco define monto, plazo, tasa y cuota.
- Implementar concurrencia e idempotencia según `docs/STATE_MODEL.md`; una URL o botón no puede eludir la separación de bancos.
- Las constancias verificables exponen el mínimo de información descrito en `docs/LOAN_FLOW.md`; no revelar detalle de planilla, AFP, judiciales u otros descuentos privados.
- Mantener dinero en unidades enteras de céntimos en persistencia y operaciones de dominio. Formatear como moneda solo en la interfaz.
- Registrar eventos de auditoría inmutables para cambios de estado, parámetros y accesos sensibles.
- No usar emojis en la aplicación, botones, menús, alertas, títulos, placeholders, datos demo ni documentación de producto. Usar iconografía profesional cuando sea necesaria.

## Calidad y estructura

- Ningún archivo de código puede superar 500 líneas: es un límite absoluto para TypeScript, JavaScript, HTML, SCSS/CSS, controladores, servicios, componentes y scripts. El objetivo habitual es menos de 300 líneas; al aproximarse a 350–400 líneas se evalúa y ejecuta la refactorización.
- No crear componentes, controladores ni servicios gigantes. Extraer responsabilidades, utilidades y componentes reutilizables.
- No duplicar estilos, tablas, formularios, botones de retorno o layouts. Si existe un componente o patrón compartido, se reutiliza: tokens para color/espaciado, `DataTable` para tablas, `StatusBadge` para estados, `PageHeader` para encabezados, `Button` y `BackButton` para acciones/navegación. Aplicar `docs/UI_GUIDELINES.md` y `docs/COMPONENT_CATALOG.md`.
- Cada transición de estado debe ser validada en una transacción de SQLite y generar auditoría. Agregar pruebas significativas para reglas, autorización y concurrencia.
- Los cambios funcionales que resuelvan un pendiente deben actualizar los documentos afectados y retirar la pregunta de `OPEN_QUESTIONS.md` solo con evidencia.

## Desarrollo local y procesos

- Antes de ejecutar `npm start`, ejecutar o revisar `npm run dev:status`. Si API y frontend ya están saludables, no iniciar una segunda instancia.
- Usar exclusivamente los comandos del proyecto para desarrollo: `npm start`, `npm run dev:status` y `npm run dev:stop`. No cambiar puertos automáticamente ni aceptar el puerto alternativo que sugiera Angular.
- No usar `taskkill /IM node.exe /F`, `Stop-Process -Name node` ni equivalentes indiscriminados. `dev:stop` solo puede finalizar PIDs cuya ruta/argumentos o registro local los vinculen verificablemente con este repositorio.
- Si un puerto pertenece a otro proyecto o no puede verificarse, informar el conflicto y no detenerlo. Nunca cerrar procesos que ya existían antes de la tarea sin una necesidad demostrada.
- Cuando un agente inicie servidores para pruebas, capturas o navegación, debe detener únicamente los que haya iniciado antes de finalizar, salvo que el usuario haya pedido mantenerlos. No dejar procesos ni utilidades en segundo plano sin documentarlo.
- El lanzador local maneja `Ctrl+C`/`SIGTERM` para cerrar API y Angular. Tras una interrupción, comprobar `npm run dev:status` antes de reiniciar.

## Definiciones que no se deben confundir

- **Consulta de capacidad:** lectura informativa, sin bloqueo.
- **Solicitud formal:** registro iniciado por el trabajador y dirigido a un banco; desde `CREADA` reserva exclusividad según el modelo de estados.
- **Propuesta:** condiciones de crédito que registra el banco para una solicitud; EsSalud no las calcula ni decide.
- **Operación autorizada:** resultado de solicitud aceptada y validada que puede emitir constancia; no equivale a préstamo vigente.
- **Préstamo vigente:** préstamo ya firmado y activo para descuentos; no es lo mismo que una operación.
- **Préstamo finalizado/pagado:** préstamo terminado; su liberación de capacidad depende del cierre administrativo del período.
- **SAP Web:** fuente conceptual de planillas/capacidad, con SQLite ficticio en la demo y adaptador reemplazable por SAP real.

## Documentos de referencia

- Alcance y no alcance: `docs/PROJECT.md`
- AS-IS e historial: `docs/AS_IS.md`
- Flujo propuesto: `docs/TO_BE.md`, `docs/LOAN_FLOW.md`
- Reglas y parámetros: `docs/BUSINESS_RULES.md`
- Arquitectura y datos: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ROUTES.md`
- Estados y concurrencia: `docs/STATE_MODEL.md`
- Diseño visual: `docs/UI_GUIDELINES.md`, `docs/COMPONENT_CATALOG.md`
- Guion y datos: `docs/DEMO_SCENARIOS.md`
- Decisiones y dudas: `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md`
- Investigación externa: `docs/RESEARCH.md`
