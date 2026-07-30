# Branding por Organización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cargo/Teléfono in the client activation form with organization logo + corporate colors, applied dynamically (and safely, scoped) to the client's own navbar/sidebar/accent buttons.

**Architecture:** Cargo/teléfono move to admin-creation-time (captured once, fixed). A new `organizationBranding` backend module handles the client's one-time branding save (atomic, race-safe) and a public logo-serving endpoint (avoids cross-site cookie issues in production). Colors travel in `/api/auth/me`; the logo is served from its own cacheable, unauthenticated endpoint. Tailwind arbitrary-value classes reference 2 CSS custom properties set only for CLIENT sessions, with native `var(..., #fallback)` defaults — never touching admin sessions or the platform-wide color system.

**Tech Stack:** Fastify + Prisma + Zod (backend), Vue 3 `<script setup>` + Pinia + Tailwind v4 (frontend), MySQL/MariaDB.

## Global Constraints

- No automated test suite in this project — verification is `npm run typecheck` (backend and frontend) + manual browser verification (desktop and mobile), per established project convention. Do not invent a test framework.
- No intermediate git commits during execution — this session's standing rule. The controller snapshots task boundaries via `git stash create` (no real commits), and the user reviews/confirms the exact final commit message before anything is committed.
- Non-interactive Prisma migration flow (no TTY): `prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > migration.sql` → review the SQL → `prisma db execute --file <path> --schema prisma/schema.prisma` → `prisma migrate resolve --applied <name>` → `prisma generate`. `prisma migrate dev` does not work in this sandbox.
- Logo max size: **500KB** (binary), validated both client-side (before upload) and server-side (decoded byte length) — never trust client-only validation.
- Colors are hex `#rrggbb` (7 chars), exactly what `<input type="color">` emits.
- The logo-serving endpoint `GET /api/organizations/:organizationId/logo` is **public, no `requireAuth`** — a company logo is not sensitive data, and this avoids a real cross-site-cookie bug that would only surface in production (see spec's "Corrección de diseño" note), never in local testing.
- The client's own branding-save endpoint (`PATCH /api/dashboard/organization/branding`) must use an **atomic conditional update** (`updateMany` with `primaryColor: null` in the `where`) — never a separate read-then-write — to protect against two users of the same new organization activating near-simultaneously.
- `logoBase64` must never be dumped wholesale into `AuditLog.metadata` (up to ~680KB of base64 text) — log a boolean `logoChanged` flag instead.
- Full spec: `docs/superpowers/specs/2026-07-28-organization-branding-design.md`.

---

## Task 1: Prisma schema — Organization branding fields + AuditAction

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_organization_branding/migration.sql`

**Interfaces:**
- Produces: `Organization.logoBase64: String?`, `Organization.primaryColor: String?`, `Organization.secondaryColor: String?`; `AuditAction.ORGANIZATION_BRANDING_SET`.

- [ ] **Step 1: Edit the `Organization` model**

In `backend/prisma/schema.prisma`, find the `Organization` model (currently ends with `notifications Notification[]` before the closing brace) and add 3 fields right after `updatedAt`:

```prisma
model Organization {
  id     String @id @default(cuid())
  nombre String @db.VarChar(255)
  /// Nullable: organizaciones creadas antes del rediseño de auth no
  /// necesariamente lo tienen todavía. El flujo de creación de empresa por
  /// el admin (Fase B.3) lo exige a partir de ahora.
  nit          String?  @unique @db.VarChar(20)
  contactEmail String?  @map("contact_email") @db.VarChar(255)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  /// Data URI completo (data:image/png;base64,... o data:image/svg+xml;base64,...)
  /// — nunca solo el payload, así se sirve directo sin reconstruir el prefijo.
  /// LongText (no Text, límite 64KB en MySQL) para caber un logo de hasta 500KB.
  logoBase64     String? @map("logo_base64") @db.LongText
  /// Hex #rrggbb — formato nativo de <input type="color">.
  primaryColor   String? @map("primary_color") @db.VarChar(7)
  secondaryColor String? @map("secondary_color") @db.VarChar(7)

  users           UserOrganization[]
  services        OrganizationService[]
  workPoints      WorkPoint[]
  variableUploads VariableUpload[]
  auditLogs       AuditLog[]
  notifications   Notification[]

  @@map("organizations")
}
```

- [ ] **Step 2: Add the AuditAction enum value**

Find `enum AuditAction` in the same file (ends with `VARIABLE_READING_CORRECTED`) and add one value:

```prisma
enum AuditAction {
  LOGIN
  LOGIN_FAILED
  LOGOUT
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  ROLE_CHANGED
  ORG_SERVICE_GRANTED
  ORG_SERVICE_REVOKED
  DASHBOARD_ACCESSED
  USER_CREATED_BY_ADMIN
  ACTIVATION_INVITE_RESENT
  ACCOUNT_ACTIVATED
  USER_SUSPENDED
  USER_REACTIVATED
  PROFILE_UPDATED
  VARIABLES_UPLOADED
  ORGANIZATION_UPDATED
  SERVICE_CREATED
  SERVICE_UPDATED
  VARIABLE_READING_CORRECTED
  /// Cliente guarda logo/colores por primera vez en la activación (branding
  /// por organización, 2026-07-28).
  ORGANIZATION_BRANDING_SET
}
```

- [ ] **Step 3: Generate and review the migration SQL**

Run from `backend/`:
```bash
npx prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > /tmp/branding_migration.sql
cat /tmp/branding_migration.sql
```
Expected: `ALTER TABLE organizations ADD COLUMN logo_base64 LONGTEXT NULL, ADD COLUMN primary_color VARCHAR(7) NULL, ADD COLUMN secondary_color VARCHAR(7) NULL;` plus an `ALTER TABLE audit_logs MODIFY COLUMN action ENUM(...)` including `ORGANIZATION_BRANDING_SET`.

- [ ] **Step 4: Create the migration folder and apply it**

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_organization_branding
cp /tmp/branding_migration.sql prisma/migrations/$(date +%Y%m%d%H%M%S)_organization_branding/migration.sql
```
(Use one consistent timestamp for both the `mkdir` and the file — run `date +%Y%m%d%H%M%S` once, store it in a shell variable, reuse it.)

Then apply and mark as resolved:
```bash
npx prisma db execute --file prisma/migrations/<timestamp>_organization_branding/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <timestamp>_organization_branding
npx prisma generate
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
```
Expected: no errors. Also confirm via `mysql` that `organizations` has the 3 new columns:
```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db -e "DESCRIBE organizations;" | grep -E "logo_base64|primary_color|secondary_color"
```

---

## Task 2: Backend `organizations` module — telefono at creation + admin branding edit

**Files:**
- Create: `backend/src/utils/brandingSchema.ts`
- Modify: `backend/src/modules/organizations/organizations.schema.ts`
- Modify: `backend/src/modules/organizations/organizations.repository.ts`
- Modify: `backend/src/modules/organizations/organizations.service.ts`

**Interfaces:**
- Consumes: `Organization.logoBase64/primaryColor/secondaryColor` (Task 1).
- Produces: `hexColorSchema`, `logoBase64Schema` (reused by Task 3). `createOrganizationSchema`'s `responsable.telefono` (required). `updateOrganizationSchema`'s `logoBase64/primaryColor/secondaryColor` (all optional). `listFull()`/`service.list()` now include `primaryColor`/`secondaryColor` per organization.

- [ ] **Step 1: Create the shared branding validation util**

Write `backend/src/utils/brandingSchema.ts`:

```typescript
import { z } from 'zod'

const LOGO_MAX_BYTES = 500 * 1024

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Ingresa un color hexadecimal válido (#rrggbb)')

export const logoBase64Schema = z
  .string()
  .regex(/^data:image\/(png|svg\+xml);base64,/, 'El logo debe ser PNG o SVG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= LOGO_MAX_BYTES
  }, 'El logo no puede superar 500KB')
```

- [ ] **Step 2: Widen `organizations.schema.ts`**

In `backend/src/modules/organizations/organizations.schema.ts`, add the import and edit both schemas:

```typescript
import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'
import { hexColorSchema, logoBase64Schema } from '../../utils/brandingSchema.js'

const nitSchema = z.string().regex(/^\d{5,20}$/, 'Ingresa un NIT válido (solo números)')
const documentNumberSchema = z.string().regex(/^\d{5,20}$/, 'Ingresa un número de documento válido')
// Mismo patrón que auth.schema.ts's updateProfileSchema.telefono.
const telefonoSchema = z
  .string()
  .min(7, 'Ingresa un teléfono válido')
  .regex(/^[+()\d\s-]+$/, 'Solo números, espacios y +()-')

export const createOrganizationSchema = z.object({
  nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')),
  nit: nitSchema,
  contactEmail: z.string().email('Ingresa un correo de contacto válido'),
  serviceSlug: z.string().min(1, 'Selecciona un servicio'),
  responsable: z.object({
    documentType: z.enum(['CC', 'NIT']),
    documentNumber: documentNumberSchema,
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del responsable')),
    email: z.string().email('Ingresa un correo válido'),
    cargo: noNewlines(z.string().min(2, 'Ingresa el cargo del responsable')),
    telefono: telefonoSchema,
  }),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z
  .object({
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')).optional(),
    nit: nitSchema.optional(),
    contactEmail: z.string().email('Ingresa un correo de contacto válido').optional(),
    logoBase64: logoBase64Schema.optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
```

(Leave `formatFieldErrors` untouched.)

- [ ] **Step 3: Widen `organizations.repository.ts`**

In `backend/src/modules/organizations/organizations.repository.ts`:

Change `listFull()`'s `select` to also request the 2 color fields (not the logo — see Task 6 for why `logoBase64` is deliberately excluded from list responses):

```typescript
    listFull() {
      return prisma.organization.findMany({
        select: {
          id: true,
          nombre: true,
          nit: true,
          contactEmail: true,
          isActive: true,
          primaryColor: true,
          secondaryColor: true,
          services: {
            select: { isActive: true, service: { select: { slug: true, nombre: true } } },
          },
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  nombre: true,
                  documentType: true,
                  documentNumber: true,
                  email: true,
                  accountStatus: true,
                  suspendReason: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
        orderBy: { nombre: 'asc' },
      })
    },
```

Change `update()`'s signature to accept the 3 optional branding fields:

```typescript
    update(
      id: string,
      data: {
        nombre?: string
        nit?: string
        contactEmail?: string
        logoBase64?: string
        primaryColor?: string
        secondaryColor?: string
      },
    ) {
      return prisma.organization.update({ where: { id }, data })
    },
```

Change `createWithResponsible`'s `responsable` param type and the `tx.user.create` call to include `telefono`:

```typescript
    async createWithResponsible(input: {
      nombre: string
      nit: string
      contactEmail: string
      serviceId: string
      responsable: {
        documentType: DocumentType
        documentNumber: string
        nombre: string
        email: string
        cargo: string
        telefono: string
      }
    }) {
      const clienteRole = await prisma.role.findUnique({ where: { name: 'cliente' } })
      if (!clienteRole) {
        throw new Error('Rol "cliente" no existe — corre el seed (npm run prisma:seed) antes de crear empresas.')
      }

      return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { nombre: input.nombre, nit: input.nit, contactEmail: input.contactEmail },
        })
        await tx.organizationService.create({
          data: { organizationId: organization.id, serviceId: input.serviceId, isActive: true },
        })
        const responsable = await tx.user.create({
          data: {
            documentType: input.responsable.documentType,
            documentNumber: input.responsable.documentNumber,
            email: input.responsable.email,
            nombre: input.responsable.nombre,
            cargo: input.responsable.cargo,
            telefono: input.responsable.telefono,
            accountStatus: 'PENDING_ACTIVATION' as AccountStatus,
          },
        })
        await tx.userOrganization.create({
          data: { userId: responsable.id, organizationId: organization.id, roleId: clienteRole.id },
        })
        return { organization, responsable }
      })
    },
```

- [ ] **Step 4: Update `organizations.service.ts`**

In `backend/src/modules/organizations/organizations.service.ts`, widen the `create` call's `responsable` passthrough (no code change needed — `input.responsable` already flows through as-is since the type now includes `telefono`), and edit `update()` to keep `logoBase64` out of the audit log:

```typescript
    async update(
      organizationId: string,
      input: UpdateOrganizationInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findById(organizationId)
      if (!existing) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      if (input.nit) {
        const nitOwner = await repository.findByNit(input.nit)
        if (nitOwner && nitOwner.id !== organizationId) {
          throw new OrganizationsError('NIT_TAKEN', 'Ya existe una empresa registrada con ese NIT')
        }
      }

      const updated = await repository.update(organizationId, input)

      // No volcamos logoBase64 (hasta ~680KB de texto) al audit log — solo
      // dejamos constancia de qué cambió, no el contenido pesado.
      const { logoBase64, ...loggableChanges } = input
      await repository.createAuditLog({
        userId: updatedByUserId,
        organizationId,
        action: 'ORGANIZATION_UPDATED',
        metadata: { changes: { ...loggableChanges, logoChanged: logoBase64 !== undefined } },
        ipAddress,
      })

      return updated
    },
```

Also widen `list()`'s mapping to pass through the 2 new fields:

```typescript
    async list() {
      const organizations = await repository.listFull()
      return organizations.map((org) => ({
        id: org.id,
        nombre: org.nombre,
        nit: org.nit,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        services: org.services.map((s) => ({ slug: s.service.slug, nombre: s.service.nombre, isActive: s.isActive })),
        responsable: org.users[0]?.user ?? null,
      }))
    },
```

- [ ] **Step 5: Verify**

```bash
cd backend && npm run typecheck
```
Expected: no errors (the `createOrganizationHandler`/`updateOrganizationHandler` controllers are untouched and already pass `parsed.data` straight through, so they compile against the new wider types with no changes needed there).

---

## Task 3: New backend `organizationBranding` module

**Files:**
- Create: `backend/src/modules/organizationBranding/organizationBranding.schema.ts`
- Create: `backend/src/modules/organizationBranding/organizationBranding.repository.ts`
- Create: `backend/src/modules/organizationBranding/organizationBranding.service.ts`
- Create: `backend/src/modules/organizationBranding/organizationBranding.controller.ts`
- Create: `backend/src/modules/organizationBranding/organizationBranding.routes.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `hexColorSchema`, `logoBase64Schema` (Task 2).
- Produces: `PATCH /api/dashboard/organization/branding` → `{ applied: boolean }`. `GET /api/organizations/:organizationId/logo` → image binary or 404.

- [ ] **Step 1: Schema**

Write `backend/src/modules/organizationBranding/organizationBranding.schema.ts`:

```typescript
import { z } from 'zod'
import { hexColorSchema, logoBase64Schema } from '../../utils/brandingSchema.js'

export const saveBrandingSchema = z.object({
  logoBase64: logoBase64Schema,
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
})

export type SaveBrandingInput = z.infer<typeof saveBrandingSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
```

- [ ] **Step 2: Repository**

Write `backend/src/modules/organizationBranding/organizationBranding.repository.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'

export function createOrganizationBrandingRepository(prisma: PrismaClient) {
  return {
    findOrganizationIdForUser(userId: string) {
      return prisma.userOrganization
        .findFirst({ where: { userId }, select: { organizationId: true } })
        .then((m) => m?.organizationId ?? null)
    },

    /** Update atómico y condicional: solo aplica si la organización todavía
     * no tiene branding guardado (primaryColor null) — así dos activaciones
     * casi simultáneas de la misma empresa nunca se pisan entre sí. Nunca
     * "leer y luego escribir" por separado — la condición vive en el WHERE. */
    async saveBrandingIfUnset(
      organizationId: string,
      data: { logoBase64: string; primaryColor: string; secondaryColor: string },
    ) {
      const result = await prisma.organization.updateMany({
        where: { id: organizationId, primaryColor: null },
        data,
      })
      return result.count > 0
    },

    clearMustUpdateProfile(userId: string) {
      return prisma.user.update({ where: { id: userId }, data: { mustUpdateProfile: false } })
    },

    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id }, select: { logoBase64: true } })
    },

    createAuditLog(input: { userId: string; organizationId: string; action: 'ORGANIZATION_BRANDING_SET' }) {
      return prisma.auditLog.create({
        data: { userId: input.userId, organizationId: input.organizationId, action: input.action },
      })
    },
  }
}

export type OrganizationBrandingRepository = ReturnType<typeof createOrganizationBrandingRepository>
```

- [ ] **Step 3: Service**

Write `backend/src/modules/organizationBranding/organizationBranding.service.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import { createOrganizationBrandingRepository } from './organizationBranding.repository.js'
import type { SaveBrandingInput } from './organizationBranding.schema.js'

export class OrganizationBrandingError extends Error {
  constructor(
    public code: 'NO_ORGANIZATION',
    message: string,
  ) {
    super(message)
  }
}

export function createOrganizationBrandingService(prisma: PrismaClient) {
  const repository = createOrganizationBrandingRepository(prisma)

  return {
    /** Guarda el branding la primera vez que una organización lo configura.
     * Si otro usuario de la misma empresa ya lo guardó primero (carrera entre
     * dos activaciones casi simultáneas), no sobreescribe nada — pero igual
     * limpia mustUpdateProfile del usuario que llamó, porque su empresa ya
     * cumplió el requisito, sea quien sea quien lo haya guardado. */
    async saveInitialBranding(userId: string, input: SaveBrandingInput) {
      const organizationId = await repository.findOrganizationIdForUser(userId)
      if (!organizationId) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Tu cuenta no pertenece a ninguna organización')
      }

      const applied = await repository.saveBrandingIfUnset(organizationId, input)
      await repository.clearMustUpdateProfile(userId)
      if (applied) {
        await repository.createAuditLog({ userId, organizationId, action: 'ORGANIZATION_BRANDING_SET' })
      }
      return { applied }
    },

    async getLogoForOrganization(organizationId: string) {
      const organization = await repository.findOrganizationById(organizationId)
      return organization?.logoBase64 ?? null
    },
  }
}

export type OrganizationBrandingService = ReturnType<typeof createOrganizationBrandingService>
```

- [ ] **Step 4: Controller**

Write `backend/src/modules/organizationBranding/organizationBranding.controller.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify'
import { saveBrandingSchema, formatFieldErrors } from './organizationBranding.schema.js'
import { createOrganizationBrandingService, OrganizationBrandingError } from './organizationBranding.service.js'

export async function saveBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = saveBrandingSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    const { applied } = await service.saveInitialBranding(request.user.sub, parsed.data)
    return reply.code(200).send({ applied })
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(403).send({ message: err.message })
    throw err
  }
}

/** Público — sin requireAuth. Un logo de empresa no es dato sensible, y el
 * navegador debe poder cargarlo vía <img src> aunque frontend/backend vivan
 * en dominios distintos en producción (ahí una cookie SameSite=Lax no viaja
 * en una petición de subrecurso entre sitios). Ver spec de branding. */
export async function getLogoHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationBrandingService(request.server.prisma)
  const logoBase64 = await service.getLogoForOrganization(organizationId)
  if (!logoBase64) return reply.code(404).send()

  const match = logoBase64.match(/^data:(image\/(?:png|svg\+xml));base64,(.+)$/)
  if (!match) return reply.code(404).send()

  const [, contentType, payload] = match
  const buffer = Buffer.from(payload, 'base64')
  return reply
    .code(200)
    .header('Content-Type', contentType)
    .header('Cache-Control', 'public, max-age=86400')
    .header('ETag', `"${organizationId}-${buffer.length}"`)
    .send(buffer)
}
```

- [ ] **Step 5: Routes**

Write `backend/src/modules/organizationBranding/organizationBranding.routes.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { saveBrandingHandler, getLogoHandler } from './organizationBranding.controller.js'

export async function organizationBrandingRoutes(app: FastifyInstance) {
  app.patch(
    '/api/dashboard/organization/branding',
    { preHandler: [requireAuth] },
    saveBrandingHandler,
  )

  // Público, sin requireAuth — ver comentario en getLogoHandler.
  app.get<{ Params: { organizationId: string } }>(
    '/api/organizations/:organizationId/logo',
    {},
    getLogoHandler,
  )
}
```

- [ ] **Step 6: Register the module in `app.ts`**

In `backend/src/app.ts`, add the import next to the other route imports:

```typescript
import { organizationBrandingRoutes } from './modules/organizationBranding/organizationBranding.routes.js'
```

And register it next to the other `app.register(...)` calls:

```typescript
  await app.register(organizationBrandingRoutes)
```

- [ ] **Step 7: Verify**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

---

## Task 4: Backend auth + activation — /me branding, activation skip, delete old updateProfile

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.repository.ts`
- Modify: `backend/src/modules/auth/auth.schema.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`
- Modify: `backend/src/modules/activation/activation.repository.ts`
- Modify: `backend/src/modules/activation/activation.service.ts`

**Interfaces:**
- Produces: `GET /api/auth/me` response gains `branding: { primaryColor: string; secondaryColor: string } | null`. Activation-time `mustUpdateProfile` is now conditional on the org's existing branding.

- [ ] **Step 1: `meHandler` exposes branding colors**

In `backend/src/modules/auth/auth.controller.ts`, replace `meHandler`:

```typescript
export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = await request.server.prisma.user.findUnique({ where: { id: request.user.sub } })
  if (!user || user.accountStatus !== 'ACTIVE') return reply.code(401).send({ message: 'No autenticado' })

  const membership = await request.server.prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })

  const permissions = await resolveUserPermissions(request.server.prisma, user.id, membership?.organizationId)

  let branding: { primaryColor: string; secondaryColor: string } | null = null
  if (membership?.organizationId) {
    const organization = await request.server.prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { primaryColor: true, secondaryColor: true },
    })
    if (organization?.primaryColor && organization?.secondaryColor) {
      branding = { primaryColor: organization.primaryColor, secondaryColor: organization.secondaryColor }
    }
  }

  return reply.code(200).send({
    user: { id: user.id, documentNumber: user.documentNumber, nombre: user.nombre },
    organizationId: membership?.organizationId ?? null,
    mustUpdateProfile: user.mustUpdateProfile,
    permissions: [...permissions],
    branding,
  })
}
```

- [ ] **Step 2: Delete `updateProfileHandler`**

In the same file, remove the entire `updateProfileHandler` function (the one below `meHandler`, starting with `/** Fase B.5 — el usuario completa cargo/teléfono en su primer login. */`). Remove `updateProfileSchema` and `formatFieldErrors` from the import at the top if `formatFieldErrors` is still used elsewhere in the file for other handlers — check first: `formatFieldErrors` is likely also used by `loginHandler`/`passwordResetConfirmHandler` in this same file, so only remove `updateProfileSchema` from that import line, keep `formatFieldErrors`.

- [ ] **Step 3: Delete `service.updateProfile`**

In `backend/src/modules/auth/auth.service.ts`, remove the `updateProfile` method (the block starting with `/** Fase B.5 — completa cargo/teléfono obligatorios en el primer login.`). If `UpdateProfileInput` was imported at the top of this file, remove that import too.

- [ ] **Step 4: Delete `repository.updateProfile`**

In `backend/src/modules/auth/auth.repository.ts`, remove the `updateProfile` method (the block starting with `/** Completa el perfil obligatorio (Fase B.5)`).

- [ ] **Step 5: Delete `updateProfileSchema` from auth.schema.ts**

In `backend/src/modules/auth/auth.schema.ts`, remove the `updateProfileSchema` block and the `export type UpdateProfileInput = z.infer<typeof updateProfileSchema>` line.

- [ ] **Step 6: Delete the route**

In `backend/src/modules/auth/auth.routes.ts`, remove the `updateProfileHandler` import and the `app.patch('/api/auth/profile', ...)` block.

- [ ] **Step 7: Activation — repository gains branding-aware activation**

In `backend/src/modules/activation/activation.repository.ts`, change `activateUser` to accept a `mustUpdateProfile` param, and add a new method:

```typescript
    activateUser(userId: string, passwordHash: string, mustUpdateProfile: boolean) {
      return prisma.user.update({
        where: { id: userId },
        data: { passwordHash, accountStatus: 'ACTIVE', mustUpdateProfile },
      })
    },

    /** true si la organización de este usuario ya tiene branding guardado —
     * decide si debe pasar por el formulario de logo/colores o no. */
    async organizationAlreadyHasBranding(userId: string) {
      const membership = await prisma.userOrganization.findFirst({
        where: { userId },
        select: { organization: { select: { primaryColor: true } } },
      })
      return membership?.organization.primaryColor != null
    },
```

(Add `organizationAlreadyHasBranding` right after `activateUser`, before `createAuditLog`.)

- [ ] **Step 8: Activation — service calls the new check**

In `backend/src/modules/activation/activation.service.ts`, in the `confirm` method, change:

```typescript
      const passwordHash = await argon2.hash(newPassword)
      const activated = await repository.activateUser(user.id, passwordHash)
```

to:

```typescript
      const passwordHash = await argon2.hash(newPassword)
      const hasBranding = await repository.organizationAlreadyHasBranding(user.id)
      const activated = await repository.activateUser(user.id, passwordHash, !hasBranding)
```

- [ ] **Step 9: Verify**

```bash
cd backend && npm run typecheck
```
Expected: no errors. If `formatFieldErrors` becomes unused in `auth.controller.ts` after Step 2, typecheck will not catch that (unused imports don't always fail `tsc --noEmit` depending on config) — grep to confirm: `grep -n "formatFieldErrors" backend/src/modules/auth/auth.controller.ts` should still show at least one other usage (e.g. in `passwordResetConfirmHandler` or `loginHandler`); if zero usages remain, remove the import.

---

## Task 5: Frontend types + API services (organizations, organizationBranding) — delete old profile files

**Files:**
- Modify: `frontend/src/types/organization.ts`
- Create: `frontend/src/types/organizationBranding.ts`
- Create: `frontend/src/services/organizationBranding.service.ts`
- Modify: `frontend/src/stores/auth.ts`
- Delete: `frontend/src/types/profile.ts`
- Delete: `frontend/src/services/profile.service.ts`
- Delete: `frontend/src/composables/useUpdateProfileForm.ts`

**Interfaces:**
- Produces: `CreateOrganizationFormValues.responsable.telefono`, `UpdateOrganizationFormValues.{logoBase64,primaryColor,secondaryColor}`, `OrganizationListItem.{primaryColor,secondaryColor}`. `BrandingFormValues`, `saveBranding()`. `auth.branding`, `auth.brandingCssVars` getter.

- [ ] **Step 1: Widen `types/organization.ts`**

Replace the file's content:

```typescript
import { z } from 'zod'

export interface OrganizationFormMessages {
  nombreRequired: string
  nitInvalid: string
  contactEmailInvalid: string
  serviceRequired: string
  responsableDocumentInvalid: string
  responsableNombreRequired: string
  responsableEmailInvalid: string
  responsableCargoRequired: string
  responsableTelefonoRequired: string
  responsableTelefonoInvalid: string
}

/** Reglas espejo de backend/src/modules/organizations/organizations.schema.ts. */
export function createOrganizationSchema(messages: OrganizationFormMessages) {
  return z.object({
    nombre: z.string().min(2, messages.nombreRequired),
    nit: z.string().regex(/^\d{5,20}$/, messages.nitInvalid),
    contactEmail: z.string().email(messages.contactEmailInvalid),
    serviceSlug: z.string().min(1, messages.serviceRequired),
    responsable: z.object({
      documentType: z.enum(['CC', 'NIT']),
      documentNumber: z.string().regex(/^\d{5,20}$/, messages.responsableDocumentInvalid),
      nombre: z.string().min(2, messages.responsableNombreRequired),
      email: z.string().email(messages.responsableEmailInvalid),
      cargo: z.string().min(2, messages.responsableCargoRequired),
      telefono: z
        .string()
        .min(7, messages.responsableTelefonoRequired)
        .regex(/^[+()\d\s-]+$/, messages.responsableTelefonoInvalid),
    }),
  })
}

export type CreateOrganizationFormValues = z.infer<ReturnType<typeof createOrganizationSchema>>

export interface ServiceOption {
  slug: string
  nombre: string
}

export interface OrganizationResponsable {
  id: string
  nombre: string
  documentType: 'CC' | 'NIT'
  documentNumber: string
  email: string
  accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'
  suspendReason: string | null
}

export interface OrganizationContractedService {
  slug: string
  nombre: string
  isActive: boolean
}

export interface OrganizationListItem {
  id: string
  nombre: string
  nit: string | null
  contactEmail: string | null
  isActive: boolean
  primaryColor: string | null
  secondaryColor: string | null
  services: OrganizationContractedService[]
  responsable: OrganizationResponsable | null
}

export interface UpdateOrganizationFormValues {
  nombre?: string
  nit?: string
  contactEmail?: string
  logoBase64?: string
  primaryColor?: string
  secondaryColor?: string
}
```

- [ ] **Step 2: Create `types/organizationBranding.ts`**

```typescript
export interface BrandingFormValues {
  logoBase64: string
  primaryColor: string
  secondaryColor: string
}
```

- [ ] **Step 3: Create `services/organizationBranding.service.ts`**

```typescript
import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { BrandingFormValues } from '@/types/organizationBranding'

export class BrandingValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Branding form validation failed')
    this.name = 'BrandingValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class BrandingRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'BrandingRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new BrandingValidationError(data.errors)
    throw new BrandingRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function saveBranding(values: BrandingFormValues): Promise<{ applied: boolean }> {
  try {
    const { data } = await apiClient.patch('/dashboard/organization/branding', values)
    return data
  } catch (err) {
    rethrow(err)
  }
}
```

- [ ] **Step 4: Widen `stores/auth.ts`**

Replace the file's content:

```typescript
import { defineStore } from 'pinia'
import { apiClient } from '@/services/api'

export interface CurrentUser {
  id: string
  documentNumber: string
  nombre: string
}

export interface OrganizationBranding {
  primaryColor: string
  secondaryColor: string
}

interface AuthState {
  user: CurrentUser | null
  organizationId: string | null
  permissions: string[]
  isAuthenticated: boolean | null
  mustUpdateProfile: boolean
  branding: OrganizationBranding | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    organizationId: null,
    permissions: [],
    isAuthenticated: null,
    mustUpdateProfile: false,
    branding: null,
  }),

  getters: {
    hasPermission: (state) => (key: string) => state.permissions.includes('*') || state.permissions.includes(key),
    roleLabelKey: (state): string =>
      state.permissions.includes('*') || state.permissions.includes('platform.variables.upload')
        ? 'dashboard.roleLabel.superAdmin'
        : 'dashboard.roleLabel.cliente',
    /** Variables CSS del branding del cliente — vacío para admin o para un
     * cliente que aún no ha guardado logo/colores, así los estilos que las
     * referencian caen a su valor de respaldo (--org-primary,#hex) sin
     * ninguna lógica condicional adicional en cada componente. */
    brandingCssVars: (state): Record<string, string> =>
      state.branding
        ? { '--org-primary': state.branding.primaryColor, '--org-secondary': state.branding.secondaryColor }
        : {},
  },

  actions: {
    async fetchMe() {
      try {
        const { data } = await apiClient.get('/auth/me')
        this.user = data.user
        this.organizationId = data.organizationId
        this.permissions = data.permissions
        this.mustUpdateProfile = data.mustUpdateProfile
        this.branding = data.branding
        this.isAuthenticated = true
      } catch {
        this.$reset()
        this.isAuthenticated = false
      }
      return this.isAuthenticated
    },

    async logout() {
      try {
        await apiClient.post('/auth/logout')
      } finally {
        this.$reset()
        this.isAuthenticated = false
      }
    },
  },
})
```

- [ ] **Step 5: Delete unused profile files**

```bash
rm frontend/src/types/profile.ts
rm frontend/src/services/profile.service.ts
rm frontend/src/composables/useUpdateProfileForm.ts
```

- [ ] **Step 6: Verify**

```bash
cd frontend && npx vue-tsc -b
```
Expected: errors in `frontend/src/modules/profile/views/UpdateProfileView.vue` (it still imports the deleted composable) — this is expected and fixed in Task 7. Confirm no OTHER file references the deleted modules:
```bash
grep -rln "useUpdateProfileForm\|profile.service\|types/profile" frontend/src --include="*.ts" --include="*.vue"
```
Expected: only `UpdateProfileView.vue` listed.

---

## Task 6: New shared `BrandingFields.vue` component

**Files:**
- Create: `frontend/src/components/dashboard/organizations/BrandingFields.vue`

**Interfaces:**
- Consumes: none (pure presentational + file-reading logic).
- Produces: `defineModel<string>('logoBase64')`, `defineModel<string>('primaryColor')`, `defineModel<string>('secondaryColor')` — used by both `UpdateProfileView.vue` (Task 7) and `EditOrganizationModal.vue` (Task 8).

- [ ] **Step 1: Write the component**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const logoBase64 = defineModel<string>('logoBase64', { required: true })
const primaryColor = defineModel<string>('primaryColor', { required: true })
const secondaryColor = defineModel<string>('secondaryColor', { required: true })

const { t } = useI18n()

const fileError = ref('')

const ALLOWED_TYPES = ['image/png', 'image/svg+xml']
const MAX_BYTES = 500 * 1024

function handleFileChange(event: Event) {
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!ALLOWED_TYPES.includes(file.type)) {
    fileError.value = t('branding.fields.logoTypeError')
    input.value = ''
    return
  }
  if (file.size > MAX_BYTES) {
    fileError.value = t('branding.fields.logoSizeError')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    logoBase64.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="grid gap-4">
    <div>
      <label for="branding-logo" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('branding.fields.logoLabel') }}
      </label>
      <input
        id="branding-logo"
        type="file"
        accept="image/png,image/svg+xml"
        class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900"
        @change="handleFileChange"
      />
      <p class="mt-1 text-xs text-navy-700/60">{{ t('branding.fields.logoHint') }}</p>
      <p v-if="fileError" class="mt-1.5 text-xs text-red-600">{{ fileError }}</p>
      <img v-if="logoBase64" :src="logoBase64" :alt="t('branding.fields.logoPreviewAlt')" class="mt-3 h-10 w-auto" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="branding-primary" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.primaryColorLabel') }}
        </label>
        <input
          id="branding-primary"
          v-model="primaryColor"
          type="color"
          class="h-11 w-full rounded-sm border border-line-strong bg-white p-1"
        />
      </div>
      <div>
        <label for="branding-secondary" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.secondaryColorLabel') }}
        </label>
        <input
          id="branding-secondary"
          v-model="secondaryColor"
          type="color"
          class="h-11 w-full rounded-sm border border-line-strong bg-white p-1"
        />
      </div>
    </div>

    <div>
      <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700">{{ t('branding.fields.previewLabel') }}</p>
      <div class="flex items-center gap-3 rounded-md border border-line-strong px-4 py-3" :style="{ backgroundColor: primaryColor }">
        <img v-if="logoBase64" :src="logoBase64" alt="" class="h-6 w-auto" />
        <span class="text-sm font-semibold" :style="{ color: secondaryColor }">{{ t('branding.fields.previewText') }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify**

This component has no consumer yet — Tasks 7 and 8 wire it in. Confirm it at least parses:
```bash
cd frontend && npx vue-tsc -b 2>&1 | grep -i "BrandingFields" || echo "no BrandingFields-specific errors"
```

---

## Task 7: Rewrite `UpdateProfileView.vue` (activation form)

**Files:**
- Modify: `frontend/src/modules/profile/views/UpdateProfileView.vue`

**Interfaces:**
- Consumes: `BrandingFields.vue` (Task 6), `saveBranding()` + `BrandingValidationError`/`BrandingRequestError` (Task 5).

- [ ] **Step 1: Replace the file's content**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import BrandingFields from '@/components/dashboard/organizations/BrandingFields.vue'
import { saveBranding, BrandingValidationError, BrandingRequestError } from '@/services/organizationBranding.service'
import { useAuthStore } from '@/stores/auth'
import { getDashboardPath } from '@/utils/dashboardRedirect'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

useHead(() => ({ title: `${t('profile.pageTitle')} — RoMa+`, meta: [{ name: 'robots', content: 'noindex' }] }))

// Arranca en los colores de RoMa como punto de partida razonable — el
// cliente los personaliza desde ahí, en vez de un negro por defecto.
const logoBase64 = ref('')
const primaryColor = ref('#0b1a33')
const secondaryColor = ref('#5b8dc7')
const touched = ref(false)
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  touched.value = true
  if (!logoBase64.value) {
    errorMessage.value = t('branding.activation.logoRequired')
    return
  }

  status.value = 'loading'
  errorMessage.value = ''
  try {
    await saveBranding({ logoBase64: logoBase64.value, primaryColor: primaryColor.value, secondaryColor: secondaryColor.value })
    status.value = 'success'
    auth.mustUpdateProfile = false
    router.push(getDashboardPath(auth, locale.value))
  } catch (err) {
    status.value = 'error'
    if (err instanceof BrandingValidationError) {
      errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('branding.activation.genericError')
    } else if (err instanceof BrandingRequestError) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('branding.activation.genericError')
    }
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="mx-auto max-w-md">
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h1 class="text-lg font-bold text-navy-900">{{ t('profile.pageTitle') }}</h1>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('profile.pageSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submit">
          <BrandingFields v-model:logo-base64="logoBase64" v-model:primary-color="primaryColor" v-model:secondary-color="secondaryColor" />

          <p v-if="touched && !logoBase64 && status !== 'loading'" class="text-xs text-red-600">
            {{ t('branding.activation.logoRequired') }}
          </p>

          <p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ errorMessage }}
          </p>

          <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
            {{ t('profile.submit') }}
          </SubmitButton>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>
```

- [ ] **Step 2: Verify**

```bash
cd frontend && npx vue-tsc -b
```
Expected: no errors.

---

## Task 8: Admin forms — telefono at creation, branding at edit

**Files:**
- Modify: `frontend/src/composables/useCreateOrganizationForm.ts`
- Modify: `frontend/src/components/dashboard/organizations/CreateOrganizationForm.vue`
- Modify: `frontend/src/components/dashboard/organizations/EditOrganizationModal.vue`
- Modify: `frontend/src/modules/clients/views/ClientsListView.vue`

**Interfaces:**
- Consumes: `BrandingFields.vue` (Task 6), widened `OrganizationFormMessages`/`UpdateOrganizationFormValues`/`OrganizationListItem` (Task 5).

- [ ] **Step 1: `useCreateOrganizationForm.ts` — add telefono**

Add to the `validationSchema` computed's message object:

```typescript
  const validationSchema = computed(() =>
    toTypedSchema(
      createOrganizationSchema({
        nombreRequired: t('organizations.validation.nombreRequired'),
        nitInvalid: t('organizations.validation.nitInvalid'),
        contactEmailInvalid: t('organizations.validation.contactEmailInvalid'),
        serviceRequired: t('organizations.validation.serviceRequired'),
        responsableDocumentInvalid: t('organizations.validation.responsableDocumentInvalid'),
        responsableNombreRequired: t('organizations.validation.responsableNombreRequired'),
        responsableEmailInvalid: t('organizations.validation.responsableEmailInvalid'),
        responsableCargoRequired: t('organizations.validation.responsableCargoRequired'),
        responsableTelefonoRequired: t('organizations.validation.responsableTelefonoRequired'),
        responsableTelefonoInvalid: t('organizations.validation.responsableTelefonoInvalid'),
      }),
    ),
  )
```

Add `telefono: ''` to `initialValues.responsable`:

```typescript
  const { defineField, handleSubmit, errors, resetForm } = useForm<CreateOrganizationFormValues>({
    validationSchema,
    initialValues: {
      nombre: '',
      nit: '',
      contactEmail: '',
      serviceSlug: '',
      responsable: { documentType: 'CC', documentNumber: '', nombre: '', email: '', cargo: '', telefono: '' },
    },
  })
```

Add the field pair and return it:

```typescript
  const [responsableCargo, responsableCargoAttrs] = defineField('responsable.cargo')
  const [responsableTelefono, responsableTelefonoAttrs] = defineField('responsable.telefono')
```

```typescript
  return {
    status,
    errorMessage,
    errors,
    services,
    servicesLoadError,
    nombre,
    nombreAttrs,
    nit,
    nitAttrs,
    contactEmail,
    contactEmailAttrs,
    serviceSlug,
    serviceSlugAttrs,
    responsableDocumentType,
    responsableDocumentTypeAttrs,
    responsableDocumentNumber,
    responsableDocumentNumberAttrs,
    responsableNombre,
    responsableNombreAttrs,
    responsableEmail,
    responsableEmailAttrs,
    responsableCargo,
    responsableCargoAttrs,
    responsableTelefono,
    responsableTelefonoAttrs,
    submit,
  }
```

- [ ] **Step 2: `CreateOrganizationForm.vue` — add the field**

Add `responsableTelefono, responsableTelefonoAttrs,` to the destructured composable result (in the `<script setup>` block). In the template, right after the `responsable-cargo` `FormField`, add:

```vue
      <FormField
        id="responsable-telefono"
        v-model="responsableTelefono"
        v-bind="responsableTelefonoAttrs"
        type="text"
        :label="t('organizations.form.responsableTelefono')"
        :placeholder="t('organizations.form.responsableTelefonoPlaceholder')"
        :error="errors['responsable.telefono']"
      />
```

- [ ] **Step 3: `EditOrganizationModal.vue` — add branding section**

Replace the file's content:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import FormField from '@/components/ui/FormField.vue'
import BrandingFields from './BrandingFields.vue'
import type { OrganizationListItem } from '@/types/organization'

const props = defineProps<{ organization: OrganizationListItem }>()
const emit = defineEmits<{
  submit: [values: { nombre: string; nit: string; contactEmail: string; logoBase64?: string; primaryColor: string; secondaryColor: string }]
  cancel: []
}>()

const { t } = useI18n()

const nombre = ref(props.organization.nombre)
const nit = ref(props.organization.nit ?? '')
const contactEmail = ref(props.organization.contactEmail ?? '')
const touched = ref(false)

// El admin puede tocar solo colores sin resubir el logo — logoBase64 empieza
// vacío y solo se envía si el admin elige un archivo nuevo (el logo actual
// no viaja en el listado de organizaciones, se ve vía el endpoint público).
const logoBase64 = ref('')
const primaryColor = ref(props.organization.primaryColor ?? '#0b1a33')
const secondaryColor = ref(props.organization.secondaryColor ?? '#5b8dc7')

const nitRegex = /^\d{5,20}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function handleSubmit() {
  touched.value = true
  if (nombre.value.trim().length < 2 || !nitRegex.test(nit.value) || !emailRegex.test(contactEmail.value)) return
  emit('submit', {
    nombre: nombre.value.trim(),
    nit: nit.value.trim(),
    contactEmail: contactEmail.value.trim(),
    logoBase64: logoBase64.value || undefined,
    primaryColor: primaryColor.value,
    secondaryColor: secondaryColor.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md bg-white p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-bold text-navy-900">{{ t('organizations.editModal.title') }}</h2>
        <button
          type="button"
          class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
          :aria-label="t('dashboard.servicesManagement.modal.close')"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="mt-4 grid gap-4">
        <FormField
          id="edit-org-nombre"
          v-model="nombre"
          :label="t('organizations.form.nombre')"
          :error="touched && nombre.trim().length < 2 ? t('organizations.validation.nombreRequired') : undefined"
        />
        <FormField
          id="edit-org-nit"
          v-model="nit"
          type="text"
          inputmode="numeric"
          :label="t('organizations.form.nit')"
          :error="touched && !nitRegex.test(nit) ? t('organizations.validation.nitInvalid') : undefined"
        />
        <FormField
          id="edit-org-contact-email"
          v-model="contactEmail"
          type="email"
          :label="t('organizations.form.contactEmail')"
          :error="touched && !emailRegex.test(contactEmail) ? t('organizations.validation.contactEmailInvalid') : undefined"
        />
      </div>

      <p class="mt-3 text-xs text-navy-700/60">{{ t('organizations.editModal.responsableNotice') }}</p>

      <div class="mt-5 border-t border-line-strong pt-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700">{{ t('organizations.editModal.brandingSectionTitle') }}</p>
        <BrandingFields v-model:logo-base64="logoBase64" v-model:primary-color="primaryColor" v-model:secondary-color="secondaryColor" />
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
          @click="emit('cancel')"
        >
          {{ t('dashboard.servicesManagement.modal.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-sm bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          @click="handleSubmit"
        >
          {{ t('dashboard.servicesManagement.modal.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: `ClientsListView.vue` — widen `handleEditSubmit`**

Change:

```typescript
async function handleEditSubmit(values: { nombre: string; nit: string; contactEmail: string }) {
  if (!editingOrganization.value) return
  try {
    await updateOrganization(editingOrganization.value.id, values)
    editingOrganization.value = null
    await load()
  } catch (err) {
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('clients.actionError')
  }
}
```

to:

```typescript
async function handleEditSubmit(values: {
  nombre: string
  nit: string
  contactEmail: string
  logoBase64?: string
  primaryColor: string
  secondaryColor: string
}) {
  if (!editingOrganization.value) return
  try {
    await updateOrganization(editingOrganization.value.id, values)
    editingOrganization.value = null
    await load()
  } catch (err) {
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('clients.actionError')
  }
}
```

- [ ] **Step 5: Verify**

```bash
cd frontend && npx vue-tsc -b
```
Expected: no errors.

---

## Task 9: Dynamic branding — DashboardLayout, DashboardSidebar, accent buttons

**Files:**
- Modify: `frontend/src/layouts/DashboardLayout.vue`
- Modify: `frontend/src/components/dashboard/DashboardSidebar.vue`
- Modify: `frontend/src/components/ui/SubmitButton.vue`

**Interfaces:**
- Consumes: `auth.branding`, `auth.brandingCssVars`, `auth.organizationId` (Task 5).

- [ ] **Step 1: `DashboardLayout.vue` — CSS vars + logo swap**

Add `logoFallback` state and the computed logo URL. In the `<script setup>` block, add after the existing `const auth = useAuthStore()` line:

```typescript
const logoFailed = ref(false)
const orgLogoUrl = computed(() =>
  auth.organizationId ? `${import.meta.env.VITE_API_BASE_URL}/organizations/${auth.organizationId}/logo` : null,
)
```

(Add `ref` to the existing `computed` import from `'vue'` at the top: `import { computed, ref } from 'vue'`.)

Change the root `<div>` to bind the CSS vars:

```vue
  <div class="flex min-h-screen flex-col bg-cream" :style="auth.brandingCssVars">
```

Change the logo block (currently a `<picture>` with `logoWebp`/`logoPng`) to fall back correctly:

```vue
          <router-link :to="`/${locale}/`" class="shrink-0">
            <picture v-if="!orgLogoUrl || logoFailed">
              <source :srcset="logoWebp" type="image/webp" />
              <img :src="logoPng" alt="RoMa — Ciencia Aplicada" class="block h-7 w-auto sm:h-8" width="572" height="166" />
            </picture>
            <img
              v-else
              :src="orgLogoUrl"
              alt="RoMa — Ciencia Aplicada"
              class="block h-7 w-auto sm:h-8"
              @error="logoFailed = true"
            />
          </router-link>
```

Change the header's background to reference the CSS var with the current white fallback:

```vue
    <header class="border-b border-line-strong bg-[var(--org-primary,#ffffff)] px-4 py-3.5 shadow-sm print:hidden sm:px-6">
```

- [ ] **Step 2: `DashboardSidebar.vue` — active tab uses the CSS var**

Change the active-tab class binding:

```vue
          :class="
            tab.key === modelValue
              ? 'border-[var(--org-secondary,#5b8dc7)] bg-[var(--org-primary,#e3edf8)] text-navy-900'
              : 'border-transparent text-navy-700 hover:bg-sky-400/10'
          "
```

- [ ] **Step 3: `SubmitButton.vue` — accent buttons use the CSS var**

This component is shared across the whole app (public contact form, login, admin forms, client forms) — safe to widen globally because `--org-primary` is only ever set on `DashboardLayout.vue`'s root (Step 1), which public pages never render, and `auth.branding` is only ever populated for CLIENT sessions (never admin — platform users have no `UserOrganization` row, so `membership` is always `null` for them in `meHandler`). Change:

```vue
<template>
  <button
    type="submit"
    :disabled="loading"
    class="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--org-primary,#0b1a33)] bg-[var(--org-primary,#0b1a33)] px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-[250ms] hover:bg-transparent hover:text-[var(--org-primary,#0b1a33)] disabled:cursor-not-allowed disabled:opacity-60"
  >
```

(Only the `class` attribute's 3 `navy-900` references change to the arbitrary-value form with fallback — everything else in the file is untouched.)

- [ ] **Step 4: Verify**

```bash
cd frontend && npx vue-tsc -b
```
Expected: no errors. This task's actual visual verification happens in Task 11 (browser checkpoint) — a header-background color change is highly visible, so don't skip that check.

---

## Task 10: i18n keys (es/en) + parity

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Update `organizations.form.*` (es.json)**

In the `organizations.form` block, add 2 keys right after `responsableCargoPlaceholder`:

```json
      "responsableCargo": "Cargo",
      "responsableCargoPlaceholder": "Ej. Gerente de SST",
      "responsableTelefono": "Teléfono",
      "responsableTelefonoPlaceholder": "Ej. +57 300 000 0000",
```

- [ ] **Step 2: Update `organizations.validation.*` (es.json)**

Add 2 keys after `responsableCargoRequired`:

```json
      "responsableCargoRequired": "Ingresa el cargo del responsable",
      "responsableTelefonoRequired": "Ingresa un teléfono válido",
      "responsableTelefonoInvalid": "Solo números, espacios y +()-"
```

- [ ] **Step 3: Update `organizations.editModal.*` (es.json)**

Replace the block (the `responsableNotice` text is now factually wrong — there is no more "propio perfil" for cargo/telefono):

```json
    "editModal": {
      "title": "Editar empresa",
      "responsableNotice": "El cargo y el teléfono del responsable se definieron al crear la cuenta y no se pueden editar aquí.",
      "brandingSectionTitle": "Logo y colores corporativos"
    }
```

- [ ] **Step 4: Replace `profile.*` (es.json)**

```json
  "profile": {
    "pageTitle": "Personaliza tu panel",
    "pageSubtitle": "Sube el logo y los colores de tu empresa — se verán en tu panel la próxima vez que ingreses. Solo se pide una vez.",
    "submit": "Guardar y continuar"
  },
```

- [ ] **Step 5: Add `branding.*` (es.json)**

Add a new top-level key (place it alphabetically near `"clients"` or any convenient spot at the top level — exact position doesn't matter for JSON validity):

```json
  "branding": {
    "fields": {
      "logoLabel": "Logo de tu empresa",
      "logoHint": "PNG o SVG, hasta 500KB.",
      "logoTypeError": "El archivo debe ser PNG o SVG.",
      "logoSizeError": "El logo no puede superar 500KB.",
      "logoPreviewAlt": "Vista previa del logo",
      "primaryColorLabel": "Color primario",
      "secondaryColorLabel": "Color secundario",
      "previewLabel": "Vista previa",
      "previewText": "Así se vería tu navbar"
    },
    "activation": {
      "logoRequired": "Sube un logo para continuar.",
      "genericError": "Ocurrió un error. Por favor intenta de nuevo."
    }
  },
```

- [ ] **Step 6: Mirror all of the above in `en.json`**

`organizations.form`:
```json
      "responsableCargo": "Position",
      "responsableCargoPlaceholder": "E.g. Safety Manager",
      "responsableTelefono": "Phone",
      "responsableTelefonoPlaceholder": "E.g. +1 300 000 0000",
```

`organizations.validation`:
```json
      "responsableCargoRequired": "Enter the responsible person's position",
      "responsableTelefonoRequired": "Enter a valid phone number",
      "responsableTelefonoInvalid": "Numbers, spaces, and +()- only"
```

`organizations.editModal`:
```json
    "editModal": {
      "title": "Edit company",
      "responsableNotice": "The responsible person's position and phone were set when the account was created and can't be edited here.",
      "brandingSectionTitle": "Logo and corporate colors"
    }
```

`profile`:
```json
  "profile": {
    "pageTitle": "Personalize your dashboard",
    "pageSubtitle": "Upload your company's logo and colors — they'll show up in your dashboard next time you sign in. Only asked once.",
    "submit": "Save and continue"
  },
```

`branding` (new top-level key):
```json
  "branding": {
    "fields": {
      "logoLabel": "Your company's logo",
      "logoHint": "PNG or SVG, up to 500KB.",
      "logoTypeError": "The file must be PNG or SVG.",
      "logoSizeError": "The logo can't exceed 500KB.",
      "logoPreviewAlt": "Logo preview",
      "primaryColorLabel": "Primary color",
      "secondaryColorLabel": "Secondary color",
      "previewLabel": "Preview",
      "previewText": "This is how your navbar would look"
    },
    "activation": {
      "logoRequired": "Upload a logo to continue.",
      "genericError": "Something went wrong. Please try again."
    }
  },
```

- [ ] **Step 7: Remove now-unused `profile.cargo`/`telefono`/`validation` keys**

Since `UpdateProfileView.vue` no longer renders these fields, remove `cargo`, `cargoPlaceholder`, `telefono`, `telefonoPlaceholder`, and the `validation` sub-object from the `profile` block in **both** `es.json` and `en.json` (already excluded from the replacement blocks in Steps 4 and 6 above — just confirm they're gone, don't leave dead keys).

- [ ] **Step 8: Verify parity**

```bash
cd /home/laortiz937/Documentos/sst-platform
python3 -c "
import json
def keys(d, prefix=''):
    out = set()
    for k, v in d.items():
        p = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out |= keys(v, p)
        else:
            out.add(p)
    return out
es = json.load(open('frontend/src/i18n/locales/es.json'))
en = json.load(open('frontend/src/i18n/locales/en.json'))
ke, kn = keys(es), keys(en)
print('only in es:', ke - kn)
print('only in en:', kn - ke)
print('OK' if ke == kn else 'MISMATCH')
"
```
Expected: `OK`, both diff sets empty.

---

## Task 11: Checkpoint — typecheck + full browser verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck, both projects**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend && npm run typecheck
cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b
```
Expected: zero errors in both.

- [ ] **Step 2: Restart backend/frontend dev servers** (schema + route changes need a fresh process)

Use the project's `preview_start` mechanism (or `.claude/launch.json` configs `backend`/`frontend`) rather than raw `npm run dev` in the background.

- [ ] **Step 3: Browser scenario — admin creates an org with telefono**

Log in as super-admin (document `1000000001`), go to Clientes → Nueva empresa, fill the form including the new Teléfono field, submit. Confirm success and that the new user row appears in "Pendiente de activación".

- [ ] **Step 4: Browser scenario — first user activates, sees branding form**

Use the activation link (check backend logs or the dev email catcher for the activation URL/token). Confirm `UpdateProfileView.vue` shows the logo upload + 2 color pickers + preview, NOT cargo/teléfono. Upload a small PNG, pick 2 colors, submit. Confirm redirect to the dashboard and that the navbar/sidebar immediately reflect the chosen colors and logo.

- [ ] **Step 5: Browser scenario — second user of the same org skips the form**

Create a second organization user for the SAME organization (if the admin UI only supports one responsable per org at creation, insert a second `UserOrganization` row for that org directly via SQL for this test, or use the admin's resend/second-invite path if one exists — check `users.service.ts` for a relevant method first). Activate that second user's account and confirm they land directly on the dashboard with **no** branding form shown, and see the same logo/colors the first user set.

- [ ] **Step 6: Browser scenario — admin never sees client branding**

While logged in as super-admin, browse to that organization's Higiene Industrial panel (Operación). Confirm the navbar/sidebar still show RoMa's default navy/sky styling, never the client's custom colors, regardless of which organization is selected.

- [ ] **Step 7: Browser scenario — admin edits branding later**

From Clientes, edit the organization used in Step 4, change the primary color via `EditOrganizationModal.vue`'s new branding section (leave logo untouched), save. Log back in as that org's client user (or reload if already logged in) and confirm the new color applies, logo unchanged.

- [ ] **Step 8: Browser scenario — org without branding shows RoMa default**

Log in as a client user whose organization has never set branding (or check a freshly created, not-yet-activated one via the admin's org list, or the seeded `Organizacion 2` before this arc's cleanup if it still lacks branding). Confirm navbar/sidebar show RoMa's default navy/sky, no broken image, no console error.

- [ ] **Step 9: Check for console errors throughout**

At each step above, confirm no browser console errors (use whatever console-log inspection tool is available in this session).

---

## Task 12: Final test-account cleanup (explicit confirmation required before running)

**Files:** none (data operation only — present the exact SQL to the user and wait for explicit "yes, run it" before executing, per this session's standing rule on destructive actions).

- [ ] **Step 1: Confirm current test data inventory (capture user document numbers BEFORE deleting anything)**

`user_organizations` gets deleted mid-sequence in Step 2, so the exact set of user `document_number`s tied to these 4 organizations must be captured **now**, via a join, and hardcoded into the `users` DELETE below — never derived from `user_organizations` after it's already been emptied.

```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db -e "
SELECT id, nombre FROM organizations;
SELECT u.document_number, u.nombre, u.account_status, o.nombre AS organization_nombre
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
JOIN organizations o ON o.id = uo.organization_id
WHERE o.nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica');
"
```

Expected (matches current known state, confirm it still holds): `1000000003` (Organizacion 1), `1000000004` (Organizacion 2), plus whichever document numbers own "Creator Ai Web" and "Chat Clinica" — read these off the actual query output, do not assume.

- [ ] **Step 2: Present the exact DELETE sequence to the user and wait for explicit confirmation**

Substitute Step 1's actual document numbers into the final `DELETE FROM users` line below before presenting this to the user:

```sql
DELETE FROM variable_readings WHERE upload_id IN (SELECT id FROM variable_uploads WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica')));
DELETE FROM variable_uploads WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
DELETE FROM work_points WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
DELETE FROM organization_services WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
DELETE FROM notifications WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
DELETE FROM audit_logs WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
DELETE FROM user_organizations WHERE organization_id IN (SELECT id FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica'));
-- Reemplazar esta lista con los document_number reales de la consulta del Step 1
-- (no derivar de user_organizations acá — esa tabla ya quedó vacía en la línea anterior).
DELETE FROM users WHERE document_number IN ('1000000003','1000000004','<doc-creator-ai-web>','<doc-chat-clinica>');
DELETE FROM organizations WHERE nombre IN ('Organizacion 1','Organizacion 2','Creator Ai Web','Chat Clinica');
```

- [ ] **Step 3: Execute only after explicit user confirmation**

```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db < /path/to/confirmed_cleanup.sql
```

- [ ] **Step 4: Verify the clean slate**

```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db -e "
SELECT document_number, nombre, account_status FROM users;
SELECT id, nombre FROM organizations;
"
```
Expected: only `1000000001` (super-admin) and `1000000002` (adminsystem) in `users`; zero rows in `organizations`.

- [ ] **Step 5: End-to-end validation with a brand-new account**

Repeat Task 11's Steps 3-4 (create org → activate → branding) with a genuinely fresh organization, confirming the entire flow works from a clean database.
