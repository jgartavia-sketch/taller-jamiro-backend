# Taller Multiservicios Jamiro — API

Express 5 + Prisma 6 + PostgreSQL. Node.js 24 LTS.
Conservar las variables reales del servicio; `.env.example` es una plantilla.
No publicar secretos en Git. En producción usar `NODE_ENV=production`, secretos
aleatorios de al menos 32 caracteres y `FRONTEND_URL` con los orígenes HTTPS
exactos separados por comas. El frontend requiere `NEXT_PUBLIC_API_URL`.

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm start
```

Pruebas: `npm test` (HTTP con repositorio de datos simulado, sin producción).
`npm audit` comprueba las dependencias contra el registro actual.

## Cuentas y permisos

- Admin: `ADMIN_EMAIL`, acceso por `/admin`; cuenta creada con `npm run admin:provision`.
- Mecánicos: `MECHANIC`, registro/búsqueda de clientes, puntos y taller en `/staff`.
- Recepción: `RECEPTION`, registro/búsqueda de clientes, sin puntos ni órdenes.
- Clientes: `/registro`, `/login` y `/mi-cuenta`, acceso solo a sus propias órdenes.

Para agregar Flor e Isaac completar STAFF_3 y STAFF_4 y ejecutar
`npm run staff:provision`. Todos los bloques STAFF presentes deben estar completos;
no agregar bloques vacíos o incompletos a producción. No se desactivan las cuentas
omitidas. Reejecutar un bloque cambia su contraseña e invalida sus sesiones.
Las contraseñas staff requieren 10 caracteres mínimo y 72 bytes máximo.
No ejecutar `admin:provision` si no se pretende cambiar la clave del administrador.
Cerrar sesión invalida todas las sesiones de la misma cuenta en el servidor.

## Despliegue y límites

Ejecutar migraciones antes de iniciar el nuevo backend. Realizar backup de la base.
No usar `prisma migrate reset` ni `db push --accept-data-loss` en producción.
La migración de reparación de repuestos admite una tabla previamente creada a mano.
Si una migración histórica fue aplicada con un nombre distinto o tiene un error
registrado, revisar `_prisma_migrations` antes de usar `migrate resolve`.

Configurar `TRUST_PROXY_HOPS` según la cantidad real de proxies del servicio
(0 local; normalmente 1 en Render, verificar). No configurar confianza global.
Los límites se guardan en memoria y se reinician con el proceso; al escalar la API
se requiere un limitador compartido en Redis o en la puerta de entrada.
Las imágenes se consultan al abrir cada orden; las listas no incluyen base64.
Los detalles muestran las últimas 100 actualizaciones y el cliente las últimas
50 órdenes. El staff tiene paginación de 20 órdenes.

`/api/admin` mantiene el canal de integración con `x-admin-key` exclusivo del
servidor. Nunca colocar esa clave en variables NEXT_PUBLIC ni en el navegador.
Las sesiones JWT siguen almacenadas en localStorage: CSP y expiración reducen
riesgos, pero no equivalen a cookies HttpOnly. No hay autoservicio de recuperación
de contraseñas ni MFA en esta versión.
