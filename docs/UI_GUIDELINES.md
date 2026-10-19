# Guía visual y design system

## Objetivo

La demo debe sentirse como una sola solución coherente aunque SOMOS, Préstamos y SAP Web tengan contexto distinto. SOMOS puede recrear una apariencia específica; las superficies nuevas comparten fundaciones y componentes.

## Identidad institucional de Préstamos

La superficie nueva de Préstamos usa la identidad institucional de EsSalud sin reproducir ni suplantar una plataforma operativa. Es una demostración con datos ficticios, por lo que cada vista privada del trabajador conserva una identificación discreta de **Entorno de demostración**.

### Fuentes y recursos aprobados para la demo

- [Guía rápida de uso de marca EsSalud](https://www.essalud.gob.pe/downloads/Guia_Rapida_de_Uso_de_Marca.pdf): referencia del azul corporativo `#0077C8`.
- [Manual de identidad gráfica EsSalud 2016](https://www.essalud.gob.pe/transparencia/pdf/manuales/manual_identidad_grafica_EsSalud2016.pdf): referencia de proporciones y uso institucional de marca.
- El recurso local `frontend/src/assets/essalud/essalud-logo.jpg` procede de la publicación institucional de EsSalud y se usa sin deformarlo, sobre fondo blanco y en tamaño compacto.

La aplicación no debe afirmar representación oficial ni recopilar credenciales institucionales reales.

| Token de Préstamos | Valor | Uso |
| --- | --- | --- |
| `loan-blue` | `#0077C8` | Encabezado del módulo, acción principal, foco y jerarquía institucional. |
| `loan-blue-strong` | `#005F9F` | Hover de acción principal y texto de acción secundaria. |
| `loan-ink` | `#17324D` | Títulos y cifras principales. |
| `loan-wash` | `#EDF6FC` | Superficies informativas suaves. |
| `loan-teal` | `#007F78` | Acento reservado para disponibilidad o información complementaria; no sustituye al azul institucional. |
| Semánticos | tokens globales | Éxito, advertencia, error e información; nunca solo por color. |

## Lenguaje de la experiencia del trabajador

La redacción se dirige al trabajador en español formal peruano: frases breves, verbos claros y una sola idea por mensaje. Como referencia de terminología, el [Banco de la Nación](https://www.gob.pe/es/39021-solicitar-un-prestamo-descuento-por-planilla) y [BBVA Perú](https://www.bbva.pe/personas/productos/prestamos/personales/por-convenio.html) distinguen la evaluación de la entidad financiera, las cuotas y el descuento por planilla. Estas fuentes no sustituyen las reglas de EsSalud ni agregan políticas crediticias a la demo.

| Usar | Evitar | Razón |
| --- | --- | --- |
| `cuota mensual disponible` | `monto de préstamo disponible` | La capacidad es un importe mensual para cuota; no garantiza ni representa el desembolso. |
| `solicitud de evaluación` | `solicitud de préstamo aprobada` | La entidad financiera evalúa y define la propuesta. |
| `propuesta de la entidad financiera` | `oferta de EsSalud` | EsSalud no define monto, plazo, tasa ni cuota. |
| `autorización` o `constancia` | `préstamo vigente` | Son hitos distintos del flujo. |
| `No registra préstamos vigentes` | referencias repetidas a `datos demostrativos` | El carácter ficticio se informa una vez en el entorno, no dentro de cada resultado. |

- No mostrar al trabajador códigos de reglas, versiones de fórmula, trazabilidad interna ni identificadores técnicos como `CAP-DEMO-1`.
- Confirmar una acción solo después de la respuesta exitosa del backend. La notificación debe describir la acción exacta, por ejemplo: “La solicitud fue registrada y enviada a la entidad financiera.”
- Las notificaciones temporales de éxito se consumen una sola vez en la ruta de destino, pueden cerrarse y nunca se restauran al recargar. Una descarga de constancia no genera ni confirma una nueva operación.
- Las restricciones explican qué ocurre y dirigen a la siguiente acción. Ejemplo: una solicitud activa ofrece “Ver mi solicitud”; un período restringido mantiene la consulta de capacidad y explica que no admite nuevos registros.
- Los estados vacíos indican qué se mostrará cuando exista información; no repiten explicaciones técnicas del sistema.

## Tokens iniciales

Definir tokens CSS o equivalentes centralizados, nunca valores repetidos dentro de componentes. No hardcodear colores o espaciado cuando exista token:

| Grupo | Propuesta |
| --- | --- |
| Color | `brand`, `accent`, `success`, `warning`, `danger`, `info`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `focus`. La superficie de Préstamos aplica los tokens institucionales documentados arriba. |
| Espaciado | Escala de 4 px: 4, 8, 12, 16, 24, 32, 40, 48. |
| Tipografía | Una familia sans-serif del sistema o autorizada; escala 12, 14, 16, 20, 24, 32. |
| Radio | 4, 8 y 12 px, según jerarquía. |
| Sombra | `sm`, `md` y `lg` discretas; evitar sombras arbitrarias. |
| Layout | Contenedor máximo, grilla responsive y padding definido por breakpoint. |

Los valores cromáticos de las demás superficies se incorporan solo después de verificar su identidad aplicable; no se extiende una paleta por conveniencia visual.

## Reglas de composición

- Si existe un componente compartido, reutilizarlo: no crear una segunda implementación equivalente.
- Cada página usa `PageHeader` consistente con título, contexto y acciones. `BackButton` solo cuando existe destino lógico; no crear variantes ad hoc.
- Formularios usan `FormField`, etiquetas visibles, ayuda/error uniforme y acciones al final con orden consistente.
- Los selectores nativos conservan accesibilidad de teclado; si se personalizan, ambos controles de una pantalla comparten altura, icono SVG, foco y estado inválido.
- En una solicitud, el trabajador selecciona primero el tipo y la entidad financiera; la advertencia de exclusividad se ubica antes de la única acción de registro y explica la restricción sin desplazar la decisión principal.
- La descarga del PDF de autorización aparece solo para solicitudes con autorización y constancia vigentes. La constancia de registro de solicitud es un documento diferente: su descarga aparece una sola vez dentro de Información de la solicitud, incluso en CREADA, con alcance explícito, icono, carga y error accesibles. El documento usa la identidad de la demo y su QR apunta a la verificación pública existente; las solicitudes en evaluación, rechazadas o canceladas no ofrecen la descarga de autorización, pero pueden conservar su constancia de registro.
- La constancia informativa de capacidad es una acción del resumen de capacidad y un acceso secundario desde `Mis solicitudes`; nunca se repite por tarjeta de solicitud. Debe nombrarse como informativa, mostrar el período emitido y diferenciarse visualmente de la constancia de autorización.
- La verificación pública distingue existencia del registro, vigencia demostrativa e información/autorización. Para una constancia de capacidad, `VIGENTE`, `VENCIDA` o `VIGENCIA_NO_DETERMINADA` se comunica con texto y color; la capacidad y el período son el foco, mientras código e identificación enmascarada son secundarios.
- Tablas usan `DataTable` o su patrón único: encabezado, densidad, estado vacío, carga, error, paginación y responsive iguales salvo necesidad documentada.
- Estados se presentan con `StatusBadge`; el color nunca es la única señal.
- Los modales usan `Dialog` y confirman efectos relevantes con título, descripción, acción primaria y cancelación consistentes.
- Las acciones usan `Button`; no crear variantes locales de botones por pantalla.
- Usar diseño responsive desde móvil, contraste adecuado, foco visible, navegación de teclado y texto claro en español.
- No usar emojis en aplicación, iconos, datos demo ni documentación de producto. Usar iconografía SVG uniforme y con etiquetas accesibles cuando sea necesario.

## Variantes por superficie

SOMOS usa un shell específico y mínimo. Préstamos prioriza claridad para trabajador/banco y pasos de estado. SAP Web prioriza búsqueda, contexto del período y detalle legible. Estas diferencias viven en layouts, no en duplicados de botones, formularios, tablas o tokens.

## Control de consistencia

`/dev/ui` es el catálogo visual obligatorio previo a multiplicar pantallas. Toda variación nueva se agrega y revisa allí primero. Una excepción de componente/patrón requiere justificación en el PR o en `DECISIONS.md` si altera la arquitectura visual.
