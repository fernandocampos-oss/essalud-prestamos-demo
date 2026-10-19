# Investigación externa de segunda fase

**Fecha de consulta:** 17 de octubre de 2026.  
**Uso de estas fuentes:** evidencia para mejorar el diseño de una demo. No reemplazan las reglas confirmadas de EsSalud ni prueban que una norma extranjera sea aplicable al proyecto.

## Hallazgos relevantes

| Área | Patrón observado | Decisión para la demo |
| --- | --- | --- |
| Crédito por planilla | El crédito se contrata con una institución financiera, pero el descuento posterior se integra a una competencia/período de nómina. | Separar solicitud/autorización de la aplicación externa del descuento. |
| Solicitud del trabajador | El programa brasileño Crédito do Trabalhador permite que el trabajador solicite propuestas y luego reciba/seleccione ofertas de entidades financieras. | El trabajador crea solicitud dirigida a un banco; el banco luego trabaja la propuesta en una bandeja. |
| Margen/capacidad | Los límites y definición de remuneración disponible cambian por jurisdicción/producto y período. | Mantener 35% como parámetro confirmado del proyecto; no importar fórmulas legales brasileñas ni históricas. |
| Períodos | Los procesos de descuento usan ventanas de competencia, notificaciones y fechas de referencia. | Modelar `PREPARACION`, `ABIERTO`, `RESTRINGIDO`, `CERRADO`, sin copiar calendarios externos. |
| Duplicados | APIs financieras usan claves de idempotencia para reintentos seguros; la base protege invariantes simultáneas. | Clave idempotente + transacción + restricción única de solicitud bloqueante. |
| Multibanco | La autorización debe unir sujeto, acción, objeto y organización; no basta ocultar controles en frontend. | Filtro de banco y autorización de objeto en cada consulta/mutación del backend. |
| Constancias | Entidades públicas peruanas usan códigos y verificación web/QR; los datos de una credencial pueden revelar PII. | Código opaco + QR con URL + verificación online mínima; PDF opcional y posterior. |
| SQLite en internet | WAL permite lectores concurrentes, pero un solo escritor y no sirve sobre filesystem de red. | Una sola instancia, volumen local persistente, transacciones breves y manejo de contención. |
| Despliegue demo | Un servicio web con Docker, disco persistente, `PORT`, health check y HTTPS reduce piezas. | Un único contenedor Node que sirva API y Angular, sin proxy separado. |

## 1. Préstamos por convenio y descuento por planilla

### Perú

La SBS reconoce préstamos no revolventes bajo convenios de descuento por planilla dentro de las categorías de crédito de consumo. Documentación regulatoria histórica sobre convenios elegibles ilustra que la relación cuota/ingreso y la prioridad de descuentos son materias propias del convenio y de la evaluación financiera, no una fórmula que pueda inferirse de una sola pantalla. La SBS también recuerda que el historial de crédito se usa en la evaluación de capacidad de pago.

**Aprendizaje:** EsSalud puede producir una capacidad/autoridad operativa, pero el banco conserva su evaluación y condiciones. La demo debe evitar presentar el 35% como límite regulatorio universal peruano; es un parámetro confirmado para la propuesta de este proyecto.

**Adopción:** separación entre capacidad EsSalud y propuesta del banco; catálogo/regla versionados.  
**No adopción:** porcentaje, condiciones de elegibilidad o documentación bancaria de las fuentes como política EsSalud.

Fuentes: [SBS: clasificación de créditos de consumo](https://www.sbs.gob.pe/Portals/0/jer/REGUL_SISFIN_BFO/2026/Cap_IV%20Vig_2026-01%20%28Res.%20774-2025%29.pdf), [SBS: convenio de descuento por planilla elegible](https://intranet2.sbs.gob.pe/dv_int_cn/968/v1.0/Adjuntos/14353-2009.r.pdf), [SBS: historial crediticio](https://www.sbs.gob.pe/usuarios/aprende-con-la-sbs/el-historial-crediticio).

### Brasil como referencia de proceso maduro

El Ministerio de Trabajo brasileño describe Crédito do Trabalhador como un canal en que trabajadores solicitan crédito a instituciones habilitadas. CAIXA explica un recorrido donde el trabajador solicita propuestas mediante la aplicación oficial, recibe propuestas de entidades y elige una. El manual del empleador separa el contrato ya registrado de la competencia posterior de descuento, con aviso, consulta de datos y escritura de nómina. También contempla descuentos parciales cuando la remuneración disponible no alcanza.

**Aprendizaje:** la secuencia trabajador → solicitud → propuesta banco → aceptación → registro/autorización → proceso de planilla posterior es creíble y fácil de explicar. Un período administrativo visible aporta claridad. La capacidad puede cambiar; por ello una autorización debe guardar snapshot/regla/período y tener estado vigente o revocado.

**Adopción:** bandeja del banco para solicitudes creadas por trabajador, separación de eventos posteriores de planilla, snapshot de capacidad y estados verificables.  
**No adopción:** legislación, calendario 21–20, integración eSocial/FGTS, 35% legal brasileño, datos compartidos o reglas de contratación de Brasil.

Fuentes: [Ministerio de Trabajo de Brasil: Crédito do Trabalhador](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/credito-do-trabalhador/), [CAIXA: recorrido de solicitud de propuestas](https://www.caixa.gov.br/voce/credito-financiamento/emprestimo/consignado/credito-do-trabalhador/paginas/default.aspx), [Manual operacional del empleador, versión 2.1](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/credito-do-trabalhador/empregador/manual-operacional-do-empregador-credito-do-trabalhador-v2-16-05-25.pdf).

## 2. Originación, duplicados y bandejas

No se encontró una regla externa que deba sustituir la regla del proyecto: la exclusividad empieza cuando el trabajador crea una solicitud formal. Es un diseño válido para evitar que varios bancos trabajen casos incompatibles a la vez. La práctica de idempotencia ilustra que un reintento de red/doble clic debe devolver el primer resultado para la misma intención, pero no sustituye el control transaccional de la regla de exclusividad.

**Patrón adoptado:**

1. El trabajador elige un banco y crea `loan_request` en `CREADA`.
2. El backend, en una transacción, valida período, elegibilidad, préstamo vigente y ausencia de otra solicitud bloqueante.
3. Una restricción única protege la misma condición contra dos HTTP simultáneos.
4. La solicitud entra a la bandeja del banco elegido; un analista la toma y el administrador solo puede reasignar dentro de esa organización.
5. La propuesta bancaria es hija de la solicitud. Su creación no es el momento de bloqueo, porque ya se bloqueó al crear solicitud.

**Estados terminales recomendados para liberar:** rechazo banco, rechazo trabajador, cancelación trabajador, anulación administrativa con causa y expiración solo cuando exista regla parametrizada. No asumir expiración por tiempo ni “no se presentó a firmar” como evento automático.

Fuente técnica de idempotencia: [Stripe: idempotent requests](https://docs.stripe.com/api/idempotent_requests). Es una referencia de patrón técnico, no una dependencia ni una regla funcional.

## 3. Seguridad, privacidad, auditoría y roles

OWASP recomienda decidir autorización por sujeto, acción, recurso y contexto, y aplicar el filtro también en listados, búsquedas, agregados y operaciones directas. Su guía de pruebas destaca probar intercambios de identificadores entre dos cuentas/tenants. NIST fundamenta mínimo privilegio y segregación de funciones. La Ley peruana 29733 protege el tratamiento de datos personales; se aplica como razón para minimización incluso en una demo con información ficticia.

**Adopción para demo:**

- Dos roles bancarios bastan: `ADMIN_BANCO` y `ANALISTA_BANCO`. No crear supervisor sin una aprobación funcional distinta.
- El `organization_id` procede de sesión backend; nunca del cuerpo ni de la URL declarada por el cliente.
- Validar autorización en listados, detalle, conteos, asignación, propuesta, firma y descargas futuras.
- Auditoría de actor, acción, entidad, antes/después, fecha y correlación para cambios de estado, parámetros, reasignación, acceso sensible y verificación de constancia proporcional.
- DTO por audiencia y selección explícita de campos. La interfaz no es un control de privacidad.

Fuentes: [OWASP: autorización](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [OWASP: autorización y filtros de datos](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Decisions_And_Output_Handling_Cheat_Sheet.html), [OWASP: prueba BOLA/IDOR](https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html), [NIST SP 800-53 Rev. 5.1](https://csrc.nist.gov/CSRC/media/Projects/risk-management/800-53%20Downloads/800-53r5/SP_800-53_v5_1-derived-OSCAL.pdf), [Ley peruana 29733](https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733).

## 4. Constancia, código y QR

RENIEC y otras entidades públicas peruanas muestran el patrón de documento con QR/código y página de verificación. El modelo de credenciales verificables de W3C advierte que los atributos de una credencial pueden facilitar identificación o correlación. Por tanto, la constancia no debe exponer más datos porque un código se pueda escanear públicamente.

**Recomendación adoptada:** opción C, **QR + URL + código verificable**, con registro de constancia como fuente de verdad. La página consulta en línea para saber si sigue vigente o fue revocada. El QR contiene una URL con identificador opaco; no lleva el detalle de la constancia ni firma criptográfica compleja. No se implementa PDF inicialmente. Si se agrega PDF, lleva el mismo QR/código y la verificación sigue siendo la página en línea.

**Datos públicos mínimos propuestos:** validez, estado, banco, tipo, período, fecha de emisión y vigencia; capacidad/cuota solo si negocio confirma necesidad. Identificación de trabajador: ninguna por defecto. El banco autenticado puede obtener lo que necesite mediante su solicitud propia, no mediante la ruta pública.

Fuentes: [RENIEC: verificación de documentos emitidos virtualmente](https://serviciosportal.reniec.gob.pe/cetdn/verificacion/), [RENIEC: QR único e intransferible en certificados](https://www.reniec.gob.pe/portal/pdf/ECC-FORMATOS-EMISION-CERTIFICADOS.pdf), [W3C: privacidad en credenciales verificables](https://www.w3.org/TR/2024/CRD-vc-data-model-2.0-20240818/), [OWASP: exposición excesiva de datos](https://owasp.org/API-Security/editions/2019/en/0xa3-excessive-data-exposure/).

## 5. SQLite, Docker y despliegue

SQLite documenta que WAL permite lectores concurrentes con escritor, pero existe un escritor a la vez y WAL no es apropiado para un filesystem de red. Para el tráfico limitado de una demo, una instancia y transacciones pequeñas son una elección proporcionada. Render documenta que su disco persistente conserva cambios, pero pertenece a una única instancia y deshabilita escalado/zero-downtime; esto coincide con SQLite y debe aceptarse explícitamente. Docker recomienda multi-stage para compilar Angular y reducir la imagen final.

**Arquitectura adoptada:** un único contenedor Node con build multi-stage futuro; Node sirve Angular compilado y `/api` bajo el mismo dominio. SQLite está en volumen local `/var/data`. No hay Nginx/proxy separado ni CORS en producción. El proveedor termina HTTPS, entrega `PORT`, health check y dominio. Render es una opción de referencia, no una dependencia del proyecto.

**No adoptar:** múltiples réplicas, disco compartido, microservicios, base de datos gestionada o Docker Compose en producción. Serían complejidad innecesaria para esta demo.

Fuentes: [SQLite: WAL](https://www.sqlite.org/wal.html), [Docker: guía Angular y multi-stage](https://docs.docker.com/guides/angular/), [Render: web services](https://render.com/docs/web-services), [Render: persistent disks y limitaciones](https://render.com/docs/disks), [MDN: same-origin y CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

## Matriz de problemas frecuentes

| Escenario | ¿Demo? | Solución conceptual | Datos/estado | UX |
| --- | --- | --- | --- | --- |
| Dos bancos | Sí | Único activo por trabajador desde `CREADA`; transacción y restricción. | `loan_request.bloqueante`; estados bloqueantes. | Mensaje que identifica que ya existe una solicitud activa, sin filtrar banco si no corresponde. |
| Doble clic | Sí | Idempotency key y botón en progreso. | `idempotency_record`. | Resultado único, sin duplicar tarjeta. |
| HTTP simultáneo | Sí | `BEGIN IMMEDIATE`, índice único, `409` controlado. | Versión/restricción. | Refrescar estado y explicar conflicto. |
| Banco duplica propuesta | Sí | Idempotencia por comando; una propuesta vigente. | `loan_proposal` versión/estado. | Deshabilitar envío mientras procesa. |
| Analista procesa dos veces | Sí | Comandos permitidos por estado y versión. | Auditoría/transición. | Mostrar estado actualizado. |
| Dos analistas toman solicitud | Sí | Compare-and-set de asignación. | `request_assignment`, versión. | Uno la toma; otro ve asignada. |
| Banco mira otro banco | Sí | Filtro organización + prueba swap de IDs. | `organization_id`. | 403/404 seguro, sin detalles. |
| Solicitud abandonada | Sí, sin automatismo | Cancelación explícita; expiración solo cuando se confirme regla. | Estado `VENCIDA` futuro. | Acción Cancelar y estado claro. |
| Capacidad cambia | Sí | Snapshot en solicitud/autorización y revalidación final configurable. | assessment/regla/período. | Mostrar período y “requiere validación final”. |
| Préstamo pagado | Sí | Cierre administrativo confirma, no fecha automática. | `loan.FINALIZADO`. | Bandeja de cierre/seguimiento. |
| Período cerrado | Sí | Consulta disponible; creación denegada. | `payroll_period.estado`. | Banner/razón sin bloquear lectura. |
| Constancia inválida | Sí | Estado online vigente/revocada/vencida. | `certificate.estado`. | Página pública mínima. |
| Préstamo vigente | Sí | Rechazar `NUEVO`; otros tipos quedan sujetos a regla. | `loan.estado`, tipo solicitud. | Explicación y sin simulación. |
| Ampliación/compra | Sí, visual | Estados comunes; elegibilidad pendiente. | `tipo` descriptivo y vínculo futuro a préstamo. | Etiqueta de caso pendiente de validación. |
| Trabajador cancela | Sí | Transición terminal auditada que libera. | `CANCELADA_POR_TRABAJADOR`. | Confirmación uniforme. |
| Banco rechaza | Sí | Transición terminal que libera. | `RECHAZADA_POR_BANCO`. | Motivo controlado. |
| No se presenta a firma | Documentar | No inferir vencimiento; usar evento/regla posterior. | Pendiente. | Estado no engañoso. |
| Estados incoherentes | Sí | Máquina de estados y comandos específicos. | Versiones/transiciones. | Acciones solo cuando proceden. |
| Auditoría | Sí | Evento inmutable por acción relevante. | `audit_event`. | Vista administrativa resumida. |

## Riesgos que no se deben ocultar

- La fórmula vigente de capacidad y reglas de ampliación/compra siguen pendientes; la demo debe rotular cualquier valor ficticio como demostrativo.
- SQLite con disco persistente es adecuado para un solo proceso de demo, no para alta disponibilidad ni escala nacional.
- Una constancia pública puede compartirse; por eso expone datos mínimos y se verifica online.
- La exclusividad evita dos solicitudes incompatibles, pero requiere mensaje claro y salida/cancelación para no dejar al trabajador bloqueado.
- La demostración depende de conectividad. Probar URL, reset, cuentas ficticias y health check antes de exponer.
