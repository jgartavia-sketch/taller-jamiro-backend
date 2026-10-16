# Diagnóstico y correcciones — Taller Multiservicios Jamiro

Fecha: 15 de octubre de 2026. Estado: código corregido y validado localmente;
despliegue y creación de cuentas reales pendientes.

## Código revisado

| Proyecto | Repositorio | Commit de partida | Tecnología real |
|---|---|---|---|
| Frontend | https://github.com/jgartavia-sketch/taller-automotriz-jamiro | ebd633d3ec6a97618025e883bd8354b3a3a9a743 | Next.js + React + TypeScript |
| Backend | https://github.com/jgartavia-sketch/taller-jamiro-backend | 2685fc6ea40f6e30ae9f99dc09a245ab6346a580 | Express + Prisma + PostgreSQL |

El backend de Jamiro no es FastAPI. La revisión se hizo sobre estos repositorios
actuales, no sobre el POS ni sobre otro proyecto. No se realizó push, despliegue,
lectura de la base de producción ni creación de usuarios reales.

## Hallazgos y resultado

| Hallazgo | Riesgo o efecto | Corrección incluida |
|---|---|---|
| 43 fragmentos con codificación dañada en `app/admin/page.tsx` | Tildes y signos ilegibles | Restaurado UTF-8 y agregada comprobación sobre los textos de la aplicación |
| Nombre comercial inconsistente en textos | Identidad confusa | Textos ajustados a Taller Multiservicios Jamiro; logos originales conservados |
| Dependencias vulnerables | Alertas críticas y altas en el árbol de paquetes | Actualizados Next/React, Nodemailer y transitivas; retirado el entorno Vite/Cloudflare sin uso y sustituido el lint que arrastraba paquetes sin parche |
| 32 paquetes afectados en frontend y 7 en backend según `npm audit` inicial | Incluía desarrollo y dependencias transitivas; no equivale a 39 fallos explotados | Auditorías finales completas: 0 alertas en ambos proyectos |
| `dev` usaba Vite y `build/start` usaban Next | Desarrollo y producción inconsistentes | Scripts alineados con Next; documentación y pruebas anteriores de Worker sustituidas |
| No existía registro interno de clientes | Flor no podía desempeñar su función | Nuevo formulario compartido para staff y admin y endpoint autenticado que no entrega sesión ni hash del cliente |
| Todos los staff tenían los mismos permisos | Recepción tendría acceso a puntos y órdenes | Rol RECEPTION limitado en el servidor y en la interfaz; MECHANIC conserva las funciones operativas |
| Aprovisionamiento desactivaba cuentas omitidas | Riesgo de dejar a Leo o Steven sin acceso | Aprovisionamiento aditivo, transaccional, sin desactivaciones implícitas; correo del admin protegido |
| Ejemplos con claves débiles y correos duplicados | Configuración errónea y reutilización de claves inseguras | Plantilla nueva sin contraseñas reales y guía de configuración individual |
| Sin limitación de accesos o formularios públicos | Fuerza bruta y abuso de recursos | Límites por IP, respuesta 429 y Retry-After; configuración explícita de proxies |
| Validación de tipo de JWT incompleta | Ambigüedad entre sesiones de cliente y personal | Tipo explícito customer/staff/admin, algoritmo HS256 y comprobación de cuenta/estado |
| Logout solo retiraba el token del navegador | Un token copiado seguía siendo válido | tokenVersion en base y revocación en logout; reprovisionar contraseñas invalida sesiones anteriores |
| Referido comprobado antes de la transacción | Dos solicitudes podían intentar utilizar el mismo código | Consumo condicionado por código sin uso y no vencido, dentro de la transacción |
| Canje de puntos comprobaba saldo antes de actualizar | Posible saldo negativo en solicitudes simultáneas | Actualización condicionada por saldo suficiente dentro de la transacción |
| Sin máximos en importes del canal administrativo | Entradas fuera de rango | Límites para importes y ajustes |
| Migración de repuestos guardada como archivo sin carpeta/migration.sql | Prisma la ignoraba; instalaciones incompletas | Migración nueva de reparación, probada desde cero y con tabla ya creada |
| Listado cargaba fotos base64 de hasta 100 órdenes | Consumo elevado de red y memoria | Listados livianos, detalle separado y paginación staff de 20 órdenes |
| Módulos admin/staff divergentes | Comportamientos diferentes y errores duplicados | Un solo módulo de taller con token correspondiente a cada portal |
| Órdenes cerradas podían recibir actualizaciones por API | Historial alterable tras la entrega | Rechazo en servidor y control de concurrencia por fecha de actualización |
| Fecha estimada sin validación rigurosa | Fechas imposibles o errores internos | Validación de fecha de calendario y zona de Costa Rica para entrega |
| Foto validada solo por prefijo | Datos arbitrarios etiquetados como imágenes | Validación base64, firma básica JPEG/PNG/WebP y límites de cantidad/tamaño |
| Errores JSON, CORS y registros inexistentes producían errores genéricos | Mensajes confusos y diagnósticos incorrectos | Estados HTTP y mensajes controlados |
| El seguimiento de cliente ocultaba errores de red | Apariencia falsa de que no existían servicios | Mensajes visibles, botón actualizar y carga del detalle bajo demanda |
| Faltaban cabeceras de protección del frontend | Menor defensa frente a framing e inyección | CSP, nosniff, política de permisos y referrer; API con no-store |
| Login de cliente permanecía en la pantalla de acceso | Paso adicional y confusión | Redirección a Mi cuenta después del acceso |

El recuento de alertas depende del registro npm consultado en esta fecha. Incluye
paquetes de desarrollo. Se adjuntan los JSON originales antes y después.
Cero alertas npm no constituye una garantía de ausencia de vulnerabilidades.

## Permisos previstos

| Persona | Acceso | Funciones |
|---|---|---|
| Jairo | /admin | Lista y registro de clientes, puntos y procesos del taller |
| Leo | /staff, MECHANIC | Registro/búsqueda, puntos, recepción y actualización de servicios |
| Steven | /staff, MECHANIC | Mismas funciones operativas que Leo |
| Flor | /staff, RECEPTION | Buscar y registrar clientes; sin puntos ni órdenes |
| Isaac | /staff, MECHANIC | Mismas funciones operativas que Leo |
| Cliente | /mi-cuenta | Su tarjeta, puntos, referidos y sus propias órdenes |

Las cuentas reales y su cantidad activa deben comprobarse con `npm run staff:check`.
No se asume que existan exactamente cuatro staff actualmente. No se desactiva
ninguna cuenta de producción desde este paquete.

## Verificación realizada

- Compilación de producción de Next.js y comprobación TypeScript: aprobadas.
- ESLint del código de aplicación: aprobado, sin errores ni advertencias.
- Prueba de integridad UTF-8: aprobada.
- 16 pruebas backend: aprobadas. Cubren puntos, acceso anónimo, login con hash,
  rol de recepción, staff inactivo, separación cliente/staff/admin, propiedad de
  órdenes, errores HTTP, fotos, fechas, tokens vencidos/revocados, firma incorrecta
  y limitación de solicitudes. La capa de datos está simulada en estas pruebas.
- Prisma Client generado y esquema Prisma validado.
- Seis migraciones SQL ejecutadas desde cero en PostgreSQL PGlite aislado;
  reparación repetida sin error y comprobaciones de consumo único/saldo.
  Esto valida el SQL y sus condiciones, no prueba concurrencia real entre varios
  servidores de aplicación ni sustituye una prueba contra el PostgreSQL de Render.
- Navegador Chromium con API simulada: registro desde recepción, permisos visibles
  de mecánico, acceso a recepción de vehículos y registro desde admin, login de
  cliente con redirección, rutas públicas y pantallas móviles sin desbordamiento.
  Sin errores JavaScript en los flujos ejercitados. No se enviaron fotos a producción.
- `git diff --check` aprobado en ambos repositorios.
- Revisión por firmas comunes de credenciales en archivos actuales: sin coincidencias.
  No se afirma una auditoría forense exhaustiva del historial Git.

Las capturas de trabajo fueron usadas solo para inspección; el paquete incluye
código y registros de validación, no capturas con datos personales.

## Lo que sigue pendiente o limita el alcance

1. **Correos de Flor e Isaac y claves individuales**: necesarios para provisionar
   cuentas reales. No se inventaron correos ni se cambiaron contraseñas existentes.
2. **Prueba con base y despliegue reales**: faltan conexión de producción,
   migración en Render, variables de Vercel, entrega SMTP y validación de los cinco
   accesos reales. El ZIP por sí solo no crea usuarios ni aplica migraciones.
3. **Sesiones en localStorage**: se conserva el mecanismo existente, con CSP,
   expiración predeterminada de 8 h y revocación en servidor. No se migró a cookies
   HttpOnly. La CSP admite scripts inline por el funcionamiento actual de Next/GA.
   Una inyección ejecutable podría seguir comprometiendo la sesión.
4. **Sin recuperación autónoma de contraseña, MFA ni verificación de correo**:
   son capacidades ausentes, no funciones probadas. El personal puede cambiarse
   mediante los comandos de aprovisionamiento. No se introdujo un flujo inseguro
   de recuperación basado solo en conocer un correo.
5. **Limitador en memoria**: adecuado como defensa básica de una instancia; se
   reinicia con el proceso. Varias réplicas necesitan estado compartido o gateway.
6. **Fotos en PostgreSQL**: se conserva el almacenamiento base64; la validación
   de firma es básica, no antivirus ni análisis completo del formato. El detalle
   muestra las últimas 100 actualizaciones y el cliente las últimas 50 órdenes.
   El almacenamiento y las fotos deben monitorearse. Migrar a objetos privados y
   paginar todo el detalle requiere una ampliación posterior.
7. **Gestión de usuarios**: sigue siendo por scripts, no hay panel para altas,
   bajas o cambios de permisos. El administrador mantiene un canal separado con
   x-admin-key para integraciones; esa clave nunca debe llegar al navegador.
8. **Auditoría limitada al código y entorno local**: no se inspeccionaron permisos
   del hosting, respaldos reales, historial completo de secretos, dominio/DNS,
   infraestructura, accesibilidad exhaustiva ni se realizó un pentest externo.
9. **Actualización coordinada**: cambian los endpoints de listados y sesiones.
   Actualizar backend/migraciones y frontend en la misma ventana de mantenimiento;
   todos deben volver a ingresar. Guardar backup antes de modificar producción.
10. **Integridad de datos previos**: no se han examinado duplicados históricos,
    saldos, facturas o roles en la base real. Los bloqueos agregados previenen los
    casos descritos hacia adelante, no corrigen datos históricos sin inspección.

## Referencias técnicas

- https://expressjs.com/es/advanced/best-practice-security/
- https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions
- Avisos concretos y versiones: JSON de `npm audit` en `verificacion/`.

El resultado es una actualización revisable con pruebas locales, no una
certificación de seguridad ni confirmación de que producción ya fue actualizada.

ACTUALIZACIÓN — CONTRASEÑA Y CONFIRMACIÓN
El registro público y el registro interno de clientes exigen escribir dos veces
la contraseña y comprobar que ambas coincidan. Texto visible:
“Mínimo 8 caracteres, con al menos una letra mayúscula y un número. Combiná letras y números.”
La validación se aplica en navegador y servidor. Las contraseñas actuales para
iniciar sesión no se cambian. Ejemplo que cumple: Abcdefg1 (no usarlo como clave real).

ACTUALIZACIÓN — COMPATIBILIDAD MÓVIL
Se agregó la revisión de Chromium y WebKit con perfiles táctiles y pantallas
pequeñas, correcciones del menú, formularios, WhatsApp y procesamiento de fotos.
Ver MOVILES.md para los cambios, pruebas y límites de la emulación.

También se corrigieron acciones móviles secundarias: continuación explícita a
WhatsApp después de registrar servicios/repuestos, errores visibles de referidos,
solicitud de canje mediante enlace y reemplazo de la última visita de ejemplo por
la última compra disponible en el historial. Se retiró el modal de demostración
que no tenía entrada desde la interfaz. No se automatizan descuentos de canje.
