# Preguntas pendientes reales

Estas preguntas no impiden construir el esqueleto, UI, autorización simulada ni datos ficticios. Sí impiden declarar la demo como representación exacta de una política productiva.

| ID | Pregunta | Impacto | Tratamiento provisional de demo |
| --- | --- | --- | --- |
| OQ-01 | ¿Cuál es la fórmula vigente completa de capacidad/liquidez y qué descuentos/ingresos participan? | Motor de capacidad. | 35% configurable y resultado etiquetado como demostrativo/versionado. |
| OQ-02 | ¿Cómo se ponderan horas extra, guardias e ingresos variables: promedio, meses consecutivos y porcentaje? | Cálculo y datos requeridos. | Seed controlado; no afirmar una política vigente. |
| OQ-03 | ¿Cuáles son los criterios y documentos para `AMPLIACION` y `COMPRA_DEUDA`? | Elegibilidad y flujo. | Presentarlos como tipos existentes con validación pendiente. |
| OQ-04 | ¿Qué validación final convierte una propuesta aceptada en operación autorizada y constancia? | Autorización y estados. | `AUTORIZADA` se modela después de aceptación; validación demostrativa/versionada. |
| OQ-05 | ¿Qué campos exactos de constancia requieren banco y verificador público, y qué evento revoca? | Privacidad y constancia. | URL pública mínima sin trabajador identificado; estado online. |
| OQ-06 | ¿Cómo se calcula la vigencia respecto de calendario de planilla, apertura/cierre y feriados? | Expiración. | La demo aplica el parámetro `FIN_PERIODO` a constancias informativas de capacidad y conserva la fecha emitida; no se presenta como política institucional. |
| OQ-07 | ¿Qué rol confirma que un préstamo está pagado y qué evidencia recibe el sistema? | Cierre y liberación de capacidad. | Seguimiento administrativo manual ficticio. |
| OQ-08 | ¿Qué grupos de personal quedan elegibles y qué catálogos de conceptos SAP vigentes aplican? | Datos SAP Web. | Grupos y conceptos ficticios/versionados. |
| OQ-09 | ¿Qué identidad visual, textos legales y retención de auditoría están autorizados para presentación? | UI y despliegue. | Paleta no oficial y datos ficticios; no producción. |
| OQ-10 | ¿Cuándo una firma genera `VIGENTE` frente a `PENDIENTE_APLICACION_EXTERNA`? | Préstamo y bloqueo posterior. | Mantener ambos estados y no afirmar integración externa. |
