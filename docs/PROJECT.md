# Proyecto

## Visión

La demo presenta a gerentes de EsSalud una experiencia moderna y coherente para consultar capacidad de endeudamiento y gestionar el tramo inicial de préstamos por convenio. Debe comunicar reducción de tareas manuales, control por períodos, trazabilidad y protección de datos, con una navegación estable en un único enlace.

## Alcance de la demo

1. Recreación visual mínima de SOMOS EsSalud como puerta de entrada de trabajador.
2. Sistema de Préstamos para consulta de capacidad, solicitud formal creada por trabajador hacia un banco, propuesta bancaria, autorización/constancia verificable, administración y seguimiento demostrable.
3. SAP Web para consultar trabajador, conceptos de planilla, resumen de ingresos/descuentos y capacidad calculada con datos ficticios.
4. Cuentas simuladas, roles, autorización de backend, separación de bancos, estados, períodos, parámetros y auditoría.
5. SQLite con seeds ficticios que cubran los escenarios de `DEMO_SCENARIOS.md`.

## Fuera de alcance

- Integración real con SAP, RENIEC, OAuth corporativo, bancos, correo, firma digital, pagos o sistemas externos de descuento.
- PDF como evidencia contractual productiva; la constancia verificable de demo puede usar código/QR/URL cuando se implemente la fase correspondiente.
- Procesamiento productivo de TXT, Visual FoxPro, pagos, desembolsos, contabilidad o aplicación efectiva a planilla.
- Decisión crediticia, tasa, monto o plazo por EsSalud; esas condiciones pertenecen al banco.
- Construir SOMOS como producto independiente.

## Criterios de éxito

La presentación debe poder recorrer sin fallos una consulta de capacidad, creación de una solicitud formal que bloquea otra incompatible, procesamiento bancario y constancia verificable, una vista administrativa de período y una consulta de SAP Web. Cada vista debe conservar coherencia visual y usar datos ficticios entendibles. La demo debe dejar explícito qué sucede después de la firma sin pretender integrarlo.

## Principios

- Priorizar claridad, estabilidad y narrativa ejecutiva sobre cobertura funcional masiva.
- Distinguir un hecho confirmado, una decisión de diseño, un supuesto y un pendiente.
- El histórico explica el pasado; este proyecto define el futuro.
