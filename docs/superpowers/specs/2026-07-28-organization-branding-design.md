# Branding por organización — reemplazo de Cargo/Teléfono en la activación

**Fecha:** 2026-07-28
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y motivación

Hoy, cuando un cliente activa su cuenta por primera vez, el flujo "Complete your profile" (`UpdateProfileView.vue`, gateado por `User.mustUpdateProfile`) le pide **Cargo** y **Teléfono**. Esto no tiene sentido de negocio en ese punto:

- El **cargo** ya lo captura el admin al crear la cuenta (`responsable.cargo` en `POST /api/organizations`), así que pedirlo de nuevo es redundante.
- El **teléfono**, en cambio, **no se captura en ningún punto actual** — hoy solo se llena en este mismo formulario de activación. Al quitarlo de acá sin agregarlo en otro lado, el dato dejaría de existir en el sistema.

Además, hoy la experiencia del cliente al entrar se ve genérica ("pelada") — usa siempre el navy/sky por defecto de RoMa, sin ninguna identidad visual propia de su empresa.

## Alcance

1. El admin captura **cargo y teléfono** del responsable al crear la cuenta (mismo punto, mismo patrón) — quedan fijos, el cliente no los edita nunca desde su rol.
2. El formulario de activación reemplaza Cargo/Teléfono por **logo + 2 colores corporativos** (primario/secundario), con preview en vivo antes de guardar. Sigue siendo obligatorio/bloqueante, igual que hoy.
3. Una vez guardado, el logo y los colores se aplican dinámicamente pero **acotados** a: fondo del navbar, sidebar del cliente, y botones de acento — nunca a todo el sistema de color de la plataforma, y nunca a la sesión de otro cliente ni a la del admin.
4. Sin logo/colores guardados (o si el usuario es admin), el navbar se ve con el estilo RoMa por defecto — nunca roto o vacío. Esto se logra vía fallback nativo de CSS (`var(--x, <default>)`), no lógica condicional adicional.
5. El branding se guarda en `Organization`, no en `User` — todos los usuarios de la misma empresa comparten la misma personalización.
6. Tras la activación, el **cliente ya no puede editar** su logo/colores. Si hace falta cambiarlos, lo hace el **admin** desde el modal existente de "Editar organización" (Clientes).
7. Si una organización ya tiene branding guardado (ej. un segundo usuario de la misma empresa activa su cuenta después), ese usuario **nunca ve el formulario de logo/colores** — se activa directamente sin ese paso, ya que su empresa ya lo completó.
8. Al terminar la implementación y verificarla, se limpian todas las cuentas de prueba actuales (4 organizaciones, 4 usuarios cliente) de la BD local, dejando solo los 2 usuarios de plataforma (super-admin, adminsystem), para validar el flujo completo desde cero.

## Fuera de alcance (explícitamente descartado)

- Reemplazar el sistema de color de Tailwind de toda la plataforma (navy-900, sky-100, etc. en badges, textos, bordes de toda la app). Solo se tocan navbar, sidebar del cliente y botones de acento.
- Almacenamiento en la nube (S3/Cloudinary) para el logo — se guarda como base64 en la propia fila de `Organization`, ya que no hay infraestructura de almacenamiento configurada y el filesystem de Render no es persistente entre despliegues.
- Edición de branding por el propio cliente después de la activación inicial.
- Modificar `seed.ts` — la limpieza es solo sobre los datos actuales de la BD local, no sobre el script de seed.

## Modelo de datos

**`Organization`** (Prisma) — 3 campos nuevos, todos opcionales:

```prisma
logoBase64     String? @map("logo_base64") @db.LongText
primaryColor   String? @map("primary_color") @db.VarChar(7)
secondaryColor String? @map("secondary_color") @db.VarChar(7)
```

- `logoBase64` guarda el **data URI completo** (`data:image/png;base64,...` o `data:image/svg+xml;base64,...`), no solo el payload — se sirve directo desde el endpoint de logo (ver Backend) sin reconstruir el prefijo.
- `@db.LongText` (no `@db.Text`, que en MySQL tiene límite de 64KB) — margen cómodo para un logo de hasta 500KB en base64 (~680KB de texto).
- `primaryColor`/`secondaryColor` guardan hex de 7 caracteres (`#rrggbb`), formato que emite nativamente `<input type="color">`.
- **Límite de tamaño del logo: 500KB** (no 2MB) — de sobra para un logo de navbar (36-40px de alto); mantiene la fila de `Organization` liviana y la primera carga (antes de que el navegador cachee la imagen) rápida.

**`User`** — sin cambios de esquema (ya tiene `cargo`/`telefono` nullable desde antes). Cambia el flujo: `telefono` pasa a ser **requerido** en el formulario de creación de organización, junto a `cargo`.

## Backend

### 1. `POST /api/organizations` (existente, ampliado)

`createOrganizationSchema`'s `responsable` gana `telefono` requerido:

```typescript
responsable: z.object({
  documentType: z.enum(['CC', 'NIT']),
  documentNumber: documentNumberSchema,
  nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del responsable')),
  email: z.string().email('Ingresa un correo válido'),
  cargo: noNewlines(z.string().min(2, 'Ingresa el cargo del responsable')),
  telefono: noNewlines(z.string().min(7, 'Ingresa un teléfono válido')),
}),
```

Se guarda en la misma transacción que ya crea el usuario responsable (`organizations.repository.ts`'s `createWithResponsible`), agregando `telefono: input.responsable.telefono` al `data` del `create` de `User`.

### 2. Nuevo `PATCH /api/dashboard/organization/branding`

- Guard: `requireAuth` únicamente — cualquier usuario autenticado con `organizationId` en su sesión (no requiere permiso especial, es autoservicio del propio cliente sobre su propia organización).
- Body: `{ logoBase64: string, primaryColor: string, secondaryColor: string }` — los 3 campos requeridos (el formulario de activación sigue siendo bloqueante, no hay guardado parcial).
- Validación (Zod):
  - `primaryColor`/`secondaryColor`: `/^#[0-9a-f]{6}$/i`.
  - `logoBase64`: debe empezar con `data:image/png;base64,` o `data:image/svg+xml;base64,` (whitelist estricta de 2 MIME types, nada más).
- Validación adicional en el servicio (no expresable en Zod): decodifica el payload base64 y rechaza (422) si el tamaño decodificado supera **500KB** — nunca confiar solo en la validación del cliente.
- La organización a actualizar es SIEMPRE `auth.organizationId` de la sesión (nunca un id que venga del body) — mismo patrón anti-IDOR que el resto del proyecto.
- **Guardado atómico y condicional** (protege contra el caso borde de dos usuarios de una empresa nueva activando casi al mismo tiempo): el `UPDATE` solo aplica si la organización todavía no tiene branding, vía una condición en el propio `WHERE` (ej. `prisma.organization.updateMany({ where: { id: organizationId, primaryColor: null }, data: {...} })`), nunca "leer y luego escribir" por separado — así no hay ventana de carrera entre ambos pasos.
  - Si el `update` afecta 1 fila (la organización no tenía branding): se guardan los 3 campos con normalidad.
  - Si el `update` afecta 0 filas (otro usuario de la misma organización ya lo guardó primero): **no se sobreescribe nada**, la respuesta indica `{ applied: false }` en vez de un error — el frontend lo trata como éxito normal (la empresa ya tiene su branding, que es justo lo que este usuario quería).
- En ambos casos (`applied: true` o `false`), el endpoint limpia `User.mustUpdateProfile = false` para el usuario autenticado — su empresa ya cumplió el requisito, sea quien sea quien lo haya guardado.

### 3. `PATCH /api/admin/organizations/:id` (existente, ampliado)

`updateOrganizationSchema` gana los 3 campos de branding, todos opcionales (seguimos el patrón `.refine` ya existente de "al menos un campo debe venir"):

```typescript
logoBase64: z.string().regex(/^data:image\/(png|svg\+xml);base64,/).optional(),
primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
```

Misma validación de tamaño decodificado (≤500KB) en el servicio cuando `logoBase64` viene presente. A diferencia del endpoint del cliente, este `UPDATE` **siempre sobreescribe** sin condición — el admin tiene permiso explícito para cambiar un branding ya existente. Reutiliza el `AuditAction.ORGANIZATION_UPDATED` ya existente.

### 4. `GET /api/auth/me` (existente, ampliado)

Cuando el usuario tiene `organizationId`, la respuesta incluye **solo los colores** (unos pocos bytes, sin costo real de red):

```typescript
branding: { primaryColor: string; secondaryColor: string } | null
```

`null` si la organización no ha guardado branding todavía, o si el usuario no pertenece a ninguna organización (caso admin). **El logo NO viaja en esta respuesta** — ver el endpoint dedicado abajo, pensado para no repetir hasta 500KB en cada carga de sesión.

### 5. Nuevo `GET /api/dashboard/organization/logo`

- Guard: `requireAuth` — mismo patrón que el resto de la API (el navegador manda la cookie de sesión automáticamente al cargar la imagen vía `<img src>`, sin JS adicional).
- Si la organización del usuario autenticado tiene `logoBase64`: decodifica el data URI y responde con el binario de la imagen, `Content-Type` correcto (`image/png` o `image/svg+xml`) y headers de caché (`Cache-Control: private, max-age=86400`, `ETag` derivado del contenido) — así el navegador cachea la imagen y no vuelve a pedirla en cargas siguientes de la misma sesión, más allá de la revalidación barata por ETag.
- Si la organización no tiene logo guardado: `404`. El frontend lo interpreta como "usa el logo de RoMa por defecto" (ver Frontend).

### 6. Activación (`activation.repository.ts`, existente, ajustado)

Hoy, al pasar una cuenta a `ACTIVE`, siempre se fija `mustUpdateProfile: true`. Se ajusta para consultar primero si la organización del usuario **ya tiene branding guardado** (`primaryColor` no nulo):

- Si la organización YA tiene branding: `mustUpdateProfile: false` desde el inicio — este usuario nunca ve el formulario de logo/colores, porque su empresa ya lo completó.
- Si no lo tiene: `mustUpdateProfile: true`, igual que hoy — este usuario sí ve el formulario.

## Frontend

### Formulario de activación (`UpdateProfileView.vue` → contenido reemplazado)

Reemplaza los campos Cargo/Teléfono por un componente compartido **`BrandingFields.vue`**:

- **Logo**: input de archivo, `accept="image/png,image/svg+xml"`. Validación client-side (tipo + tamaño ≤500KB) antes de leer el archivo. Conversión a base64 vía `FileReader.readAsDataURL()` (solo para el envío al backend — ver más abajo, esta base64 nunca se vuelve a descargar completa después). Preview inmediato de la imagen cargada (evita sorpresas antes de guardar).
- **Color primario** / **Color secundario**: dos `<input type="color">` — color picker nativo del navegador, sin librería externa ni lista fija de opciones.
- **Preview en vivo**: una franja de ejemplo (mini-navbar) dentro del propio formulario, con las mismas variables CSS que usará el navbar real (ver siguiente sección), actualizada en cada cambio de color antes de guardar.

Al enviar, llama al nuevo `PATCH /api/dashboard/organization/branding`; en éxito (`applied: true` o `false`, ambos se tratan igual — ver Backend), limpia `mustUpdateProfile` en el store y continúa al dashboard.

**Seguridad de SVG:** el logo se renderiza siempre vía `<img :src="...">`, nunca `v-html` ni `<object>`/`<iframe>`. Los navegadores no ejecutan `<script>` embebido en un SVG cargado como `<img>` — es la forma segura de mostrarlo sin sanitizar el XML manualmente.

### Aplicación dinámica del branding

- `stores/auth.ts` gana un campo `branding: { primaryColor, secondaryColor } | null` en el state, poblado desde `GET /api/auth/me` (sin el logo — ver debajo).
- Nuevo getter `brandingCssVars`: devuelve `{ '--org-primary': ..., '--org-secondary': ... }` **solo si** el usuario tiene organización Y `branding` no es `null` — en cualquier otro caso (admin, o cliente sin branding aún) devuelve un objeto vacío `{}`.
- `DashboardLayout.vue` (compartido por cliente y admin) fija `:style="auth.brandingCssVars"` en su `<div>` raíz.
- El logo del header: cuando el usuario tiene organización, el `<img>` apunta directo a `GET /api/dashboard/organization/logo` (el navegador maneja la petición, la caché HTTP y las cookies de sesión sin código adicional). Un manejador `@error` cambia la fuente al logo de RoMa de siempre si la respuesta es 404 (organización sin logo guardado) — sin necesitar ningún flag booleano extra desde el backend.
- Clases Tailwind que pasan a usar valor arbitrario con fallback nativo:
  - Fondo del header en `DashboardLayout.vue`: `bg-white` → `bg-[var(--org-primary,#ffffff)]` (ajustando el color de texto/iconos del header a un contraste seguro cuando hay color de marca — ver detalle de implementación en el plan).
  - Fondo/acento del sidebar del cliente (`DashboardSidebar.vue`): color de fondo o borde activo → referencia a `--org-primary`/`--org-secondary` con el mismo patrón de fallback.
  - Botón(es) de acción primaria visibles al cliente (ej. "Guardar" en el propio formulario de branding, "Subir" si aplica): `bg-navy-900` → `bg-[var(--org-primary,#0f2a4a)]`.
- Esto es 100% Tailwind: las clases con valor arbitrario (`bg-[var(--org-primary,#hex)]`) son utilidades Tailwind normales, compiladas igual que cualquier otra. Lo único que no es una clase Tailwind son las 2 declaraciones de variable CSS fijadas inline en un único elemento contenedor (`DashboardLayout`'s root) — el resto del layout, espaciado y tipografía sigue siendo Tailwind sin cambios.
- Como el getter `branding` del store solo se puebla para el rol cliente, `AdminShell.vue` (que también renderiza `DashboardLayout`) nunca ve estas variables fijadas, sin importar qué organización esté administrando en ese momento.

### Edición posterior por el admin (`EditOrganizationModal.vue`)

Se amplía el modal existente (hoy: nombre/NIT/email de contacto) agregando el mismo componente **`BrandingFields.vue`** reutilizado del formulario de activación — evita duplicar la lógica de lectura/validación de archivo y el preview en vivo en dos lugares. Envía al `PATCH /api/admin/organizations/:id` ya ampliado.

## Limpieza final de cuentas de prueba

Paso final, ejecutado **solo tras confirmación explícita del usuario** justo antes (acción destructiva sobre la base de datos local):

- `DELETE` en orden seguro por FK: `variable_readings` → `variable_uploads` → `work_points` → `organization_services` → `notifications`/`audit_logs` de esas organizaciones → `user_organizations` → `users` (los usuarios cliente) → `organizations` (las 4 filas actuales).
- Sobreviven intactos: los usuarios de plataforma `1000000001` (super-admin) y `1000000002` (adminsystem).
- `seed.ts` no se modifica — puede seguir generando Organizacion 1/2 en el futuro si alguien vuelve a correr `npm run seed`; esta limpieza es solo sobre el estado actual de la BD.

## Verificación

Sin suite de tests automatizada en este proyecto (convención ya establecida) — verificación vía `npm run typecheck` (backend y frontend) + verificación manual en navegador (desktop y mobile):

1. Admin crea una organización nueva, capturando cargo + teléfono del responsable.
2. Cliente activa la cuenta: ve el formulario con logo + 2 color pickers + preview en vivo (no cargo/teléfono).
3. Cliente guarda; navbar y sidebar reflejan los colores/logo elegidos inmediatamente.
4. Otro cliente (organización distinta, sin branding guardado) sigue viendo el estilo RoMa por defecto.
5. Admin (super-admin/adminsystem) nunca ve el branding de ningún cliente en su propia sesión, sin importar qué organización esté gestionando.
6. Admin edita el logo/colores de una organización ya activada desde "Editar organización" — el cambio se refleja la próxima vez que ese cliente cargue el dashboard.
7. Un segundo usuario de la misma organización (ya con branding guardado) activa su cuenta y **nunca ve** el formulario de logo/colores — pasa directo al dashboard con la personalización ya existente.
8. Limpieza final de cuentas de prueba, y validación de todo el flujo desde cero con una cuenta nueva.
