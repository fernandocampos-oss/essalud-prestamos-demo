# Actores, roles y límites

## Roles suficientes para la demo

No se agrega `SUPERVISOR_BANCO` por costumbre. Para la demo son suficientes `ADMIN_BANCO` y `ANALISTA_BANCO`; un supervisor solo se introduce si negocio confirma una aprobación separada que no pueda asumir el administrador de banco.

| Actor | Rol | Puede hacer | No puede hacer |
| --- | --- | --- | --- |
| Trabajador | `TRABAJADOR` | Consultar capacidad, crear solicitud para un banco, ver/cancelar solicitudes propias y responder propuestas. | Ver planilla ajena, definir crédito, administrar períodos. |
| Administrador EsSalud | `ADMIN_ESSALUD` | Administrar parámetros/períodos, bancos, excepciones justificadas, auditoría y seguimiento. | Definir condiciones de crédito del banco. |
| Operador EsSalud | `OPERADOR_ESSALUD` | Consultar/revisar cierre y SAP Web según permiso. | Cambiar parámetros críticos, anular sin atribución o administrar bancos. |
| Administrador banco | `ADMIN_BANCO` | Gestionar analistas de su banco, ver bandeja, reasignar y supervisar solicitudes propias. | Acceder a otro banco o fijar reglas EsSalud. |
| Analista banco | `ANALISTA_BANCO` | Tomar/asignarse solicitudes de su banco, evaluarlas, proponer, rechazar y registrar firma autorizada. | Ver otro banco, administrar usuarios o parámetros globales. |
| Consulta SAP Web | `CONSULTA_PLANILLA` | Buscar trabajador y ver detalle de planilla/capacidad autorizado. | Gestionar solicitudes o modificar origen. |
| Verificador público | Anónimo | Consultar una constancia por código/URL. | Buscar personas, listar constancias o ver datos de planilla. |

## Bandeja bancaria recomendada

La solicitud creada por trabajador llega a la bandeja del banco elegido en `CREADA`. Un analista puede tomarla si no está asignada; el administrador del mismo banco puede reasignarla. La asignación no cambia el banco, no elimina la exclusividad y usa control de versión para resolver dos tomas simultáneas.

## Aislamiento de organización

Toda sesión bancaria tiene un `organization_id` confiable en servidor. El backend lo usa como predicado de datos y permiso de acción; nunca acepta que el navegador declare el banco de destino. Esta regla cubre URL, búsqueda, conteo, asignación, detalle y mutación. Los accesos de EsSalud que cruzan organizaciones requieren rol y auditoría.

## Segregación proporcionada

La demo aplica mínimo privilegio y auditoría. No pretende reproducir una segregación productiva completa: `ADMIN_BANCO` puede reasignar, pero las decisiones de propuesta y firma quedan trazadas al analista/actor. Si negocio exige doble aprobación, se documentará antes de crear un rol supervisor.
