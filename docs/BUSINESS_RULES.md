# Reglas de negocio y parámetros

## Leyenda

- **Confirmado:** instrucción expresa de este proyecto.
- **Propuesta de diseño:** comportamiento recomendado para la demo; no es política institucional declarada.
- **Pendiente:** requiere confirmación de EsSalud antes de presentarse como regla vigente.

## Reglas confirmadas

| ID | Regla |
| --- | --- |
| BR-01 | Consultar capacidad no crea solicitud, no reserva capacidad y no bloquea al trabajador. |
| BR-02 | El trabajador crea una **solicitud formal** dirigida a un banco. Desde que se crea, bloquea una segunda solicitud incompatible hacia otro banco mientras esté activa. |
| BR-03 | La propuesta crediticia es posterior a la solicitud y la prepara el banco. EsSalud no define ni simula monto, plazo, tasa o cuota. |
| BR-04 | Si existe préstamo vigente, no se permite una solicitud de tipo `NUEVO`. `AMPLIACION` y `COMPRA_DEUDA` pueden corresponder, sujetos a reglas pendientes. |
| BR-05 | Solicitud formal, propuesta, aceptación/rechazo, operación autorizada, préstamo vigente y préstamo finalizado/pagado son conceptos/estados distintos. |
| BR-06 | Una solicitud activa se libera solo por un evento válido: rechazo bancario, cancelación del trabajador, anulación administrativa con causa, expiración si una regla futura la habilita u otro cierre válido documentado. No hay plazo de expiración confirmado. |
| BR-07 | La capacidad proviene conceptualmente de SAP Web/planillas. La demo usa datos ficticios y no se conecta a SAP. |
| BR-08 | Las nuevas solicitudes pueden restringirse por período; la consulta de capacidad puede continuar disponible si existe un snapshot del período. |
| BR-09 | El cierre administrativo identifica préstamos pagados, informa a un área/sistema externo y libera capacidad según corresponda. La demo no modifica ni confirma ese sistema externo. |
| BR-10 | El porcentaje inicial conocido para la propuesta nueva es 35% y debe ser parametrizable. |
| BR-11 | Un banco solo puede acceder a sus solicitudes, propuestas y usuarios. El backend aplica este aislamiento en listados, búsquedas, detalle y mutaciones. |
| BR-12 | Todos los datos de la demo son ficticios. |

## Parámetros administrables propuestos

| Parámetro | Uso | Estado |
| --- | --- | --- |
| `capacidad.porcentaje_base` | Valor inicial `0.35` para la regla versionada. | Confirmado como parámetro; fórmula total pendiente. |
| `periodo.estado` | `PREPARACION`, `ABIERTO`, `RESTRINGIDO`, `CERRADO`. | Propuesta de diseño. |
| `periodo.permite_nuevas_solicitudes_desde_dia` | Apertura administrativa, sin día 7 fijo. | Propuesta configurable. |
| `solicitud.expiracion_habilitada` y regla asociada | Define si/como expiran solicitudes activas. | Pendiente; desactivado por defecto en demo. |
| `constancia.capacidad.vigencia_regla` | Determina la vigencia demostrativa de la constancia informativa de capacidad. El valor inicial `FIN_PERIODO` conserva como fecha límite el último día del período consultado. | Configurable; no representa una política institucional confirmada. |
| `conceptos.version_activa` | Catálogo y factores de planilla utilizados por la regla. | Requerido. |

Todo cambio de parámetro debe guardar valor previo/nuevo, actor, fecha, motivo y correlación de auditoría.

## Fórmula de capacidad

El resultado debe apuntar a un período, snapshot de planilla y versión de regla. El 35% es el parámetro base inicial confirmado; no está cerrada la fórmula completa ni la ponderación de ingresos variables, descuentos institucionales, judiciales, sindicales, de terceros, límites y redondeos. Los valores demo pueden resultar de una regla ficticia explicable, rotulada como demostrativa y nunca como política vigente.

Las fórmulas históricas de 40% y 50% de SISCON son referencias AS-IS contradictorias, no valores de implementación.

## Regla de período

- `PREPARACION`: se revisan finalizaciones/capacidad; no admite nuevas solicitudes.
- `ABIERTO`: permite consulta y nueva solicitud si se cumplen las reglas.
- `RESTRINGIDO`: permite consulta; rechaza nuevas solicitudes. Las solicitudes existentes siguen su flujo según autorización.
- `CERRADO`: período de referencia no admite nuevas solicitudes; su historial y constancias siguen consultables con el estado correspondiente.

Estos estados son un modelo simple para la demo. Las fechas exactas, feriados, corte y coordinación con pagos son pendientes de negocio.
