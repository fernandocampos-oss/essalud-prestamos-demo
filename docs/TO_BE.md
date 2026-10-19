# Propuesta TO-BE

## Resultado buscado

El trabajador consulta desde SOMOS una capacidad oficial calculada por SAP Web. Con esa información crea una solicitud formal dirigida a un banco o conversa con él según el recorrido. La solicitud bloquea otra incompatible desde su creación. El banco formula sus propias condiciones crediticias, el trabajador responde a la propuesta y, cuando corresponde, EsSalud emite una constancia verificable. EsSalud no ofrece ni simula un crédito.

```text
SOMOS EsSalud → consulta de capacidad (no bloquea)
                       ↓
          solicitud formal hacia banco (bloquea)
                       ↓
       propuesta bancaria → aceptación/rechazo
                       ↓
          autorización / constancia verificable
                       ↓
             firma y derivación externa
```

## Eliminaciones objetivo para este tramo

- Correos diarios y listas de trabajadores para consultar capacidad.
- TXT y Visual FoxPro usados para la validación inicial trabajador por trabajador.
- Revisión manual masiva para obtener una respuesta preliminar de capacidad.

No se afirma que desaparezcan procesos posteriores de descuento, pago o contabilidad; permanecen fuera de esta demo y en sistemas/áreas externos.

## Separación conceptual obligatoria

| Concepto | Efecto |
| --- | --- |
| Consulta de capacidad | Lectura informativa. No crea solicitud ni bloqueo. |
| Solicitud formal | La crea el trabajador para un banco y bloquea desde `CREADA`. |
| Propuesta en borrador | Trabajo interno del banco sobre una solicitud ya bloqueante. |
| Operación autorizada | Resultado validado de una solicitud aceptada; puede producir constancia. |
| Constancia/autorización | Evidencia verificable de una operación autorizada para un período. |
| Préstamo vigente | Préstamo firmado/activo que impide un nuevo préstamo y puede permitir otros tipos según política. |
| Préstamo finalizado | Préstamo pagado; su liberación efectiva depende de cierre administrativo. |

## SAP Web como origen desacoplado

La demo usará SQLite ficticio detrás de una interfaz de origen de planilla. El dominio de capacidad solo pedirá trabajador, período, conceptos y estado de disponibilidad; no conocerá SQLite directamente. En una implementación real se sustituye el adaptador por SAP/API manteniendo los servicios y contratos de la aplicación.
