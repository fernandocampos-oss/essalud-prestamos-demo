# Flujo de solicitudes, propuestas y constancias

## Flujo TO-BE confirmado

1. El trabajador entra desde SOMOS y consulta su capacidad para un período disponible. Esta acción no bloquea.
   Puede descargar una **constancia informativa de capacidad mensual**: registra el importe y período consultados, ofrece QR/URL verificable y no crea una solicitud ni equivale a autorización o aprobación de crédito.
2. El trabajador selecciona un banco y crea una **solicitud formal** `NUEVO`, `AMPLIACION` o `COMPRA_DEUDA` cuando sea elegible. Desde `CREADA`, la solicitud bloquea otra incompatible hacia otro banco.
3. El banco recibe la solicitud en su bandeja y la toma/asigna a un analista de su propia organización.
4. El banco verifica el resultado oficial permitido, evalúa el caso y registra una **propuesta** con monto, plazo, tasa y cuota. Estas condiciones pertenecen al banco.
5. El trabajador revisa la propuesta y la acepta o rechaza. Puede cancelar su solicitud antes de la firma.
6. Si se acepta, EsSalud realiza las validaciones finales de capacidad/período definidas y crea una **operación autorizada**. Esta puede emitir una constancia verificable.
7. El trabajador acude al banco y firma. Se registra el hito de firma y se deriva el seguimiento al proceso externo de planilla.
8. El proceso externo aplica descuentos y pagos fuera del alcance de la demo. El cierre administrativo confirma préstamos pagados y libera capacidad cuando corresponda.

## Distinciones obligatorias

| Concepto | Quién lo crea | Efecto |
| --- | --- | --- |
| Consulta de capacidad | Trabajador/sistema | Lectura informativa; no bloquea. |
| Solicitud formal | Trabajador para un banco | Desde `CREADA`, bloquea una solicitud incompatible. |
| Propuesta | Banco | Condiciones financieras; no cambia por sí sola la exclusividad ya creada. |
| Aceptación/rechazo | Trabajador | Respuesta a una propuesta; no es firma. |
| Operación autorizada | Sistema/EsSalud tras validaciones | Puede producir constancia. |
| Préstamo vigente | Resultado firmado y activo según proceso externo | Impide `NUEVO`. |
| Préstamo finalizado | Confirmado como terminado de pagar | Candidato a liberar capacidad en cierre. |

## Salidas que liberan la solicitud

`RECHAZADA_POR_BANCO`, `RECHAZADA_POR_TRABAJADOR`, `CANCELADA_POR_TRABAJADOR`, `ANULADA_POR_ADMINISTRACION` y `VENCIDA` liberan el bloqueo. `VENCIDA` solo se habilitará si negocio define una regla de expiración parametrizable. Un trabajador que no se presenta a firmar no se marca automáticamente como vencido: requiere un evento válido de cancelación/expiración definido posteriormente.

## Constancia verificable: recomendación para la demo

Usar **código opaco + QR que contiene la URL de verificación + página web de estado**. La entidad en base de datos es la fuente de verdad; el QR es solo un acceso rápido. La demo puede generar un PDF privado y descargable únicamente para una autorización vigente: reutiliza el mismo código y QR, no crea otra autorización y se identifica como documento de demostración sin validez oficial. El PDF no es el mecanismo de verificación.

La ruta pública consulta estado en línea para reflejar vigencia o revocación. Muestra únicamente: validez, estado, banco, tipo, período, capacidad o cuota autorizada si se confirma que corresponde, fecha de emisión y fecha/evento de vigencia. Por privacidad, la propuesta base es no exponer nombre ni documento del trabajador en la ruta pública; una identificación parcial solo se agrega si negocio la aprueba. Nunca exponer detalle de planilla, AFP, descuentos judiciales, manutención o identificadores internos.

## Constancia informativa de capacidad mensual

La demo conserva este documento en una entidad separada de `certificate`/autorización. Se emite para el trabajador autenticado usando el mismo resultado de capacidad presentado en pantalla y guarda el importe, período, fecha, código opaco y, cuando la regla lo determine, `valid_until`. El PDF y la verificación pública aclaran que es informativo, que no aprueba un crédito ni autoriza un descuento, y que pertenece al entorno de demostración. La regla demostrativa inicial `FIN_PERIODO` fija la vigencia en el último día del período consultado; se resuelve y persiste en backend al emitir el documento, con zona horaria de Perú. No es una política institucional confirmada y puede cambiarse mediante el parámetro `constancia.capacidad.vigencia_regla`. Las constancias históricas sin fecha de vigencia muestran “vigencia no determinada”; nunca reciben una fecha inventada.

El código público debe ser aleatorio, no secuencial, sin PII y distinto del ID interno. Su acceso y las revocaciones se auditan sin guardar más información de la necesaria.

## Constancia de registro de solicitud
Desde el detalle de una solicitud formal, incluso CREADA, su propietario puede descargar la constancia de registro SOL. Esta excepción a la disponibilidad exclusiva del PDF de autorización corresponde a un documento distinto: no aprueba crédito ni autoriza descuentos. Datos de emisión inmutables; verificación pública consulta estado actual. Ver [REQUEST_CERTIFICATE.md](REQUEST_CERTIFICATE.md).
