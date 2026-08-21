# Edición de empresas con paridad de creación — diseño

## Contexto

Hoy, crear una empresa (`CreateOrganizationForm.vue`) pide 12+ campos: nombre, NIT, email de contacto, checklist de servicios, logo, colores primario/secundario, y 5 datos del responsable (tipo de documento, número de documento, nombre, cargo, teléfono). Editar una empresa (`EditOrganizationModal.vue`) solo permite tocar 3: nombre, NIT, email de contacto.

El admin no tiene forma de:
- Agregar o quitar servicios contratados después de la creación.
- Cambiar el logo o los colores corporativos de una empresa ya creada.
- Cambiar el email del responsable si la empresa pierde acceso a su correo actual.

El número de documento del responsable (credencial de login) y su contraseña quedan explícitamente fuera de alcance: el documento nunca debe poder editarse desde ningún flujo de admin, y la contraseña ya tiene su propio mecanismo de recuperación (`ForgotPasswordView.vue`, basado en el documento — no se ve afectado por nada de este cambio).

## Hallazgo durante la investigación: bug existente

`EditOrganizationModal.vue` ya permite editar `contactEmail` de la organización, y el backend (`organizations.service.ts` → `update()`) lo persiste en `Organization.contactEmail`. Pero ese cambio **nunca se propaga** a `User.email` del responsable — a pesar de que ambos se cargan con el mismo valor al crear la empresa (`organizations.repository.ts`, `createWithResponsible()`). Confirmado con el usuario: de ahora en adelante ambos campos deben mantenerse sincronizados — un solo campo de email en la UI, un solo endpoint que actualiza las dos tablas a la vez.

## Alcance

**Un solo módulo de admin (`ClientsListView.vue` + `organizations` + nuevos endpoints).** Sin cambios de UI para el cliente (el flujo de branding en `/dashboard/organization/branding` sigue existiendo tal cual, sin tocar). Sin cambios al flujo de creación (`CreateOrganizationForm.vue`), salvo la reutilización de `BrandingFields.vue` en el nuevo modal de admin.

## Arquitectura: modales separados, no un formulario único

`ClientsListView.vue` ya sigue el patrón "un botón, un modal, una responsabilidad" — Editar / Categorías / Suspender ya son independientes. Se extiende ese mismo patrón en vez de convertir "Editar" en un formulario de 12+ campos:

| Botón | Estado | Qué edita |
|---|---|---|
| Editar | Existente, ampliado | nombre, NIT, email (ahora sincronizado con el responsable) |
| Servicios | **Nuevo** | agregar/quitar servicios contratados |
| Marca | **Nuevo** | logo + colores primario/secundario |
| Categorías | Existente | sin cambios |
| Suspender / Reactivar / Reenviar invitación / Eliminar | Existentes | sin cambios |

Ventaja de este enfoque sobre un modal único: cada pieza se puede implementar, probar y revisar de forma aislada, con menor riesgo sobre el modal de edición que ya está en producción.

## 1. Editar (ampliado): email sincronizado

`EditOrganizationModal.vue` conserva sus 3 campos (nombre, NIT, email), pero el submit ahora llama a **dos** operaciones en una transacción del lado del backend:

- Actualiza `Organization.contactEmail` (como hoy).
- Actualiza `User.email` del responsable de esa organización (nuevo).

**Backend:** el `update()` de `organizations.service.ts` deja de tocar solo `Organization` — dentro de la misma transacción Prisma, si `contactEmail` cambia, también actualiza el `User.email` del responsable (localizado vía `UserOrganization` con rol `cliente`, mismo patrón que ya usa `listFull()` para encontrar "el responsable"). Sin endpoint nuevo: se extiende el `PATCH /api/admin/organizations/:organizationId` existente.

**Validación:** el email sigue validándose con el mismo `z.string().email()` ya usado en `createOrganizationSchema`. Si el nuevo email ya está en uso por otro `User` (poco probable pero posible), el backend debe rechazar con un error claro — mismo criterio que ya existe para NIT duplicado (`NIT_TAKEN`) y documento duplicado (`DOCUMENT_TAKEN`) en creación; se agrega un código de error nuevo, `EMAIL_TAKEN`, al mismo enum de errores de `OrganizationsError`.

**Explícitamente fuera de este cambio:** `documentNumber` y `documentType` del responsable no aparecen en ningún campo ni endpoint de este flujo.

## 2. Servicios: agregar/quitar sin destruir histórico

Nuevo modal "Servicios" (mismo patrón visual que "Categorías": checklist con todos los servicios del catálogo, toggle inmediato por fila, sin botón "Guardar" aparte).

**Modelo de datos:** `OrganizationService.isActive` ya existe, pero hoy solo se escribe una vez (`true`) al crear la empresa — nunca se expone para desactivar. Se reutiliza tal cual:

- **Agregar un servicio:** si la fila `OrganizationService` no existe, se crea con `isActive: true`. Si ya existía (se había quitado antes), se reactiva (`isActive: true`) en vez de crear una fila duplicada — respeta el `@@unique([organizationId, serviceId])` ya existente en el schema. Si el servicio agregado es `higiene-industrial` y la organización no tiene filas de `OrganizationCategoryConfig` todavía, se crean las 5 con `habilitada: true` (mismo default que al crear la empresa) — si ya existían de un contrato anterior de higiene-industrial, se dejan intactas (no se resetean).
- **Quitar un servicio:** se pone `isActive: false`. **Nunca se borra la fila**, ni las lecturas, cargas históricas o configuraciones de categoría asociadas — mismo criterio de borrado suave que ya usa el resto de la plataforma (organizaciones, notificaciones). El servicio deja de aparecer en el sidebar del cliente porque el filtrado por `isActive` en `services` ya existe en el frontend (usado hoy para decidir qué dashboards mostrar).

**Backend — nuevo endpoint:** `PUT /api/admin/organizations/:organizationId/services`, body `{ serviceSlugs: string[] }` representando el conjunto completo deseado de servicios activos (mismo shape que ya usa `createOrganizationSchema`, para reutilizar la validación "todos los slugs deben existir"). El servicio calcula la diferencia contra el estado actual y aplica altas/reactivaciones/desactivaciones dentro de una sola transacción. Gated por `platform.organizations.manage` (mismo permiso que el resto del módulo).

**Explícitamente fuera de este cambio:** no se permite dejar una organización con cero servicios activos (mínimo 1, mismo mínimo que ya exige la creación) — si el admin intenta desmarcar el último, el backend rechaza con el mismo tipo de validación que "mínimo 1 servicio" en creación.

## 3. Marca: logo + colores, acceso nuevo de admin

Nuevo modal "Marca" que reutiliza **tal cual** el componente `BrandingFields.vue` ya existente (mismos 3 `v-model`: `logoBase64`, `primaryColor`, `secondaryColor` — mismas validaciones de tipo de archivo SVG/PNG/JPEG y tamaño máximo 500KB que ya tiene ese componente). No se modifica `BrandingFields.vue`.

**Backend — nuevos endpoints**, separados por completo del flujo del cliente (`/api/dashboard/organization/branding`, que sigue existiendo sin tocar):

- `GET /api/admin/organizations/:organizationId/branding` — precarga el formulario (logo/colores actuales, o vacío si la empresa aún no los definió).
- `PUT /api/admin/organizations/:organizationId/branding` — guarda, siempre sobrescribe (a diferencia del flujo del cliente, que distingue "primera vez" de "edición", acá el admin no tiene ese matiz: siempre está editando).

Ambos gated por `platform.organizations.manage`. Reutilizan el mismo schema Zod de validación (`saveBrandingSchema`) que ya usa el módulo `organizationBranding` — sin duplicar reglas de validación de logo/color.

**Nota de UX:** si el admin cambia el logo/colores de una empresa cuyo responsable ya inició sesión, el cambio se refleja para el cliente la próxima vez que cargue el dashboard (mismo mecanismo de invalidación de caché — `logoVersion` en el store `auth` — ya implementado esta sesión; no requiere cambios adicionales, el cliente simplemente vuelve a pedir sus propios datos de branding en su próximo `fetchMe()`).

## Testing

- Backend: tests para el `update()` extendido (email sincroniza ambas tablas, rechazo por `EMAIL_TAKEN`), para el nuevo endpoint de servicios (agregar reactiva en vez de duplicar, quitar no borra filas ni afecta lecturas existentes, rechazo si queda en cero servicios, categorías se crean solo si no existían), y para los nuevos endpoints de branding admin (guardan y devuelven el estado esperado, gated por permiso).
- Frontend: no se plantean tests nuevos de componente más allá de los que ya cubre el proyecto por convención (los modales de Servicios/Marca son composición de piezas ya probadas — `BrandingFields.vue` no cambia).
- Regresión manual: confirmar que el flujo de creación de empresa sigue funcionando sin cambios, que el flujo del cliente para editar su propio branding (`/dashboard/organization/branding`) sigue funcionando sin cambios, y que quitar un servicio realmente oculta ese dashboard del sidebar del cliente sin borrar sus datos (reactivarlo debe traer de vuelta el histórico intacto).

## Fuera de alcance (explícito)

- Edición de `documentNumber`/`documentType` del responsable — nunca, en ningún flujo de admin.
- Cambio de contraseña forzado por admin — ya existe recuperación propia vía documento (`ForgotPasswordView.vue`), no se toca.
- Cambiar el responsable de una organización (transferir a otra persona) — no pedido, no se diseña acá.
- Permitir más de un servicio "principal"/responsable por organización — sigue siendo 1:1 como hoy.
- Cambios al modal de Categorías — sigue exactamente igual.
