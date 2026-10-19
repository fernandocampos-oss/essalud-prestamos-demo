# Constancia de registro de solicitud bancaria

## Tres documentos independientes

- Capacidad mensual: prefijo CAP, consulta informativa sin solicitud ni bloqueo. Sin cambios.
- Registro de solicitud: prefijo SOL, acredita únicamente una solicitud ya registrada para un banco. Disponible desde CREADA y también para solicitudes históricas. No aprueba crédito, no autoriza descuentos, no reserva capacidad nuevamente.
- Autorización: código existente DEMO, continúa requiriendo autorización vigente. Sin cambios en sus reglas.

## Emisión y descarga

En Mis solicitudes → Ver detalle → Información de la solicitud, `Descargar constancia de solicitud` emite o reutiliza el registro y descarga un PDF A4. Cancelar permanece como acción secundaria.

`POST /api/worker/requests/:id/registration-certificate` requiere trabajador propietario e Idempotency-Key. Una transacción BEGIN IMMEDIATE guarda snapshot, auditoría e idempotencia. UNIQUE(request_id) impide dos documentos por solicitud incluso con claves distintas; UNIQUE(public_code) protege el código público. Se generan 128 bits mediante crypto.randomBytes, representados como SOL seguido de 32 dígitos hexadecimales. El ID interno es diferente.

`GET /api/worker/requests/:id/registration-certificate.pdf` requiere el mismo propietario. No emite un registro nuevo. Conserva fecha de emisión, nombre, documento enmascarado, banco, tipo, fecha de registro, período, capacidad de requests.assessment_centimos y estado al emitir. No recalcula capacidad ni lee detalle de planilla. La base actual guarda un código de trabajador, no un DNI separado: se enmascara ese identificador disponible, sin inventar otro.

Se auditan CONSTANCIA_SOLICITUD_EMITIDA, CONSTANCIA_SOLICITUD_DESCARGADA y CONSTANCIA_SOLICITUD_VERIFICADA. Descargada indica PDF generado y respuesta preparada; no prueba que el navegador haya guardado el archivo.

## Verificación

Reutiliza `/prestamos/verificar/:codigo` y `/api/public/certificates/:code`. El QR y el enlace se construyen con PUBLIC_APP_URL (alias APP_BASE_URL), localhost:4200 por defecto en desarrollo; producción requiere configuración. No hay IP fija ni nueva API bancaria.

La consulta usa el snapshot emitido y JOIN con requests para mostrar el estado actual. Cancelar después de emitir muestra «Registro auténtico — Solicitud cancelada»; también distingue rechazos, autorización, firma, anulación y vencimiento. No se crean estados internos nuevos. Respuestas sin caché (`Cache-Control: no-store`). Una página ya abierta necesita recargarse para consultar cambios posteriores.

El DTO público no expone ID interno, nombre completo, documento completo, planilla ni propuesta. El código permite lectura mínima; no concede permiso para decidir o proponer. Un 404 se diferencia de un fallo de conexión en la interfaz.

## Migración y Docker

`backend/src/request-certificate-migration.js` crea `request_certificates` al abrir la base mediante openDb. Es aditiva e idempotente: no modifica ni elimina solicitudes, propuestas, autorizaciones ni identificadores. Las solicitudes anteriores emiten su snapshot al primer uso, con el estado de ese momento y la capacidad ya guardada al registrarse. No se inventa una fecha de emisión pasada.

Antes de actualizar Docker, obtener backup consistente de SQLite (backup de SQLite o copia con escritores detenidos; no copiar solamente el .sqlite ignorando WAL activo). Conservar el volumen existente y DB_PATH exacto. Ejecutar una sola instancia; desplegar la nueva imagen conservando el volumen. openDb aplica la tabla sin reset. Verificar health y descargar/verificar una solicitud existente. No ejecutar demo:reset ni eliminar el volumen. Si se vuelve a una imagen anterior, la tabla adicional puede conservarse; no borrarla como parte de un rollback.

No se ejecutó ninguna acción en Google Cloud. La actualización queda a cargo del usuario. Las pruebas existentes crean y eliminan exclusivamente archivos SQLite temporales propios; no restauran la base de la aplicación.

## Extensión futura

NUEVO, AMPLIACION y COMPRA_DEUDA usan el mismo documento con su etiqueta y banco destinatario. La sección de información puede extenderse posteriormente con acreedores persistidos; esta entrega no incorpora formulario, entidades ni montos de deuda inventados.
