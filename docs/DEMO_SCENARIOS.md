# Escenarios y dataset de demostración

## Principio de datos

Todos los nombres de personas, documentos, códigos, cuentas, montos, conceptos y constancias son ficticios. Las entidades financieras del catálogo se muestran como referencias textuales para la presentación, sin logotipos, integración, convenio, autorización ni relación comercial afirmada. Cada seed debe marcarse como demostrativo.

## Dataset mínimo requerido

| Alias ficticio | Situación | Uso en demo |
| --- | --- | --- |
| Andrea Salazar | Sin préstamo vigente y capacidad favorable. | Consulta y creación de solicitud `NUEVO`. |
| Bruno Cárdenas | Préstamo vigente. | Bloqueo de `NUEVO`; conversación de ampliación/compra de deuda. |
| Carmen Rivas | Capacidad baja/cero. | Explicar resultado sin prometer crédito. |
| Diego Paredes | Ingresos variables. | Mostrar clasificación/regla de SAP Web cuando esté definida. |
| Elena Torres | Descuentos adicionales. | Privacidad: banco no ve el detalle. |
| Fabio Mendoza | Préstamo próximo a finalizar. | Cierre de período y liberación administrativa. |
| Gabriela Núñez | Operación de ampliación. | Estado y trazabilidad. |
| Hugo Valdez | Operación de compra de deuda. | Estado y trazabilidad. |
| Inés Castro | Período restringido para nuevas solicitudes. | Consulta disponible, inicio formal denegado. |

El catálogo de presentación incluye Banco de Crédito del Perú (BCP), BBVA Perú e Interbank, con analistas demo aislados por organización. Su uso fue autorizado exclusivamente como referencia nominal para material de presentación; no representa integración, convenio ni participación de las entidades.

## Recorrido ejecutivo recomendado

1. Entrar por SOMOS como Andrea, ir a Préstamos y consultar capacidad para un período abierto.
2. Explicar que el resultado es oficial, trazable y no es una solicitud ni una oferta de crédito.
3. Crear una solicitud formal para BCP y mostrar que una nueva solicitud hacia BBVA Perú queda bloqueada mientras la primera esté activa.
4. Cambiar al analista BCP, tomar la solicitud, registrar propuesta y mostrar la constancia con datos mínimos después de la aceptación/autorización.
5. Abrir la misma URL/acción con el analista BBVA Perú y demostrar que no puede acceder a la solicitud ajena.
6. Entrar a SAP Web y explicar de dónde provienen, de manera conceptual, el resumen de capacidad y conceptos ficticios.
7. Mostrar período restringido: la consulta sigue disponible, pero una nueva solicitud formal no inicia.
8. Mostrar el caso de préstamo finalizado pendiente de cierre y el seguimiento administrativo, sin afirmar integración externa.

## Casos problemáticos que vale demostrar

- Doble clic/reintento al autorizar: una sola transición y un evento de auditoría.
- Dos analistas toman la misma solicitud: uno obtiene conflicto controlado.
- Constancia vencida/revocada: la verificación pública muestra el estado real y no filtra detalles.
- Trabajador con préstamo vigente intenta `NUEVO`: explicación clara y opciones condicionadas a política.
