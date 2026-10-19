# Casos de uso

| ID | Actor | Caso principal | Resultado esperado |
| --- | --- | --- | --- |
| UC-01 | Trabajador | Entrar desde SOMOS y consultar capacidad. | Ve capacidad y período, sin operación creada. |
| UC-02 | Trabajador | Consultar durante restricción de nuevas operaciones. | La consulta funciona; se informa la restricción aplicable a nuevas operaciones. |
| UC-03 | Trabajador | Crear solicitud formal hacia un banco. | Se crea `CREADA`, bloquea otra incompatible y queda auditada. |
| UC-04 | Analista de banco | Tomar solicitud de su bandeja y registrar propuesta. | Solo actúa sobre organización propia; la propuesta no redefine el bloqueo. |
| UC-05 | Trabajador | Aceptar, rechazar o cancelar según el estado permitido. | Transición auditada; rechazo/cancelación libera la solicitud. |
| UC-06 | Analista de banco | Verificar una constancia con código/QR. | Ve estado y datos mínimos autorizados, sin detalle de planilla. |
| UC-07 | Administrador de banco | Reasignar una solicitud de su banco. | Cambia responsable con auditoría y control de versión. |
| UC-08 | Administrador EsSalud | Abrir, restringir o cerrar un período. | Cambia reglas de nuevas solicitudes sin cancelar consultas. |
| UC-09 | Operador EsSalud | Revisar préstamos finalizados del cierre. | Registra seguimiento/derivación sin afirmar integración externa. |
| UC-10 | Consulta SAP Web | Buscar trabajador y consultar planilla/capacidad. | Ve fuente ficticia, resumen y detalle permitido por rol. |
| UC-11 | Sistema | Recibir doble clic o reintento de acción. | Un solo cambio efectivo; respuesta idempotente o conflicto explicado. |
| UC-12 | Sistema | Usuario de banco modifica URL de otra organización. | Backend responde 403/404 seguro y no filtra datos. |
| UC-13 | Sistema | Dos analistas intentan tomar la misma solicitud. | Solo una transacción gana; la otra recibe estado actualizado/conflicto. |

Los flujos alternativos y mensajes se diseñarán cuando se implementen, usando los estados de `STATE_MODEL.md`.
