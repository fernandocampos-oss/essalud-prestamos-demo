# Propuesta de rutas

Las rutas son una propuesta estable para la demo, sujeta a ajustes menores de UX que no cambien los límites de autorización.

| Ruta | Audiencia | Propósito |
| --- | --- | --- |
| `/somos` | Trabajador | Recreación mínima y entrada a Préstamos. |
| `/prestamos` | Trabajador | Inicio y consulta de capacidad propia. |
| `/prestamos/solicitudes/nueva` | Trabajador | Creación de solicitud formal para banco. |
| `/prestamos/mis-solicitudes` | Trabajador | Solicitudes propias, propuesta y acciones permitidas. |
| `/prestamos/mis-solicitudes/:id` | Trabajador | Detalle de solicitud propia. |
| `/prestamos/mis-constancias` | Trabajador | Historial de constancias propias. |
| `/prestamos/banco` | Banco | Panel de operaciones de la organización actual. |
| `/prestamos/banco/solicitudes/:id` | Banco | Detalle protegido de una solicitud propia. |
| `/prestamos/admin` | EsSalud | Resumen administrativo. |
| `/prestamos/admin/periodos` | EsSalud | Gestión de períodos. |
| `/prestamos/admin/parametros` | EsSalud | Parámetros y versiones de regla. |
| `/prestamos/admin/operaciones` | EsSalud | Supervisión y cierre. |
| `/prestamos/verificar/:codigoPublico` | Público | Verificación mínima de constancia. |
| `/sap-web` | Roles de planilla | Inicio SAP Web. |
| `/sap-web/personal` | Roles de planilla | Búsqueda de trabajadores. |
| `/sap-web/personal/:id/periodos/:periodoId` | Roles de planilla | Planilla, conceptos y capacidad. |
| `/dev/ui` | Desarrollo | Catálogo protegido o solo no productivo de UI. |

No incluir identificadores de organización en la URL como mecanismo de aislamiento. El backend resuelve la organización desde la sesión. Los parámetros de ruta no otorgan acceso por sí mismos.
