# AS-IS y referencia histórica

## Proceso actual conocido

Los bancos captan trabajadores y envían diariamente listas a EsSalud para conocer capacidad, préstamos existentes y compatibilidad de cuotas. Existen intercambios de archivos, validaciones y revisiones manuales. Un legado en Visual FoxPro procesa archivos de ancho fijo, aproximadamente `codigo + apellidos + nombres + monto + meses + cuota + tipo`; históricamente se distinguen préstamo nuevo, ampliación y compra de deuda.

La consulta manual usa un sistema web antiguo con información de trabajador, ingresos, descuentos, conceptos de planilla y liquidez. El código fuente de ese sistema ya no está disponible para el equipo actual.

Al comienzo del mes existe un cierre operativo: desde el día 1 pueden llegar operaciones, mientras el área identifica préstamos pagados, prepara informes y solicita que un área externa deje de descontar cuotas. El día 7 es una referencia histórica, no una regla que el nuevo sistema pueda fijar.

## Hallazgos del repositorio SISCON

Se revisó el commit `982982084a56d6e3ae1acb58b7c90dc93b15030f` del repositorio histórico. Es una demo de una demo histórica secundaria, no fuente de verdad. Su arquitectura anterior contiene Angular, Node/Express, MySQL externo y Docker, lo cual no determina la arquitectura nueva.

- `ESQUEMA_SISTEMA_WEB_SERVICE.md` describe extracción SAP a Excel y carga manual a MySQL. Expone personal, emolumentos y liquidez; propone que un futuro servicio SAP sustituya el Excel.
- Personal se consulta por nombre/documento/código y grupo de personal. Los grupos determinaban tablas de emolumentos.
- Los conceptos se separaban en ingresos permanentes, otros ingresos, descuentos de ley, judiciales, institucionales, sindicales y de terceros. Es una taxonomía útil, pero los códigos y listas no se consideran vigentes automáticamente.
- El backend histórico contenía listas hardcodeadas de conceptos y una fórmula con 40%; rutas de liquidez y solicitudes no estaban uniformemente autenticadas. Esto es evidencia AS-IS, no patrón para adoptar.
- El análisis de FoxPro confirma clasificación por rangos y promedio de tres meses para horas extra/guardias. Las fórmulas principales estaban en `.SCT` compilados y no se pudieron verificar directamente.

## Contradicciones históricas detectadas

| Tema | Evidencia histórica | Tratamiento TO-BE |
| --- | --- | --- |
| Porcentaje de capacidad | Documentos citan 40% y también 50% en contextos distintos. | Parámetro inicial de 35%; fórmula final requiere validación. |
| Horas extra/guardias | Un documento menciona 50% del último mes; código FoxPro legible promedia tres meses. | No asumir ninguno hasta validar regla y datos necesarios. |
| Clasificación | Hay códigos de tres dígitos y de cuatro dígitos, rangos y listas fijas. | Catálogo versionado de conceptos, no lógica hardcodeada. |
| Solicitudes | El legado inserta lotes y usa estados abreviados. | Operación individual, estados descriptivos y transiciones controladas. |

## Problemas a resolver con la demo

- Dependencia de correos, listas y TXT para la consulta inicial.
- Validación masiva/manual trabajador por trabajador.
- Lógica y parámetros dispersos, difícil de explicar y actualizar.
- Falta de separación explícita entre consulta informativa, solicitud formal, propuesta bancaria, operación autorizada y préstamo vigente.
- Exposición potencial de información de planilla mayor a la necesaria para un banco.
