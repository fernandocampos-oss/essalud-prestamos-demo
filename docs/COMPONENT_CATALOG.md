# Catálogo de componentes compartidos

El primer desarrollo visual debe crear y documentar este catálogo en `/dev/ui` antes de multiplicar pantallas. Si el componente existe, su uso es obligatorio; no se crean equivalentes locales. Cada componente indica estados normales, carga, error, deshabilitado y accesibilidad cuando aplique.

| Componente | Responsabilidad | Variantes o notas |
| --- | --- | --- |
| `AppShell` | Navegación, cabecera y área de contenido. | Shell de SOMOS y shell de aplicaciones comparten fundaciones. |
| `PageHeader` | Título, descripción/breadcrumb y acciones. | No duplicar encabezados por feature. |
| `Button` | Acción principal, secundaria, terciaria y destructiva. | Tamaños y estado de carga uniformes. |
| `BackButton` | Navegación contextual. | Recibe destino/etiqueta explícitos. |
| `Card` | Agrupar información. | Superficie, padding y jerarquía por tokens. |
| `StatusBadge` | Estado de operación, período, préstamo o constancia. | Mapa centralizado enum → etiqueta/color. |
| `DataTable` | Listados tabulares. | Columnas, loading, empty/error, orden y paginación consistentes. |
| `Pagination` | Navegación de lista. | Parte de `DataTable` o reutilizable. |
| `FormField` | Label, control, ayuda y error. | Compatible con inputs/selects/textarea. |
| `Dialog` | Confirmación y edición acotada. | Foco atrapado y cierre predecible. |
| `Alert` | Mensajes de éxito, advertencia, error e información. | No sustituye validación en línea. |
| `EmptyState` | Ausencia de resultados o acceso. | Mensaje y acción opcional. |
| `Breadcrumb` | Ubicación en áreas administrativas. | Omitir si no aporta orientación. |
| `DefinitionList` | Pares de etiqueta/valor para capacidad/constancia. | Evita tarjetas improvisadas. |
| `Money` / `DateTime` | Formateo de valores. | Nunca incluye regla de negocio. |

## Reglas de propiedad

- `shared/ui` posee tokens, componentes básicos y sus estilos. Los features los componen, no los copian.
- La tabla de estados se mantiene centralmente: enum → etiqueta → variante de `StatusBadge` → texto de ayuda.
- Una pantalla puede agregar columnas, contenido o acción contextual; no puede reemplazar arbitrariamente el comportamiento común de tabla, formulario, botón, modal o regreso.

Los componentes se mantienen presentacionales. Consultas, permisos y transiciones pertenecen a servicios/fachadas de feature y al backend.
