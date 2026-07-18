# RoMa — Backend

Backend del formulario de contacto de RoMa. Node.js + TypeScript + Fastify + Prisma (MySQL) + Nodemailer.

## Levantar el proyecto

Requiere una base de datos MySQL accesible (en producción, el servidor Contabo ya provisionado; en local, cualquier MySQL/MariaDB, incluido uno en Docker).

```bash
npm install
cp .env.example .env   # ajusta DATABASE_URL, FRONTEND_URL y las demás variables
npx prisma migrate dev # crea la tabla contact_submissions
npm run dev            # levanta el servidor con recarga automática (puerto 3000 por defecto)
```

Otros comandos:

```bash
npm run build      # compila a dist/
npm run start      # corre el build compilado (producción)
npm run typecheck  # type-check sin emitir archivos
```

## Variables de entorno

Ver `.env.example`. Las más importantes:

| Variable                      | Uso                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Cadena de conexión MySQL de Prisma.                                                                             |
| `FRONTEND_URL`                 | Único origen (además de `localhost:5173` en dev) permitido por CORS — nunca se usa `*`.                        |
| `ZOHO_SMTP_*`                  | Credenciales SMTP de Zoho. Mientras falten, el envío de correo se omite de forma controlada (log, no crash).    |
| `CONTACT_NOTIFICATION_EMAIL`   | Destinatario interno de la notificación de cada envío del formulario.                                            |

`src/config/env.ts` valida todas las variables con Zod al arrancar — si falta algo obligatorio (`DATABASE_URL`, `FRONTEND_URL`, `CONTACT_NOTIFICATION_EMAIL`), el proceso no arranca y explica qué falta.

## Endpoint

**`POST /api/contact`**

- Body JSON: `{ nombre, correo, telefono, empresa?, mensaje, website }` (`website` es el honeypot, siempre vacío en un envío real).
- `Content-Type` distinto de `application/json` → `415`.
- Payload inválido → `422` con `{ errors: { campo: "mensaje" } }`.
- Honeypot (`website`) con contenido → `200` con éxito falso, sin guardar nada ni enviar correo.
- Éxito → `201` con `{ success: true, id }`. El registro se guarda en `contact_submissions` primero; el correo (notificación interna + auto-respuesta) es best-effort — si falla, el registro se conserva con `email_sent = false` para un futuro reintento.
- Rate limit: 3 requests / 10 minutos por IP, solo en esta ruta.

## Estructura

```
src/
├── modules/contact/   # schema (Zod), repository (Prisma), service, controller, routes
├── plugins/            # cors, rate-limit, prisma (decorador fastify.prisma)
├── config/env.ts        # validación de variables de entorno al arranque
├── utils/mailer.ts      # cliente Nodemailer + plantillas de correo
├── app.ts                # registro de plugins y rutas
└── server.ts              # entrypoint
```

## Notas de seguridad

- CORS solo acepta `FRONTEND_URL` (+ `localhost:5173` en dev) — nunca un wildcard.
- El backend es la fuente de verdad de la validación: aunque el frontend valide con las mismas reglas (`frontend/src/types/contact.ts`), este servicio nunca confía solo en eso.
- El honeypot vive oculto vía CSS en el frontend (no `type="hidden"`) para dificultar su detección por bots simples.
