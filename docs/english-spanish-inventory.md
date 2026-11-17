# Inventario para ofrecer el portal en inglés y español

Fecha del inventario: 17 de noviembre de 2026.

**Estado: pospuesto por decisión del usuario.** Se conserva el alcance para retomarlo en el futuro. Este documento no autoriza iniciar la traducción ni modificar la implementación.

## Alcance y tamaño

El portal utiliza TypeScript y JavaScript, con Next.js en el frontend y NestJS en el backend. Company ya ofrece cinco páginas públicas en inglés y español; el portal operativo todavía no tiene un sistema general de idiomas ni una preferencia de idioma en el usuario.

El inventario del código encontró:

- **168 rutas de página**, de las cuales 10 corresponden a las cinco páginas bilingües de Company. Muchas rutas reutilizan formularios; otras contienen varias vistas y diálogos según el rol.
- **401 archivos del frontend con textos candidatos**: 5.628 apariciones y 3.808 textos distintos en el primer barrido, excluyendo Company. Incluyen repeticiones y algunos nombres que se conservarían; no representan una cantidad definitiva de traducciones ni incluyen todos los textos dinámicos o editables de la base de datos.
- **94 rutas de Settings**, distribuidas entre el índice y 37 subáreas.
- **1.970 puntos de construcción de excepciones HTTP en 131 archivos del backend**. Son ubicaciones de código, no errores detectados durante el uso ni frases únicas.
- **37 llamadas de formato con idioma fijo en 26 archivos del frontend**: 36 usan `en-US` y una `es-ES`. Otras dependen del idioma del navegador.

Los conteos excluyen dependencias, compilados y pruebas. Corresponden al código disponible en la fecha indicada; el contenido editable de la base de datos requeriría su propio inventario al retomar el proyecto.

## Pantallas y módulos

| Área | Rutas | Contenido que habría que cubrir |
| --- | ---: | --- |
| Inicio, acceso y perfil | 8 | Dashboard por rol, login, registro, recuperación de contraseña, perfil y marca del dealer |
| Estimados | 5 | Lista, creación, edición, piezas, precios, instalación, revisiones y detalles |
| Órdenes | 5 | Seguimiento, revisiones, importación y pagos de fábrica |
| Instalaciones | 2 | Mediciones, citas, permisos, servicios, aprobaciones, pagos y estados |
| Warehouse | 19 | Inventario, escaneo, pickups, deliveries, conteos, movimientos, almacenes y ventas |
| Portal técnico | 8 | Trabajos, mediciones, recogidas, entregas, materiales y comprobantes |
| Materiales | 2 | Catálogo, compra y órdenes |
| Dealers y referidos | 2 | Red, solicitudes, comisiones, ganancias y pagos |
| Pagos y enlaces públicos | 8 | Estimados compartidos, acuerdos, pagos, ventas y resultados del checkout |
| Settings | 94 | Usuarios, roles, productos, sistemas, colores, cristales, opciones, precios, instalaciones y demás ajustes |
| Términos y SMS | 5 | Documentos, consentimiento, privacidad y condiciones |
| Company | 10 | Cinco páginas lógicas ya bilingües; conectar con la selección general del idioma |
| **Total** | **168** | |

## Elementos compartidos y datos

- Navegación de escritorio y móvil, menú del usuario, pie de página y sesión caducada.
- Botones, filtros, búsquedas, paginación, mensajes de carga, pantallas vacías, confirmaciones, ayudas y etiquetas de accesibilidad.
- Validaciones de formularios y mensajes del backend: campos obligatorios, contraseñas, direcciones, permisos y pagos. Actualmente conviven textos ingleses y españoles.
- Estados de estimados, órdenes, instalación, pagos, recogidas y entregas. Sus valores internos deben mantenerse; se traducirían las etiquetas visibles.
- Catálogos administrables: productos, colores, cristales, opciones, servicios, cargos y descripciones. Los campos actuales suelen tener un único texto y necesitarían traducciones mantenidas junto con el original.
- Fechas, horas, cantidades y presentación de importes. Conservar USD, unidades comerciales, precisión, cálculos y fechas almacenadas.
- Mapas y confirmación de direcciones, compartidos entre instalación y delivery. Google Places actualmente solicita resultados en inglés; separar la presentación del idioma de los identificadores y la dirección validada.

## Documentos y comunicaciones

| Familia | Trabajo previsto |
| --- | --- |
| Estimados y PDF | Cinco modos: client, dealer interno, dealer público, total público y admin. Pantalla, enlace público y PDF tienen representaciones que deben mantenerse coherentes. |
| Contratos y cambios de orden | Resúmenes, aceptación electrónica, comprobantes de firma y versiones del documento. Los contratos de dealers subidos como PDF necesitan versiones documentales propias. |
| Términos y consentimiento | Traducir tanto los controles como el contenido publicado; conservar texto, idioma y versión realmente aceptados. |
| Recibos de entrega | Encabezados, piezas, partes, cantidades, pendientes, fechas y declaración de recepción; Warehouse y técnicos comparten el componente. |
| Facturas y recibos de materiales | Resumen de pedido, factura y comprobantes de pago. |
| Etiquetas y exportaciones | Etiquetas imprimibles y encabezados CSV; distinguir exportaciones para lectura de formatos que otro sistema necesita importar. |
| Correos | Cinco familias: bienvenida, recuperación de contraseña, compartir estimado o contrato, compra de materiales y avisos operativos. Incluye asuntos, cuerpos y botones. |
| SMS y notificaciones del portal | Texto de cada evento, acciones y preferencias; usar el idioma del destinatario. Las notificaciones históricas ya almacenan texto redactado. |
| Aplicación instalada | Dos manifests, portal y técnico, además de nuestra ayuda de instalación para cada plataforma. |
| Approvals del fabricante | Traducir los nombres de los enlaces; conservar PDFs oficiales, series, códigos y selección LMI o LMI + SMI. |

El idioma de los diálogos nativos del navegador, la instalación, la impresión y el visor PDF no depende de las traducciones del portal. Las pantallas externas de pago requieren revisar las opciones del proveedor por separado.

## Dependencias que deben resolverse antes de traducir

1. **Estados usados por la lógica.** Algunas operaciones comparan nombres ingleses guardados en la base. Cambiar esos nombres puede alterar el comportamiento; mantener códigos y valores internos estables y traducir solo su presentación.
2. **Notificaciones interpretadas como datos.** Algunos asuntos de correo se construyen leyendo frases como `Remeasurement`, `order #`, `estimate #` y `Open customer view`. El evento y sus identificadores deben separarse del texto traducido.
3. **Historial.** Las notificaciones actuales guardan `message` y `actionLabel` redactados. Un selector de idioma no basta para traducir fielmente el historial; conservar el texto original como respaldo cuando no existan datos estructurados.
4. **Tres decisiones de idioma.** Distinguir preferencia de interfaz, idioma del documento e idioma del destinatario. Un administrador puede trabajar en español y enviar un estimado en inglés. También hay destinatarios sin cuenta.
5. **Preferencias persistentes.** Guardar idioma por usuario y, cuando corresponda, por documento o destinatario requeriría ampliar contratos de datos y posiblemente migraciones. Elegir el enfoque cuando se retome el proyecto.
6. **Contenido aceptado o firmado.** Conservar contratos, PDFs, consentimientos, hashes y versiones históricas. Las futuras traducciones deben identificarse como nuevas variantes o versiones, sin reescribir la evidencia original.

## Contenido que se conserva

Mantener nombres de personas y empresas, direcciones, notas escritas por usuarios, marcas, nombres oficiales de series, códigos, números de PO, números de aprobación y documentos oficiales del fabricante. Mantener los comandos SMS STOP, START y HELP; traducir sus explicaciones cuando corresponda.

Las descripciones comerciales traducibles del catálogo necesitan distinguirse de los nombres y códigos oficiales. No sustituir masivamente los valores existentes de la base de datos.

## Orden propuesto para retomarlo

1. Actualizar este inventario y acordar un glosario. Candidatos: Estimate → Estimado; Order → Orden; Delivery → Entrega; Pickup → Recogida; Piece → Pieza; Physical part → Parte física. Confirmar si Dealer y PO permanecen como vocabulario habitual.
2. Preparar la estructura común, selector y preferencias, conservando inglés como predeterminado durante la transición.
3. Cubrir acceso, perfil, navegación y componentes compartidos.
4. Traducir y probar recorridos completos por módulo y rol. La mayor carga probable está en Settings, configuración de piezas y estimados, instalaciones y Warehouse.
5. Incorporar documentos y comunicaciones con su selección de idioma independiente.
6. Revisar escritorio, móvil, aplicación instalada y PDF; verificar que cambiar de idioma conserve formularios sin guardar y no altere cálculos, permisos ni documentos.

No hay una fecha o estimación de esfuerzo acordada. La implementación queda pendiente hasta que el usuario decida retomarla.

## Referencias del código

Rutas relativas a los repositorios de frontend y backend:

- Frontend: `src/app/layout.tsx`, `src/app/providers.tsx` y `src/components/company/company-shell.tsx`.
- Textos compartidos: `src/components/data-table.tsx`, `src/components/top-bar.tsx`, `src/components/user-dropdown.tsx` y `src/lib/formatters.ts`.
- Áreas extensas: `src/components/estimates/piece-form.tsx`, `src/app/installations/[id]/installation-detail-client.tsx` y `src/app/warehouse/customer-deliveries/customer-delivery-runs-client.tsx`.
- Backend: `prisma/schema.prisma`, `src/payments/payments.service.ts`, `src/notifications/notification-email.service.ts` y `src/notifications/notifications.service.ts`.
- Documentos: `src/estimates/pdf/estimate-pdf-html.builder.ts`, `src/contracts/contract-pdf.service.ts` y `src/platform-terms/platform-terms.service.ts` del backend.
- Comunicaciones: `src/mail/welcome-email-template.ts`, `src/mail/mail.service.ts`, `src/notifications/notification-sms.service.ts` y `src/sms/sms-program.ts` del backend.
