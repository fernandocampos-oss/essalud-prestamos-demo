# Estados, transiciones y concurrencia

## Solicitud formal: estado que controla exclusividad

```text
CREADA -> EN_EVALUACION_BANCO -> PROPUESTA_EMITIDA -> ACEPTADA_POR_TRABAJADOR
                                                   -> AUTORIZADA -> PENDIENTE_FIRMA -> FIRMADA
EN_EVALUACION_BANCO -> RECHAZADA_POR_BANCO
estado bloqueante -> ANULADA_POR_ADMINISTRACION
CREADA / EN_EVALUACION_BANCO / PROPUESTA_EMITIDA -> CANCELADA_POR_TRABAJADOR
estado bloqueante -> VENCIDA, solo si una regla futura lo permite
```

| Estado de solicitud | Actor/evento principal | ¿Bloquea otra solicitud incompatible? |
| --- | --- | --- |
| `CREADA` | Trabajador crea solicitud para banco. | Sí. |
| `EN_EVALUACION_BANCO` | Banco toma/asigna y evalúa. | Sí. |
| `PROPUESTA_EMITIDA` | Banco registra propuesta vigente. | Sí. |
| `ACEPTADA_POR_TRABAJADOR` | Trabajador acepta propuesta. | Sí. |
| `AUTORIZADA` | Validación final aprobada; puede emitir constancia. | Sí. |
| `PENDIENTE_FIRMA` | Constancia/autoridad lista, espera firma. | Sí. |
| `FIRMADA` | Banco registra firma; inicia seguimiento externo. | Sí, hasta que el modelo del préstamo aplique la regla correspondiente. |
| `RECHAZADA_POR_BANCO` | Banco rechaza. | No. |
| `RECHAZADA_POR_TRABAJADOR` | Trabajador rechaza propuesta. | No. |
| `CANCELADA_POR_TRABAJADOR` | Trabajador cancela antes del cierre permitido. | No. |
| `ANULADA_POR_ADMINISTRACION` | Administrador anula con causa y auditoría. | No. |
| `VENCIDA` | Regla futura de expiración. | No. |

La exclusividad desde `CREADA` es una regla confirmada. Los nombres de estados son propuesta de implementación y pueden ajustarse sin mover ese punto de bloqueo.

## Propuesta bancaria y autorización

Una `loan_proposal` es hija de la solicitud. Puede existir historial de propuestas, pero solo una puede estar vigente. Sus estados propuestos son `BORRADOR`, `EMITIDA`, `ACEPTADA`, `RECHAZADA`, `RETIRADA`, `SUPERADA`. No usa exclusividad propia: esta ya la controla la solicitud.

La autorización y su constancia están asociadas a una solicitud `AUTORIZADA`; una transición a estado terminal revoca la constancia activa si existe. La firma no confirma que el sistema externo descontó ni que el préstamo terminó de pagar.

## Reglas de transición

- Exponer comandos específicos, no `PATCH estado` genérico.
- Cada comando valida sesión, rol, organización, propiedad, estado, versión, período, elegibilidad e idempotencia.
- `createRequest` verifica en una misma transacción: período permite solicitudes, elegibilidad del tipo, ausencia de préstamo vigente para `NUEVO` y ausencia de otra solicitud bloqueante incompatible. Para la demo se propone impedir también el duplicado dentro del mismo banco. Si todo es válido crea `CREADA`, reserva exclusividad y audita.
- Un banco solo lista, toma, asigna, propone, rechaza o firma solicitudes de su organización. El trabajador solo ve/cancela/responde sus propias solicitudes.
- Los estados terminales no se reabren; se crea una nueva solicitud con trazabilidad si corresponde.

## Concurrencia e idempotencia

1. El cliente genera una clave de idempotencia por intención de mutación; la reutiliza solo al reintentar la misma acción y mismo cuerpo.
2. El backend ejecuta un `BEGIN IMMEDIATE` breve, recarga trabajador/solicitud, valida y aplica restricciones únicas.
3. Una restricción única parcial o tabla de bloqueo garantiza una sola solicitud bloqueante por trabajador. La condición se mantiene también en el servicio de dominio para dar mensajes claros.
4. La transacción persiste cambio, auditoría e idempotencia juntas. Un reintento devuelve el resultado original; una intención distinta con la misma clave falla.
5. Si otra pestaña o analista ganó, devolver `409 Conflict` y refrescar el estado permitido. No sobrescribir estados por el navegador.

SQLite en WAL permite lectura concurrente, pero conserva un único escritor; por ello las transacciones deben ser pequeñas, con `busy_timeout` y manejo explícito de `SQLITE_BUSY`.

## Préstamo y cierre

Estados mínimos de préstamo: `PENDIENTE_APLICACION_EXTERNA`, `VIGENTE`, `FINALIZADO`, `ANULADO`. El significado exacto de cuándo una firma crea `VIGENTE` frente a `PENDIENTE_APLICACION_EXTERNA` queda pendiente de confirmación. Un préstamo solo llega a `FINALIZADO` mediante la confirmación administrativa/proceso externo correspondiente, nunca solo por una fecha estimada.
