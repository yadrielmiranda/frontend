# About V7 y revisión SMS — publicación y pruebas

Fecha de revisión: 17 de noviembre de 2026.

## Alcance

El About V7 entregado por Anthony se integró en React, TypeScript y JavaScript dentro del portal Next.js existente. Conserva los textos, el diseño y los cinco archivos originales de imágenes; los enlaces internos usan el mismo dominio de la página abierta.

| Inglés | Español |
| --- | --- |
| `/company` | `/es/company` |
| `/for-ai` | `/es/for-ai` |
| `/resources` | `/es/resources` |
| `/resources/prepare-your-quote` | `/es/resources/prepare-your-quote` |
| `/resources/compare-impact-products` | `/es/resources/compare-impact-products` |

Las diez páginas entregan su contenido en el HTML inicial y quedan fuera de las solicitudes de sesión, navegación del portal y avisos de acceso. Se añadieron metadatos, enlaces de idioma, datos estructurados, `/sitemap.xml` y `/llms.txt` con las direcciones oficiales. El registro de clientes conserva `/login/register`; el acceso de distribuidores continúa mediante ventas.

La fuente de las políticas SMS está en el backend, en `src/sms/sms-program.ts`. Se incorporó la cláusula inglesa solicitada y se revisó su coherencia con el resto del texto. La política sigue versionada para conservar evidencia del consentimiento. En el frontend se aclaró el consentimiento junto al teléfono y se revisaron las etiquetas y enlaces de términos y privacidad. El registro conserva las dos opciones SMS independientes, opcionales y desmarcadas inicialmente.

Esta actualización incluye frontend y backend. No añade dependencias, Python, variables de entorno ni migraciones de base de datos. Los cambios anteriores de deliveries son independientes de esta revisión.

## Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| About V7: contenido de las diez páginas, acceso público aislado del portal, metadatos, idiomas, redirecciones de slash final, sitemap, llms y hashes de imágenes | 28 pruebas aprobadas |
| Backend: consentimiento, registro, eventos SMS y regresiones relacionadas | 109 pruebas aprobadas |
| Frontend: registro y presentación del consentimiento SMS | 9 pruebas aprobadas |
| Total de pruebas automatizadas anteriores | 146 aprobadas |
| TypeScript del frontend | Aprobado |
| TypeScript de producción del backend | Aprobado |
| Configuración completa de TypeScript del backend, incluyendo archivos ajenos al build de producción | Cuatro errores preexistentes de exports relacionados con `CrystalsService`, `TintsController` y `TintsService`; no provienen de esta actualización |
| Comparación visual con el original en escritorio de 1440 px y móvil de 390 px; revisión de español en tablet de 768 px | Diseño e imágenes verificados, sin desbordamiento horizontal |
| Navegación pública y registro local | Revisados con API simulada; no se crearon cuentas ni se enviaron correos o SMS |
| Build completo de producción del frontend (`next build`) | Aprobado; 120 páginas estáticas generadas, incluidas las diez de V7 |

Para repetir la verificación de V7 desde el directorio del frontend:

```bash
node scripts/test-company-v7.cjs
```

Con el frontend de pruebas ya iniciado, el siguiente comando añade consultas HTTP públicas de solo lectura:

```bash
node scripts/test-company-v7.cjs --base-url http://127.0.0.1:3000
```

La referencia de comparación está incluida en `scripts/data/company-v7-reference.json`; no depende de la carpeta Downloads ni del ZIP original.

## Publicación por Git

1. Revisar los cambios y registrar las revisiones actuales de frontend y backend para poder volver a ellas. Conservar los archivos de entorno y la configuración existente del VPS.
2. Publicar y traer las revisiones aprobadas mediante el flujo habitual de Git en ambos repositorios. No copiar el ZIP sobre la aplicación ni ejecutar sus herramientas Python.
3. Ejecutar `npm run build` dentro del backend y `npm run build` dentro del frontend. Si cualquiera falla, resolver el fallo antes de activar esa versión.
4. Reiniciar los servicios existentes de backend y frontend con el procedimiento habitual del VPS. No crear procesos duplicados ni cambiar DNS, certificados o configuración de Twilio para este despliegue.
5. Completar la revisión en producción indicada abajo y conservar sus resultados. La solicitud a Twilio es un paso posterior; esta actualización no la presenta automáticamente.

## Pendiente en producción y en Twilio

- Abrir sin sesión, en una ventana privada, las diez páginas bajo `https://www.authenticevolutionco.com`, además de `/llms.txt`, `/sitemap.xml`, `/login/register`, `/sms/privacy` y `/sms/terms`. Confirmar que el dominio y sus redirecciones funcionan, que las páginas e imágenes cargan y que no aparecen enlaces al preview.
- Confirmar que las páginas públicas que deben indexarse no reciben `noindex` desde el VPS o un proxy. No reemplazar las reglas existentes de `robots.txt` con las del paquete de preview.
- Revisar en producción inglés, español, cambio de idioma, FAQ, enlaces de cuenta gratuita, contacto de ventas, términos y privacidad en móvil y escritorio.
- Verificar los datos públicos de la empresa y su coincidencia con el perfil empresarial de Twilio. Las imágenes y textos aprobados no sustituyen esa comprobación del perfil real.
- Revisar que el registro público muestre ambas casillas SMS desmarcadas y permita continuar sin elegirlas. Cualquier prueba que cree una cuenta debe ser controlada y autorizada, usando datos de prueba; no se ha realizado aquí contra producción.
- Confirmar en el servicio de mensajería de Twilio la configuración efectiva de Advanced Opt-Out, las respuestas STOP/HELP, el contacto de soporte y la conexión del webhook. El comportamiento real de esos ajustes no se comprobó desde la consola de Twilio.
- Probar STOP/HELP y la baja únicamente con un número de prueba autorizado cuando el servicio lo permita. No usar clientes reales ni campañas como prueba.
- Preparar capturas legibles del consentimiento, enlaces públicos, usos reales, ejemplos de mensajes y volumen previsto. Revisar con Anthony el siguiente paso del caso de soporte antes de reenviar la solicitud. No borrar, liberar ni sustituir el número.

Estas comprobaciones locales no equivalen a aprobación de Twilio. La aprobación y las pruebas sobre la configuración real del proveedor siguen pendientes.

## Volver a la versión anterior

Si es necesario revertir la publicación, restaurar las revisiones anteriores de frontend y backend mediante el procedimiento habitual de Git, reconstruir ambos proyectos y reiniciar sus servicios. Verificar nuevamente el About, el registro y las políticas públicas.

No restaurar una copia antigua de la base de datos ni borrar los registros de consentimiento. Los consentimientos capturados con sus fechas, categorías y versiones deben conservarse aunque se vuelva a una versión anterior del código. Si se revierte el texto de la política, volver a revisar su contenido antes de presentar la solicitud a Twilio.
