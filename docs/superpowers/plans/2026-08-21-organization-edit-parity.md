# Edición de empresas con paridad de creación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al admin, desde "Clientes", la capacidad de agregar/quitar servicios contratados, editar logo/colores, y editar el email del responsable (sincronizado con `Organization.contactEmail`) de una empresa ya creada — sin tocar el número de documento (login) ni la contraseña.

**Architecture:** Se extiende el patrón ya existente de "un botón, un modal, una responsabilidad" en `ClientsListView.vue` (igual que "Categorías" hoy) con dos botones nuevos ("Servicios", "Marca"), cada uno con su propio modal, endpoint(s) de backend y permiso (`platform.organizations.manage`, el mismo que ya protege todo el módulo). El modal "Editar" existente se amplía en backend (no en UI) para sincronizar el email del responsable. Ningún endpoint del flujo de creación ni del flujo de branding del propio cliente se modifica.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Fastify + Zod, Prisma + MySQL, Vitest.

## Global Constraints

- `documentNumber`/`documentType` del responsable nunca aparecen en ningún campo ni endpoint nuevo — quedan completamente fuera de alcance.
- No se toca `/api/dashboard/organization/branding` (flujo del cliente) ni ningún archivo bajo `frontend/src/modules/auth/` o `frontend/src/components/dashboard/organizations/CreateOrganizationForm.vue`.
- Quitar un servicio nunca borra la fila `OrganizationService` ni datos históricos — solo pone `isActive: false` (mismo criterio de borrado suave que el resto de la plataforma).
- Una organización nunca puede quedar con cero servicios activos.
- El email de organización y el email del responsable (`User.email`) se mantienen siempre sincronizados — un solo campo en el formulario de edición actualiza ambos.
- Cada endpoint nuevo de admin va protegido por `platform.organizations.manage` (mismo permiso que ya usa todo `organizations.routes.ts`/`orgCategoryConfig.routes.ts`).
- Toda cadena de texto nueva va en `frontend/src/i18n/locales/es.json` y `en.json` (misma clave, ambos archivos).

---

### Task 1: Migración — nueva acción de auditoría para branding editado por admin

**Files:**
- Modify: `backend/prisma/schema.prisma` (enum `AuditAction`)
- Create: migración generada por Prisma (nombre exacto lo define el comando)

**Interfaces:**
- Consumes: nada.
- Produces: el valor de enum `ORGANIZATION_BRANDING_UPDATED_BY_ADMIN`, usado por la Tarea 5.

- [ ] **Step 1: Agregar el valor al enum**

En `backend/prisma/schema.prisma`, encontrar este bloque exacto (dentro de `enum AuditAction`):

```prisma
  ORGANIZATION_DELETED
  ORGANIZATION_RESTORED
}
```

Reemplazar por:

```prisma
  ORGANIZATION_DELETED
  ORGANIZATION_RESTORED
  /// Admin edita logo/colores de una empresa ya creada, desde "Clientes" →
  /// "Marca" (2026-08) — distinto de ORGANIZATION_BRANDING_UPDATED, que es
  /// el propio cliente editando su marca desde Configuración general.
  ORGANIZATION_BRANDING_UPDATED_BY_ADMIN
}
```

- [ ] **Step 2: Generar la migración**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx prisma migrate dev --name organization_branding_updated_by_admin_action`
Expected: crea una carpeta nueva en `prisma/migrations/` con un `ALTER TABLE audit_logs MODIFY action ENUM(...)` que incluye el nuevo valor, y termina con "Your database is now in sync with your schema."

- [ ] **Step 3: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output (limpio) — confirma que el cliente Prisma regenerado sigue siendo válido.

- [ ] **Step 4: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: acción de auditoría para branding editado por admin"
```

---

### Task 2: Backend — sincronizar email del responsable al editar la empresa

**Files:**
- Modify: `backend/src/modules/organizations/organizations.repository.ts:64-66` (método `update`)
- Modify: `backend/src/modules/organizations/organizations.service.ts` (sin cambio de firma, solo se beneficia del repository nuevo)

**Interfaces:**
- Consumes: nada nuevo — el endpoint `PATCH /api/admin/organizations/:organizationId` ya existente, sin cambios de contrato (mismo `UpdateOrganizationInput`).
- Produces: nada que otra tarea consuma directamente — es un fix de comportamiento aislado.

- [ ] **Step 1: Reemplazar `update()` en el repository para que sea transaccional**

En `backend/src/modules/organizations/organizations.repository.ts`, encontrar este bloque exacto:

```ts
    update(id: string, data: { nombre?: string; nit?: string; contactEmail?: string }) {
      return prisma.organization.update({ where: { id }, data })
    },
```

Reemplazar por:

```ts
    /** Si `contactEmail` cambia, también actualiza el email del responsable
     * (User.email) en la misma transacción — ambos deben quedar siempre
     * sincronizados (ver nota en organizations.schema.ts: "un solo correo
     * por empresa"). El responsable es el primer miembro por orden de
     * creación, mismo criterio que findResponsable() y listFull(). */
    update(id: string, data: { nombre?: string; nit?: string; contactEmail?: string }) {
      return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.update({ where: { id }, data })
        if (data.contactEmail !== undefined) {
          const membership = await tx.userOrganization.findFirst({
            where: { organizationId: id },
            orderBy: { createdAt: 'asc' },
          })
          if (membership) {
            await tx.user.update({ where: { id: membership.userId }, data: { email: data.contactEmail } })
          }
        }
        return organization
      })
    },
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Verificación manual contra el servidor local**

(El backend dev server debe estar corriendo — `cd backend && npm run dev` en otra terminal si no lo está.)

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"documentNumber":"1000000001","password":"'"$SEED_SUPERADMIN_PASSWORD"'"}' \
  -c /tmp/admin-cookie.txt -o /dev/null -w "login: %{http_code}\n"
# Tomar el id de una organización real de prueba:
curl -s http://localhost:3000/api/admin/organizations/full -b /tmp/admin-cookie.txt | head -c 300
```

Con un `organizationId` real de la respuesta anterior:

```bash
curl -s -X PATCH http://localhost:3000/api/admin/organizations/<organizationId> \
  -H "Content-Type: application/json" -b /tmp/admin-cookie.txt \
  -d '{"contactEmail":"nuevo-email-de-prueba@example.com"}' -w "\nstatus: %{http_code}\n"
```

Expected: `status: 200`. Luego confirmar que el responsable también cambió:

```bash
curl -s http://localhost:3000/api/admin/organizations/full -b /tmp/admin-cookie.txt | grep -o '"email":"nuevo-email-de-prueba@example.com"'
```

Expected: aparece al menos una vez (el `responsable.email` de esa organización).

- [ ] **Step 4: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/src/modules/organizations/organizations.repository.ts
git commit -m "fix: editar el email de empresa sincroniza el email del responsable"
```

---

### Task 3: Backend — función pura `computeServiceDiff` + tests (TDD)

**Files:**
- Modify: `backend/src/modules/organizations/organizations.service.ts` (agregar función exportada, al final del archivo)
- Create: `backend/src/modules/organizations/organizations.service.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `computeServiceDiff(current: OrganizationServiceState[], desiredSlugs: string[]): { toGrant: string[]; toRevoke: string[] }` y el tipo `OrganizationServiceState { slug: string; isActive: boolean }` — la Tarea 4 los importa y usa directamente.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `backend/src/modules/organizations/organizations.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeServiceDiff } from './organizations.service.js'

describe('computeServiceDiff', () => {
  it('servicio nuevo (no existía ninguna fila) → se agrega a toGrant', () => {
    const result = computeServiceDiff([], ['higiene-industrial'])
    expect(result).toEqual({ toGrant: ['higiene-industrial'], toRevoke: [] })
  })

  it('servicio ya activo y sigue en la lista deseada → no aparece en ningún lado', () => {
    const current = [{ slug: 'higiene-industrial', isActive: true }]
    const result = computeServiceDiff(current, ['higiene-industrial'])
    expect(result).toEqual({ toGrant: [], toRevoke: [] })
  })

  it('servicio activo que ya NO está en la lista deseada → se agrega a toRevoke', () => {
    const current = [{ slug: 'higiene-industrial', isActive: true }, { slug: 'seguridad-vial', isActive: true }]
    const result = computeServiceDiff(current, ['higiene-industrial'])
    expect(result).toEqual({ toGrant: [], toRevoke: ['seguridad-vial'] })
  })

  it('servicio que estaba desactivado (quitado antes) y vuelve a la lista deseada → se reactiva vía toGrant', () => {
    const current = [{ slug: 'seguridad-vial', isActive: false }]
    const result = computeServiceDiff(current, ['seguridad-vial'])
    expect(result).toEqual({ toGrant: ['seguridad-vial'], toRevoke: [] })
  })

  it('servicio inactivo que NO está en la lista deseada → no se toca (ya está fuera, no hay nada que revocar dos veces)', () => {
    const current = [{ slug: 'seguridad-vial', isActive: false }]
    const result = computeServiceDiff(current, [])
    expect(result).toEqual({ toGrant: [], toRevoke: [] })
  })

  it('mezcla: uno se agrega, uno se mantiene, uno se quita', () => {
    const current = [
      { slug: 'higiene-industrial', isActive: true },
      { slug: 'seguridad-vial', isActive: true },
    ]
    const result = computeServiceDiff(current, ['higiene-industrial', 'mantenimiento-basado-en-riesgo'])
    expect(result.toGrant).toEqual(['mantenimiento-basado-en-riesgo'])
    expect(result.toRevoke).toEqual(['seguridad-vial'])
  })

  it('lista deseada vacía y sin nada activo → ambos arrays vacíos, sin lanzar error', () => {
    expect(computeServiceDiff([], [])).toEqual({ toGrant: [], toRevoke: [] })
  })
})
```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx vitest run src/modules/organizations/organizations.service.test.ts`
Expected: FAIL — `computeServiceDiff` no existe en el módulo (error de import).

- [ ] **Step 3: Implementar la función**

En `backend/src/modules/organizations/organizations.service.ts`, agregar al final del archivo (después del cierre de `createOrganizationsService` y su `export type OrganizationsService = ...`):

```ts
export interface OrganizationServiceState {
  slug: string
  isActive: boolean
}

/**
 * Diferencia pura entre el estado actual de servicios contratados y el
 * conjunto deseado — separada de cualquier acceso a Prisma para poder
 * testearla sin base de datos (2026-08, "agregar/quitar servicios").
 *
 * - Un slug deseado que hoy no está activo (sea porque nunca existió la
 *   fila, o porque existe pero isActive=false) va a `toGrant` — el
 *   repository decide si eso significa crear la fila o solo reactivarla.
 * - Un slug hoy activo que ya no está en la lista deseada va a `toRevoke`
 *   — nunca se borra la fila, solo se desactiva (ver Global Constraints).
 * - Un slug ya inactivo que tampoco está en la lista deseada no aparece en
 *   ningún lado: ya está en el estado correcto, no hay nada que revocar
 *   dos veces.
 */
export function computeServiceDiff(
  current: OrganizationServiceState[],
  desiredSlugs: string[],
): { toGrant: string[]; toRevoke: string[] } {
  const currentActiveSlugs = new Set(current.filter((s) => s.isActive).map((s) => s.slug))
  const desiredSet = new Set(desiredSlugs)
  const toGrant = desiredSlugs.filter((slug) => !currentActiveSlugs.has(slug))
  const toRevoke = current.filter((s) => s.isActive && !desiredSet.has(s.slug)).map((s) => s.slug)
  return { toGrant, toRevoke }
}
```

- [ ] **Step 4: Correr los tests para confirmar que pasan**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx vitest run src/modules/organizations/organizations.service.test.ts`
Expected: PASS — 7/7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/src/modules/organizations/organizations.service.ts backend/src/modules/organizations/organizations.service.test.ts
git commit -m "feat: función pura computeServiceDiff para agregar/quitar servicios"
```

---

### Task 4: Backend — endpoint para agregar/quitar servicios

**Files:**
- Modify: `backend/src/modules/organizations/organizations.schema.ts` (nuevo schema)
- Modify: `backend/src/modules/organizations/organizations.repository.ts` (nuevos métodos)
- Modify: `backend/src/modules/organizations/organizations.service.ts` (nuevo método `updateServices`)
- Modify: `backend/src/modules/organizations/organizations.controller.ts` (nuevo handler)
- Modify: `backend/src/modules/organizations/organizations.routes.ts` (nueva ruta)

**Interfaces:**
- Consumes: `computeServiceDiff`, `OrganizationServiceState` de la Tarea 3 (mismo archivo).
- Produces: `PUT /api/admin/organizations/:organizationId/services`, body `{ serviceSlugs: string[] }`, 204 en éxito — la Tarea 6 (frontend) lo consume.

- [ ] **Step 1: Agregar el schema Zod**

En `backend/src/modules/organizations/organizations.schema.ts`, agregar al final del archivo (después de `formatFieldErrors`):

```ts
export const updateOrganizationServicesSchema = z.object({
  serviceSlugs: z.array(z.string().min(1)).min(1, 'Selecciona al menos un servicio'),
})

export type UpdateOrganizationServicesInput = z.infer<typeof updateOrganizationServicesSchema>
```

- [ ] **Step 2: Agregar métodos al repository**

En `backend/src/modules/organizations/organizations.repository.ts`, agregar estos métodos dentro del objeto que retorna `createOrganizationsRepository` (por ejemplo justo después de `findResponsable`):

```ts
    /** Estado actual de servicios contratados con su slug — insumo de
     * computeServiceDiff() en organizations.service.ts. */
    async listOrganizationServicesWithSlugs(organizationId: string) {
      const rows = await prisma.organizationService.findMany({
        where: { organizationId },
        select: { isActive: true, service: { select: { slug: true } } },
      })
      return rows.map((r) => ({ slug: r.service.slug, isActive: r.isActive }))
    },

    /** Aplica el diff calculado por computeServiceDiff(): crea/reactiva las
     * filas de `grants` (upsert — puede ser una fila nueva o una que se
     * había desactivado antes) y desactiva las de `revokeServiceIds` (nunca
     * las borra, ver Global Constraints del plan). Si "higiene-industrial"
     * está entre los slugs otorgados, crea sus 5 filas de
     * OrganizationCategoryConfig si todavía no existen (skipDuplicates —
     * mismo default que createWithResponsible, nunca pisa configuración ya
     * personalizada de una contratación anterior). */
    async applyServiceDiff(
      organizationId: string,
      grants: { serviceId: string; slug: string }[],
      revokeServiceIds: string[],
    ) {
      await prisma.$transaction(async (tx) => {
        for (const grant of grants) {
          await tx.organizationService.upsert({
            where: { organizationId_serviceId: { organizationId, serviceId: grant.serviceId } },
            update: { isActive: true },
            create: { organizationId, serviceId: grant.serviceId, isActive: true },
          })
        }
        if (revokeServiceIds.length > 0) {
          await tx.organizationService.updateMany({
            where: { organizationId, serviceId: { in: revokeServiceIds } },
            data: { isActive: false },
          })
        }
        if (grants.some((g) => g.slug === 'higiene-industrial')) {
          await tx.organizationCategoryConfig.createMany({
            data: TODAS_LAS_CATEGORIAS.map((categoria) => ({ organizationId, categoria, habilitada: true })),
            skipDuplicates: true,
          })
        }
      })
    },
```

- [ ] **Step 3: Agregar el método al service**

En `backend/src/modules/organizations/organizations.service.ts`, importar el nuevo tipo y agregar el método dentro del objeto que retorna `createOrganizationsService` (justo después de `update`, antes de `remove`). Primero, actualizar el import de la línea 4:

```ts
import type { CreateOrganizationInput, UpdateOrganizationInput } from './organizations.schema.js'
```

pasa a:

```ts
import type { CreateOrganizationInput, UpdateOrganizationInput, UpdateOrganizationServicesInput } from './organizations.schema.js'
```

Y agregar este método (después del método `update`, antes de `remove`):

```ts
    /** Agrega/quita servicios contratados — nunca borra filas ni datos
     * históricos, ver Global Constraints. Un log de auditoría por servicio
     * que cambia (ORG_SERVICE_GRANTED/ORG_SERVICE_REVOKED, valores ya
     * existentes en el enum pero sin uso hasta ahora), no uno genérico por
     * la petición completa. */
    async updateServices(
      organizationId: string,
      input: UpdateOrganizationServicesInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findById(organizationId)
      if (!existing) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      const services = await Promise.all(input.serviceSlugs.map((slug) => repository.findServiceBySlug(slug)))
      const missingIndex = services.findIndex((s) => !s)
      if (missingIndex !== -1) throw new OrganizationsError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const current = await repository.listOrganizationServicesWithSlugs(organizationId)
      const diff = computeServiceDiff(current, input.serviceSlugs)

      const grants = diff.toGrant.map((slug) => ({
        slug,
        serviceId: services[input.serviceSlugs.indexOf(slug)]!.id,
      }))
      // `services` (arriba) solo resuelve los slugs DESEADOS — los que se
      // revocan pueden no estar ahí, por eso se resuelven aparte.
      const revokedServices = diff.toRevoke.length > 0 ? await repository.findServiceIdsBySlugs(diff.toRevoke) : []

      await repository.applyServiceDiff(organizationId, grants, revokedServices.map((s) => s.id))

      for (const grant of grants) {
        await repository.createAuditLog({
          userId: updatedByUserId,
          organizationId,
          action: 'ORG_SERVICE_GRANTED',
          metadata: { serviceSlug: grant.slug },
          ipAddress,
        })
      }
      for (const slug of diff.toRevoke) {
        await repository.createAuditLog({
          userId: updatedByUserId,
          organizationId,
          action: 'ORG_SERVICE_REVOKED',
          metadata: { serviceSlug: slug },
          ipAddress,
        })
      }
    },
```

`computeServiceDiff` ya está definido en este mismo archivo (Tarea 3) — no hace falta importarlo.

Ahora agregar el método `findServiceIdsBySlugs` al repository — en `backend/src/modules/organizations/organizations.repository.ts`, junto a `findServiceBySlug`:

```ts
    findServiceIdsBySlugs(slugs: string[]) {
      return prisma.service.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    },
```

- [ ] **Step 4: Agregar el handler al controller**

En `backend/src/modules/organizations/organizations.controller.ts`, agregar el import de `updateOrganizationServicesSchema` a la línea 2:

```ts
import { createOrganizationSchema, updateOrganizationSchema, updateOrganizationServicesSchema, formatFieldErrors } from './organizations.schema.js'
```

Y agregar este handler nuevo (después de `updateOrganizationHandler`, antes de `deleteOrganizationHandler`):

```ts
export async function updateOrganizationServicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOrganizationServicesSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationsService(request.server.prisma)
  try {
    await service.updateServices(organizationId, parsed.data, request.user.sub, request.ip)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}
```

- [ ] **Step 5: Agregar la ruta**

En `backend/src/modules/organizations/organizations.routes.ts`, agregar `updateOrganizationServicesHandler` al import (línea 3-9) y agregar la ruta (después de la ruta `PATCH /:organizationId`, antes de `DELETE /:organizationId`):

```ts
  app.put<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/services',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateOrganizationServicesHandler,
  )
```

- [ ] **Step 6: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output. Si hay error de tipos en el fragmento de `updateServices` señalado en la nota del Step 3, aplica exactamente el bloque corregido que se muestra ahí.

- [ ] **Step 7: Correr los tests existentes de este módulo**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx vitest run src/modules/organizations/organizations.service.test.ts`
Expected: PASS — 7/7 (sin cambios respecto a la Tarea 3, este paso solo confirma que nada se rompió).

- [ ] **Step 8: Verificación manual contra el servidor local**

```bash
# Reusa /tmp/admin-cookie.txt de la Tarea 2. Con un organizationId real:
curl -s -X PUT http://localhost:3000/api/admin/organizations/<organizationId>/services \
  -H "Content-Type: application/json" -b /tmp/admin-cookie.txt \
  -d '{"serviceSlugs":["higiene-industrial","seguridad-vial"]}' -w "\nstatus: %{http_code}\n"
```

Expected: `status: 204`. Confirmar que la organización ahora tiene ambos servicios activos:

```bash
curl -s http://localhost:3000/api/admin/organizations/full -b /tmp/admin-cookie.txt | python3 -c "
import json,sys
data = json.load(sys.stdin)
org = next(o for o in data['organizations'] if o['id'] == '<organizationId>')
print(org['services'])
"
```

Expected: ambos slugs con `isActive: true`. Luego probar quitar uno:

```bash
curl -s -X PUT http://localhost:3000/api/admin/organizations/<organizationId>/services \
  -H "Content-Type: application/json" -b /tmp/admin-cookie.txt \
  -d '{"serviceSlugs":["higiene-industrial"]}' -w "\nstatus: %{http_code}\n"
```

Expected: `status: 204`, y en la siguiente consulta `seguridad-vial` debe seguir apareciendo en el array `services` pero con `isActive: false` (no desaparece la fila).

- [ ] **Step 9: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/src/modules/organizations/organizations.schema.ts backend/src/modules/organizations/organizations.repository.ts backend/src/modules/organizations/organizations.service.ts backend/src/modules/organizations/organizations.controller.ts backend/src/modules/organizations/organizations.routes.ts
git commit -m "feat: endpoint admin para agregar/quitar servicios contratados"
```

---

### Task 5: Backend — endpoints admin para editar logo/colores

**Files:**
- Modify: `backend/src/modules/organizationBranding/organizationBranding.repository.ts` (ampliar tipo de `createAuditLog`)
- Modify: `backend/src/modules/organizationBranding/organizationBranding.service.ts` (2 métodos nuevos)
- Modify: `backend/src/modules/organizationBranding/organizationBranding.controller.ts` (2 handlers nuevos)
- Modify: `backend/src/modules/organizationBranding/organizationBranding.routes.ts` (2 rutas nuevas)

**Interfaces:**
- Consumes: `ORGANIZATION_BRANDING_UPDATED_BY_ADMIN` de la Tarea 1; `saveBrandingSchema`, `formatFieldErrors` ya existentes en `organizationBranding.schema.ts` (sin cambios); `requirePermission` de `../../plugins/auth-guard.js` (ya importado por `organizations.routes.ts`, mismo patrón).
- Produces: `GET /api/admin/organizations/:organizationId/branding` (200, `{ logoBase64, primaryColor, secondaryColor }` nullable) y `PUT /api/admin/organizations/:organizationId/branding` (204) — la Tarea 6 (frontend) los consume.

- [ ] **Step 1: Ampliar el tipo de acción en el repository**

En `backend/src/modules/organizationBranding/organizationBranding.repository.ts`, encontrar:

```ts
    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'ORGANIZATION_BRANDING_SET' | 'ORGANIZATION_BRANDING_UPDATED'
    }) {
```

Reemplazar por:

```ts
    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'ORGANIZATION_BRANDING_SET' | 'ORGANIZATION_BRANDING_UPDATED' | 'ORGANIZATION_BRANDING_UPDATED_BY_ADMIN'
    }) {
```

- [ ] **Step 2: Agregar los métodos al service**

En `backend/src/modules/organizationBranding/organizationBranding.service.ts`, agregar estos 2 métodos dentro del objeto que retorna `createOrganizationBrandingService` (al final, después de `updateBrandingForUser`, antes del cierre `}`):

```ts
    /** Lectura por admin, dado un organizationId directo (a diferencia de
     * getBrandingForUser, que lo resuelve a partir del usuario logueado) —
     * usada por el botón "Marca" en Clientes. NO_ORGANIZATION acá significa
     * "esa empresa no existe", no "el usuario no tiene organización". */
    async getBrandingForOrganization(organizationId: string) {
      const organization = await repository.findBrandingForOrganization(organizationId)
      if (!organization) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Empresa no encontrada')
      }
      return {
        logoBase64: organization.logoBase64 ?? null,
        primaryColor: organization.primaryColor ?? null,
        secondaryColor: organization.secondaryColor ?? null,
      }
    },

    /** Edición por admin — siempre sobrescribe, igual que
     * updateBrandingForUser, pero con su propia acción de auditoría
     * (ORGANIZATION_BRANDING_UPDATED_BY_ADMIN) para distinguir en el rastro
     * quién hizo el cambio: el propio cliente o el admin. */
    async updateBrandingForOrganization(organizationId: string, input: SaveBrandingInput, adminUserId: string) {
      const organization = await repository.findBrandingForOrganization(organizationId)
      if (!organization) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Empresa no encontrada')
      }
      await repository.updateBranding(organizationId, input)
      await repository.createAuditLog({
        userId: adminUserId,
        organizationId,
        action: 'ORGANIZATION_BRANDING_UPDATED_BY_ADMIN',
      })
    },
```

- [ ] **Step 3: Agregar los handlers al controller**

En `backend/src/modules/organizationBranding/organizationBranding.controller.ts`, agregar estos 2 handlers (después de `updateBrandingHandler`, antes del comentario de `getLogoHandler`):

```ts
/** Lee el branding de una empresa cualquiera, dado su id — para precargar
 * el modal "Marca" en Clientes. Distinto de getBrandingHandler (que lee la
 * empresa del usuario logueado). */
export async function getOrganizationBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    const branding = await service.getBrandingForOrganization(organizationId)
    return reply.code(200).send(branding)
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(404).send({ message: err.message })
    throw err
  }
}

/** Edita el branding de una empresa cualquiera, dado su id — usado por el
 * modal "Marca" en Clientes. */
export async function updateOrganizationBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = saveBrandingSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    await service.updateBrandingForOrganization(organizationId, parsed.data, request.user.sub)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(404).send({ message: err.message })
    throw err
  }
}
```

- [ ] **Step 4: Agregar las rutas**

En `backend/src/modules/organizationBranding/organizationBranding.routes.ts`, cambiar el import (línea 1-3):

```ts
import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { saveBrandingHandler, getBrandingHandler, updateBrandingHandler, getLogoHandler } from './organizationBranding.controller.js'
```

por:

```ts
import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  saveBrandingHandler,
  getBrandingHandler,
  updateBrandingHandler,
  getLogoHandler,
  getOrganizationBrandingHandler,
  updateOrganizationBrandingHandler,
} from './organizationBranding.controller.js'
```

Y agregar, dentro de `organizationBrandingRoutes`, después del bloque `GET`/`PUT` de `/api/dashboard/organization/branding` y antes de la ruta pública `getLogoHandler`:

```ts
  // Admin — edita el branding de CUALQUIER empresa por id (distinto del
  // par de arriba, que siempre opera sobre "mi propia empresa"). Mismo
  // permiso que el resto de "Clientes" (organizations.routes.ts).
  app.get<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/branding',
    { preHandler: [requireAuth, requirePermission('platform.organizations.manage')] },
    getOrganizationBrandingHandler,
  )
  app.put<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/branding',
    { preHandler: [requireAuth, requirePermission('platform.organizations.manage')] },
    updateOrganizationBrandingHandler,
  )
```

- [ ] **Step 5: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Verificación manual contra el servidor local**

```bash
# Reusa /tmp/admin-cookie.txt. Con un organizationId real:
curl -s http://localhost:3000/api/admin/organizations/<organizationId>/branding -b /tmp/admin-cookie.txt -w "\nstatus: %{http_code}\n"
```

Expected: `status: 200`, body con `logoBase64`/`primaryColor`/`secondaryColor` (los que ya tenga esa empresa, o `null` si nunca completó branding).

```bash
curl -s -X PUT http://localhost:3000/api/admin/organizations/<organizationId>/branding \
  -H "Content-Type: application/json" -b /tmp/admin-cookie.txt \
  -d '{"logoBase64":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=","primaryColor":"#112233","secondaryColor":"#445566"}' \
  -w "\nstatus: %{http_code}\n"
```

Expected: `status: 204`. Confirmar con el GET de arriba que `primaryColor` ahora es `#112233`.

- [ ] **Step 7: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/src/modules/organizationBranding/organizationBranding.repository.ts backend/src/modules/organizationBranding/organizationBranding.service.ts backend/src/modules/organizationBranding/organizationBranding.controller.ts backend/src/modules/organizationBranding/organizationBranding.routes.ts
git commit -m "feat: endpoints admin para editar logo/colores de una empresa"
```

---

### Task 6: Frontend — servicios de API (organizations + admin branding)

**Files:**
- Modify: `frontend/src/services/organizations.service.ts` (nueva función)
- Create: `frontend/src/services/organizationAdminBranding.service.ts`

**Interfaces:**
- Consumes: `PUT /api/admin/organizations/:organizationId/services` (Tarea 4); `GET`/`PUT /api/admin/organizations/:organizationId/branding` (Tarea 5); tipos `BrandingFormValues`, `CurrentBranding` ya existentes en `frontend/src/types/organizationBranding.ts` (sin cambios).
- Produces: `updateOrganizationServices(organizationId, serviceSlugs)`, `getOrganizationBranding(organizationId)`, `updateOrganizationBranding(organizationId, values)` — las Tareas 8 y 9 los consumen.

- [ ] **Step 1: Agregar `updateOrganizationServices` a `organizations.service.ts`**

En `frontend/src/services/organizations.service.ts`, agregar al final del archivo:

```ts
export async function updateOrganizationServices(organizationId: string, serviceSlugs: string[]): Promise<void> {
  try {
    await apiClient.put(`/admin/organizations/${organizationId}/services`, { serviceSlugs })
  } catch (err) {
    rethrow(err)
  }
}
```

- [ ] **Step 2: Crear `organizationAdminBranding.service.ts`**

Crear `frontend/src/services/organizationAdminBranding.service.ts` (archivo separado de `organizationBranding.service.ts`, que es exclusivo del flujo del propio cliente — ver Global Constraints del plan):

```ts
import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { BrandingFormValues, CurrentBranding } from '@/types/organizationBranding'

export class AdminBrandingRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminBrandingRequestError'
    this.status = status
  }
}

export class AdminBrandingValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Branding form validation failed')
    this.name = 'AdminBrandingValidationError'
    this.fieldErrors = fieldErrors
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new AdminBrandingValidationError(data.errors)
    throw new AdminBrandingRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

/** Branding de CUALQUIER empresa, dado su id — para el modal "Marca" en
 * Clientes. Distinto de getBranding() en organizationBranding.service.ts,
 * que siempre lee "mi propia empresa" (el flujo del cliente). */
export async function getOrganizationBranding(organizationId: string): Promise<CurrentBranding> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/branding`)
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function updateOrganizationBranding(organizationId: string, values: BrandingFormValues): Promise<void> {
  try {
    await apiClient.put(`/admin/organizations/${organizationId}/branding`, values)
  } catch (err) {
    rethrow(err)
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/services/organizations.service.ts frontend/src/services/organizationAdminBranding.service.ts
git commit -m "feat: servicios de API frontend para servicios/marca de empresa (admin)"
```

---

### Task 7: Frontend — claves i18n (es/en)

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: nada.
- Produces: claves `clients.servicesConfig.*`, `clients.brandingConfig.*`, `organizations.editModal.emailSyncNotice`, y wording actualizado de `organizations.editModal.responsableNotice`/`brandingNotice` — las Tareas 8, 9 y 10 las leen.

- [ ] **Step 1: es.json — actualizar `organizations.editModal`**

Encontrar este bloque exacto:

```json
    "editModal": {
      "title": "Editar empresa",
      "responsableNotice": "El cargo y el teléfono del responsable se definieron al crear la cuenta y no se pueden editar aquí.",
      "brandingNotice": "El logo y los colores los define el propio cliente al activar su cuenta — no se editan aquí."
    }
  },
```

Reemplazar por:

```json
    "editModal": {
      "title": "Editar empresa",
      "emailSyncNotice": "Este correo también actualiza el email del responsable (usado para notificaciones y para recuperar su contraseña).",
      "responsableNotice": "El número de documento del responsable (usado para iniciar sesión), el cargo y el teléfono se definieron al crear la cuenta y no se pueden editar aquí.",
      "brandingNotice": "El logo y los colores se editan desde el botón \"Marca\", en el listado de empresas."
    }
  },
```

- [ ] **Step 2: es.json — agregar `clients.servicesConfig` y `clients.brandingConfig`**

Encontrar este bloque exacto (cierre de `clients.categoryConfig` y de `clients`):

```json
      "categorias": {
        "ESTRES_TERMICO": "Estrés Térmico",
        "ILUMINACION": "Iluminación",
        "SONIDO": "Sonido",
        "RADIACION_UV": "Radiación UV",
        "VIBRACION": "Vibración"
      }
    }
  },
```

Reemplazar por:

```json
      "categorias": {
        "ESTRES_TERMICO": "Estrés Térmico",
        "ILUMINACION": "Iluminación",
        "SONIDO": "Sonido",
        "RADIACION_UV": "Radiación UV",
        "VIBRACION": "Vibración"
      }
    },
    "servicesConfig": {
      "openButton": "Servicios",
      "title": "Servicios contratados",
      "hint": "Quitar un servicio solo lo oculta del panel del cliente — los datos históricos ya cargados no se borran, y volver a agregarlo los trae de vuelta.",
      "loadError": "No se pudieron cargar los servicios.",
      "actionError": "No se pudieron guardar los cambios.",
      "minOneRequired": "Selecciona al menos un servicio.",
      "saveSuccess": "Servicios actualizados correctamente."
    },
    "brandingConfig": {
      "openButton": "Marca",
      "title": "Marca de la empresa",
      "hint": "Estos datos también los puede editar el propio cliente desde su Configuración general — el último cambio guardado es el que queda.",
      "loadError": "No se pudo cargar la marca de la empresa.",
      "actionError": "No se pudo guardar la marca.",
      "saveSuccess": "Marca actualizada correctamente."
    }
  },
```

- [ ] **Step 3: en.json — actualizar `organizations.editModal`**

Encontrar este bloque exacto:

```json
    "editModal": {
      "title": "Edit company",
      "responsableNotice": "The responsible person's position and phone were set when the account was created and can't be edited here.",
      "brandingNotice": "The logo and colors are set by the client themselves when activating their account — they can't be edited here."
    }
  },
```

Reemplazar por:

```json
    "editModal": {
      "title": "Edit company",
      "emailSyncNotice": "This email also updates the responsible person's email (used for notifications and to recover their password).",
      "responsableNotice": "The responsible person's document number (used to log in), position, and phone were set when the account was created and can't be edited here.",
      "brandingNotice": "The logo and colors are edited from the \"Brand\" button in the client list."
    }
  },
```

- [ ] **Step 4: en.json — agregar `clients.servicesConfig` y `clients.brandingConfig`**

Encontrar este bloque exacto:

```json
      "categorias": {
        "ESTRES_TERMICO": "Thermal Stress",
        "ILUMINACION": "Lighting",
        "SONIDO": "Sound",
        "RADIACION_UV": "UV Radiation",
        "VIBRACION": "Vibration"
      }
    }
  },
```

Reemplazar por:

```json
      "categorias": {
        "ESTRES_TERMICO": "Thermal Stress",
        "ILUMINACION": "Lighting",
        "SONIDO": "Sound",
        "RADIACION_UV": "UV Radiation",
        "VIBRACION": "Vibration"
      }
    },
    "servicesConfig": {
      "openButton": "Services",
      "title": "Contracted services",
      "hint": "Removing a service only hides it from the client's dashboard — historical data already loaded is never deleted, and adding it back brings it right back.",
      "loadError": "Couldn't load the services.",
      "actionError": "Couldn't save the changes.",
      "minOneRequired": "Select at least one service.",
      "saveSuccess": "Services updated successfully."
    },
    "brandingConfig": {
      "openButton": "Brand",
      "title": "Company brand",
      "hint": "This can also be edited by the client themselves from their General settings — whichever change was saved last is the one that stays.",
      "loadError": "Couldn't load the company's brand.",
      "actionError": "Couldn't save the brand.",
      "saveSuccess": "Brand updated successfully."
    }
  },
```

- [ ] **Step 5: Verificar JSON válido y typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json', 'utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: claves i18n para edición de servicios/marca de empresa"
```

---

### Task 8: Frontend — `ServicesConfigModal.vue`

**Files:**
- Create: `frontend/src/components/dashboard/organizations/ServicesConfigModal.vue`

**Interfaces:**
- Consumes: `updateOrganizationServices` de `@/services/organizations.service` (Tarea 6); `listServices` de `@/services/organizations.service` (ya existente, sin cambios); `iconForService` de `@/utils/serviceIcon`, `serviceLabel` de `@/utils/serviceLabel` (ya existentes); `Modal.vue` (`title`, `scrollable`, `@close`); claves i18n `clients.servicesConfig.*` (Tarea 7).
- Produces: componente con props `{ organizationId: string; organizationNombre: string; currentServiceSlugs: string[] }` (los slugs ACTIVOS hoy — viene del `org.services` que `ClientsListView.vue` ya tiene cargado, sin pedirlo de nuevo) y emits `{ saved: []; cancel: [] }` — la Tarea 10 lo instancia.

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/dashboard/organizations/ServicesConfigModal.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import { listServices, updateOrganizationServices, OrganizationRequestError } from '@/services/organizations.service'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { ServiceOption } from '@/types/organization'
import type { Locale } from '@/i18n'

const props = defineProps<{
  organizationId: string
  organizationNombre: string
  currentServiceSlugs: string[]
}>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const saving = ref(false)
const services = ref<ServiceOption[]>([])
const selectedSlugs = ref<string[]>([...props.currentServiceSlugs])
const validationError = ref('')

async function load() {
  status.value = 'loading'
  try {
    services.value = await listServices()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof OrganizationRequestError ? err.message : t('clients.servicesConfig.loadError'))
  }
}

onMounted(load)

function toggle(slug: string, checked: boolean) {
  if (checked) {
    if (!selectedSlugs.value.includes(slug)) selectedSlugs.value = [...selectedSlugs.value, slug]
  } else {
    selectedSlugs.value = selectedSlugs.value.filter((s) => s !== slug)
  }
}

async function handleSave() {
  validationError.value = ''
  if (selectedSlugs.value.length === 0) {
    validationError.value = t('clients.servicesConfig.minOneRequired')
    return
  }
  saving.value = true
  try {
    await updateOrganizationServices(props.organizationId, selectedSlugs.value)
    useToast().success(t('clients.servicesConfig.saveSuccess'))
    emit('saved')
  } catch (err) {
    useToast().error(err instanceof OrganizationRequestError ? err.message : t('clients.servicesConfig.actionError'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal title="" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.servicesConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.servicesConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <div v-else-if="status === 'ready'" class="mt-4 grid gap-2 sm:grid-cols-2">
      <label
        v-for="service in services"
        :key="service.slug"
        class="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors"
        :class="
          selectedSlugs.includes(service.slug)
            ? 'border-sky-400 bg-sky-50 text-navy-900'
            : 'border-line-strong bg-white text-navy-900 hover:bg-cream'
        "
      >
        <input
          type="checkbox"
          :value="service.slug"
          :checked="selectedSlugs.includes(service.slug)"
          class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-line-strong"
          @change="toggle(service.slug, ($event.target as HTMLInputElement).checked)"
        />
        <component :is="iconForService(service.slug)" class="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
        <span class="min-w-0">{{ serviceLabel(service.slug, service.nombre, locale as Locale) }}</span>
      </label>
    </div>
    <p v-if="validationError" class="mt-1.5 text-xs text-red-600">{{ validationError }}</p>

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
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="status !== 'ready' || saving"
        @click="handleSave"
      >
        {{ t('dashboard.servicesManagement.modal.save') }}
      </button>
    </div>
  </Modal>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output. Si `ServiceOption` o `OrganizationRequestError` no se encuentran, confirma en `frontend/src/types/organization.ts` y `frontend/src/services/organizations.service.ts` que ambos están exportados con esos nombres exactos (ya deberían estarlo, son preexistentes).

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/components/dashboard/organizations/ServicesConfigModal.vue
git commit -m "feat: modal admin para agregar/quitar servicios de una empresa"
```

---

### Task 9: Frontend — `BrandingConfigModal.vue`

**Files:**
- Create: `frontend/src/components/dashboard/organizations/BrandingConfigModal.vue`

**Interfaces:**
- Consumes: `getOrganizationBranding`, `updateOrganizationBranding`, `AdminBrandingRequestError`, `AdminBrandingValidationError` de `@/services/organizationAdminBranding.service` (Tarea 6); `BrandingFields.vue` (ya existente, props `v-model:logo-base64`, `v-model:primary-color`, `v-model:secondary-color` — sin modificarlo); `Modal.vue`; claves i18n `clients.brandingConfig.*` (Tarea 7).
- Produces: componente con props `{ organizationId: string; organizationNombre: string }` y emits `{ saved: []; cancel: [] }` — la Tarea 10 lo instancia.

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/dashboard/organizations/BrandingConfigModal.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import BrandingFields from './BrandingFields.vue'
import { useToast } from '@/composables/useToast'
import {
  getOrganizationBranding,
  updateOrganizationBranding,
  AdminBrandingRequestError,
  AdminBrandingValidationError,
} from '@/services/organizationAdminBranding.service'

const props = defineProps<{ organizationId: string; organizationNombre: string }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const saving = ref(false)
const logoBase64 = ref('')
const primaryColor = ref('#0b1a33')
const secondaryColor = ref('#5b8dc7')
const errors = ref<Record<string, string>>({})

async function load() {
  status.value = 'loading'
  try {
    const current = await getOrganizationBranding(props.organizationId)
    logoBase64.value = current.logoBase64 ?? ''
    primaryColor.value = current.primaryColor ?? '#0b1a33'
    secondaryColor.value = current.secondaryColor ?? '#5b8dc7'
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof AdminBrandingRequestError ? err.message : t('clients.brandingConfig.loadError'))
  }
}

onMounted(load)

async function handleSave() {
  errors.value = {}
  saving.value = true
  try {
    await updateOrganizationBranding(props.organizationId, {
      logoBase64: logoBase64.value,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
    })
    useToast().success(t('clients.brandingConfig.saveSuccess'))
    emit('saved')
  } catch (err) {
    if (err instanceof AdminBrandingValidationError) {
      errors.value = err.fieldErrors
      useToast().error(Object.values(err.fieldErrors)[0] ?? t('clients.brandingConfig.actionError'))
    } else {
      useToast().error(err instanceof AdminBrandingRequestError ? err.message : t('clients.brandingConfig.actionError'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal title="" max-width="lg" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.brandingConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.brandingConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <BrandingFields
      v-else-if="status === 'ready'"
      class="mt-4"
      v-model:logo-base64="logoBase64"
      v-model:primary-color="primaryColor"
      v-model:secondary-color="secondaryColor"
    />
    <p v-if="errors.logoBase64" class="mt-1.5 text-xs text-red-600">{{ errors.logoBase64 }}</p>

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
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="status !== 'ready' || saving"
        @click="handleSave"
      >
        {{ t('dashboard.servicesManagement.modal.save') }}
      </button>
    </div>
  </Modal>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/components/dashboard/organizations/BrandingConfigModal.vue
git commit -m "feat: modal admin para editar logo/colores de una empresa"
```

---

### Task 10: Frontend — cablear los 2 modales nuevos en `ClientsListView.vue`

**Files:**
- Modify: `frontend/src/modules/clients/views/ClientsListView.vue`
- Modify: `frontend/src/components/dashboard/organizations/EditOrganizationModal.vue` (agregar el hint de sincronización de email)

**Interfaces:**
- Consumes: `ServicesConfigModal.vue` (Tarea 8), `BrandingConfigModal.vue` (Tarea 9), clave i18n `organizations.editModal.emailSyncNotice` (Tarea 7).
- Produces: nada — es la tarea de integración final de UI.

- [ ] **Step 1: Agregar el hint de sincronización en `EditOrganizationModal.vue`**

En `frontend/src/components/dashboard/organizations/EditOrganizationModal.vue`, encontrar:

```vue
      <FormField
        id="edit-org-contact-email"
        v-model="contactEmail"
        type="email"
        :label="t('organizations.form.contactEmail')"
        :error="contactEmailError"
      />
    </div>
```

Reemplazar por:

```vue
      <FormField
        id="edit-org-contact-email"
        v-model="contactEmail"
        type="email"
        :label="t('organizations.form.contactEmail')"
        :error="contactEmailError"
      />
      <p class="-mt-2 text-xs text-navy-700/60">{{ t('organizations.editModal.emailSyncNotice') }}</p>
    </div>
```

- [ ] **Step 2: Importar los 2 modales nuevos en `ClientsListView.vue`**

Encontrar:

```ts
import CreateOrganizationModal from '@/components/dashboard/organizations/CreateOrganizationModal.vue'
import EditOrganizationModal from '@/components/dashboard/organizations/EditOrganizationModal.vue'
import CategoryConfigModal from '@/components/dashboard/organizations/CategoryConfigModal.vue'
```

Reemplazar por:

```ts
import CreateOrganizationModal from '@/components/dashboard/organizations/CreateOrganizationModal.vue'
import EditOrganizationModal from '@/components/dashboard/organizations/EditOrganizationModal.vue'
import CategoryConfigModal from '@/components/dashboard/organizations/CategoryConfigModal.vue'
import ServicesConfigModal from '@/components/dashboard/organizations/ServicesConfigModal.vue'
import BrandingConfigModal from '@/components/dashboard/organizations/BrandingConfigModal.vue'
```

- [ ] **Step 3: Agregar el estado de los modales**

Encontrar:

```ts
const categoryConfigOrganization = ref<OrganizationListItem | null>(null)
const suspendTarget = ref<OrganizationListItem | null>(null)
```

Reemplazar por:

```ts
const categoryConfigOrganization = ref<OrganizationListItem | null>(null)
const servicesConfigOrganization = ref<OrganizationListItem | null>(null)
const brandingConfigOrganization = ref<OrganizationListItem | null>(null)
const suspendTarget = ref<OrganizationListItem | null>(null)
```

- [ ] **Step 4: Agregar los handlers de "guardado"**

Encontrar (justo después de `handleEditSubmit`, antes de `handleSuspend`):

```ts
async function handleSuspend(reason: string) {
```

Insertar antes de esa línea:

```ts
function handleServicesSaved() {
  servicesConfigOrganization.value = null
  load()
}

function handleBrandingSaved() {
  brandingConfigOrganization.value = null
  load()
}

async function handleSuspend(reason: string) {
```

- [ ] **Step 5: Agregar los 2 botones nuevos en la tabla**

Encontrar:

```vue
                    <button
                      v-if="org.services.some((s) => s.slug === 'higiene-industrial')"
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="categoryConfigOrganization = org"
                    >
                      {{ t('clients.categoryConfig.openButton') }}
                    </button>
                    <button
                      v-if="tab === 'active' && org.responsable"
```

Reemplazar por:

```vue
                    <button
                      v-if="org.services.some((s) => s.slug === 'higiene-industrial')"
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="categoryConfigOrganization = org"
                    >
                      {{ t('clients.categoryConfig.openButton') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="servicesConfigOrganization = org"
                    >
                      {{ t('clients.servicesConfig.openButton') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="brandingConfigOrganization = org"
                    >
                      {{ t('clients.brandingConfig.openButton') }}
                    </button>
                    <button
                      v-if="tab === 'active' && org.responsable"
```

- [ ] **Step 6: Instanciar los 2 modales**

Encontrar:

```vue
    <CategoryConfigModal
      v-if="categoryConfigOrganization"
      :organization-id="categoryConfigOrganization.id"
      :organization-nombre="categoryConfigOrganization.nombre"
      @cancel="categoryConfigOrganization = null"
    />
  </div>
</template>
```

Reemplazar por:

```vue
    <CategoryConfigModal
      v-if="categoryConfigOrganization"
      :organization-id="categoryConfigOrganization.id"
      :organization-nombre="categoryConfigOrganization.nombre"
      @cancel="categoryConfigOrganization = null"
    />
    <ServicesConfigModal
      v-if="servicesConfigOrganization"
      :organization-id="servicesConfigOrganization.id"
      :organization-nombre="servicesConfigOrganization.nombre"
      :current-service-slugs="servicesConfigOrganization.services.filter((s) => s.isActive).map((s) => s.slug)"
      @saved="handleServicesSaved"
      @cancel="servicesConfigOrganization = null"
    />
    <BrandingConfigModal
      v-if="brandingConfigOrganization"
      :organization-id="brandingConfigOrganization.id"
      :organization-nombre="brandingConfigOrganization.nombre"
      @saved="handleBrandingSaved"
      @cancel="brandingConfigOrganization = null"
    />
  </div>
</template>
```

- [ ] **Step 7: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 8: Correr la suite completa de frontend**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones.

- [ ] **Step 9: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/modules/clients/views/ClientsListView.vue frontend/src/components/dashboard/organizations/EditOrganizationModal.vue
git commit -m "feat: botones Servicios/Marca en Clientes, con sus modales cableados"
```

---

### Task 11: Verificación final

**Files:** ninguno (solo verificación).

**Interfaces:** ninguna.

- [ ] **Step 1: Typecheck completo, ambos proyectos**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output.

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 2: Suite completa de tests, ambos proyectos**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx vitest run`
Expected: todos los test files pasan, incluido `organizations.service.test.ts` con 7 tests nuevos.

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones.

- [ ] **Step 3: Verificación manual en el navegador**

Con el backend y frontend dev server corriendo, iniciar sesión como admin (`1000000001` / `SEED_SUPERADMIN_PASSWORD` de `backend/.env`), ir a "Clientes", y sobre una organización de prueba (NO usar una empresa real de producción — esto corre contra la base local):

1. **Botón "Editar"**: cambiar el email de contacto y guardar. Confirmar que la fila de la tabla muestra el nuevo email también en la columna "Responsable" (no solo en el tooltip/hover — el email del responsable mostrado en esa columna debe reflejar el cambio, prueba visual del sync backend de la Tarea 2).
2. **Botón "Servicios"**: abrir el modal, confirmar que el/los servicio(s) ya contratado(s) aparecen marcados, agregar uno nuevo, guardar. Confirmar que la columna "Servicio contratado" de la tabla ahora incluye el nuevo servicio. Volver a abrir "Servicios" y quitar uno (dejando al menos uno marcado), guardar, confirmar que desaparece de la columna. Intentar desmarcar TODOS y guardar — debe mostrar el error `minOneRequired` sin llamar al backend.
3. **Botón "Marca"**: abrir el modal, confirmar que si la empresa ya tiene logo/colores (por ejemplo, una que ya activó su cuenta) se precargan correctamente en el formulario. Cambiar el color primario y guardar. Volver a abrir "Marca" para esa misma empresa y confirmar que el nuevo color quedó guardado (round-trip real contra el backend, no solo el estado local del modal).
4. **Regresión — Categorías**: confirmar que el botón "Categorías" (visible solo si la empresa tiene "higiene-industrial" activo) sigue abriendo su modal y togglea con el mismo comportamiento de antes.
5. **Regresión — Suspender/Reactivar/Reenviar invitación/Eliminar**: hacer clic en al menos uno de estos por pestaña (Activas → Suspender, Suspendidas → Reactivar) y confirmar que siguen funcionando sin cambios.
6. **Regresión — Crear empresa**: crear una empresa nueva de prueba con el formulario completo (nombre, NIT, email, servicios, logo, colores, responsable) y confirmar que el alta sigue funcionando exactamente igual que antes (este flujo no fue tocado por el plan, pero comparte varios archivos backend modificados — vale la pena la confirmación).

- [ ] **Step 4: Reportar resultados**

Resumir aprobado/fallado de cada uno de los 6 puntos del Step 3, además de la confirmación de typecheck/tests de los Steps 1-2. No dar el plan por completo si algún punto falla — corregir y volver a verificar antes.
