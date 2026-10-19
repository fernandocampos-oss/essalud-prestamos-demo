# Modelo de datos propuesto

## Entidades principales

| Entidad | Campos esenciales | Propósito |
| --- | --- | --- |
| `organization` | id, tipo, nombre ficticio, estado | EsSalud y cada banco participante. |
| `user` / `user_role` | organization_id, rol, estado | Sesión y RBAC de demo. |
| `worker` | código/documento/nombre ficticios, grupo, estado | Trabajador de referencia. |
| `payroll_period` | código, inicio, fin, estado, reglas | Período de planilla/administración. |
| `payroll_snapshot` / `payroll_concept` | trabajador, período, origen, conceptos, monto_centimos | Evidencia ficticia de planilla. |
| `concept_catalog_version` / `concept_mapping` | versión, categoría, factor | Clasificación versionada, no hardcodeada. |
| `capacity_rule_version` / `capacity_assessment` | regla, snapshot, resultado_centimos, calculado_en | Capacidad reproducible. |
| `loan_request` | worker_id, bank_id, tipo, estado, bloqueante, versión, creada_en | Solicitud formal del trabajador; controla exclusividad. |
| `request_assignment` | request_id, analyst_id, asignado_en | Responsable e historial de asignación. |
| `loan_proposal` | request_id, versión, monto/plazo/tasa/cuota, estado, emitida_en | Condiciones definidas por banco. |
| `authorization` | request_id, evaluación, estado, autorizada_en | Operación autorizada tras aceptación/validaciones. |
| `certificate` | authorization_id, código_publico, estado, período, emisión/vigencia | Evidencia verificable. |
| `capacity_certificate` | trabajador, período, capacidad_emitida, código_publico, emisión, `valid_until` opcional | Constancia informativa independiente; conserva el snapshot de capacidad y su vigencia demostrativa sin crear solicitud ni autorización. |
| `loan` | request_id opcional, worker_id, estado, datos mínimos | Préstamo firmado/histórico. |
| `parameter` | clave, valor tipado, alcance, versión | Configuración administrativa. |
| `audit_event` | actor, acción, entidad, antes/después, instante, correlación | Auditoría inmutable. |
| `idempotency_record` | actor, clave, hash, respuesta, expira_en | Reintentos seguros. |

## Restricciones relevantes

- `loan_request.bank_id` es inmutable luego de `CREADA`; cambiar de banco requiere cerrar la solicitud y crear otra, con auditoría.
- **Propuesta de diseño para la demo:** debe existir como máximo una solicitud bloqueante por trabajador, incluso dentro del mismo banco, para impedir duplicados accidentales. La regla confirmada cubierta por este control es que no exista otra solicitud incompatible hacia otro banco. Estados bloqueantes: desde `CREADA` hasta `FIRMADA`, según el modelo de `STATE_MODEL.md`.
- Una solicitud tiene muchas propuestas históricas, pero una sola propuesta vigente/emitida a la vez.
- Una autorización solo nace de una solicitud aceptada y conserva la evaluación/período/regla exactos usados.
- `certificate.codigo_publico` es único, aleatorio y no expresa datos internos o personales.
- Los listados bancarios filtran por `organization_id` del actor antes de contar, buscar, exportar o devolver filas.

## Privacidad y DTOs

El detalle de planilla existe solo para SAP Web y roles autorizados. Banco, trabajador, administración y verificación pública reciben DTOs distintos de mínimo privilegio; no se serializan filas de SQLite/ORM de forma directa. Las consultas y verificación pública registran auditoría proporcional, sin incluir secretos o detalle sensible.

## Constancia de registro implementada
`request_certificates`: id interno, request_id UNIQUE/FK, public_code UNIQUE, snapshot_json e issued_at. Una fila por solicitud, creada al primer uso; estado actual obtenido de requests y datos de emisión inmutables. Ver [REQUEST_CERTIFICATE.md](REQUEST_CERTIFICATE.md).
