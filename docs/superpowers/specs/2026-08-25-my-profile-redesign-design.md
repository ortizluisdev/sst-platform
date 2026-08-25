# Rediseño de "Mi Perfil" — diseño

## Contexto

`MyProfilePanel.vue` (`frontend/src/modules/profile/components/MyProfilePanel.vue`) es el **único** componente que renderiza "Mi Perfil" tanto para Admin (ruta `/dashboard/admin/mi-perfil`) como para Cliente (clave reservada `'perfil'` del sidebar, dentro de `ClientDashboardView.vue`). Cualquier cambio acá se ve automáticamente en ambos lados, sin duplicar código.

Hoy la pantalla se siente "muy simple": tres bloques apilados en una sola columna (foto+datos básicos con fondo blanco plano, formulario de datos personales, firma para reportes), sin jerarquía visual fuerte ni contexto sobre quién es el usuario (rol, empresa).

## Alcance

**Solo visual/contenido — sin backend nuevo, sin campos de formulario nuevos, sin lógica de negocio nueva.** Se mantienen exactamente los mismos 3 bloques y el mismo comportamiento (guardar datos, subir foto, subir firma, cambiar contraseña vía modal). El único dato "nuevo" en pantalla (rol, empresa) ya existe en el cliente vía `useAuthStore()` — no requiere ninguna llamada a la API adicional.

**Fuera de alcance:** pestañas (se descartó explícitamente — se queda en una sola columna), estado de cuenta ("Activa" — descartado por redundante para el propio usuario logueado), cualquier campo de formulario nuevo, cambios al modal de cambiar contraseña, cambios a `getMyProfile()`/`updateMyProfile()`/`myProfile.service.ts`.

## 1. Cabecera enriquecida

Mismo layout de hoy (foto a la izquierda, nombre+email al centro, botón "Cambiar contraseña" a la derecha — responsive: columna en móvil, fila en desktop), con dos cambios:

- **Fondo con acento de marca**: en vez de `bg-white` plano, usa un fondo con leve degradado hacia `var(--org-primary, #0b1a33)` (mismo token CSS que ya usa `SectionTitleBanner.vue` y el resto del dashboard para reflejar el color de marca del cliente — para Admin, que no tiene branding propio, cae al valor de respaldo `#0b1a33` como ya hace el resto de la app). El texto (nombre/email/badges) pasa a blanco/claro sobre ese fondo, igual criterio de contraste que ya resuelve `useOrgPrimaryTextClass()` (composable existente, usado en `SectionTitleBanner.vue`).
- **Fila de badges** debajo del nombre/email, antes del hint de la foto:
  - **Badge de rol**: texto de `t(authStore.roleLabelKey)` (getter ya existente, sin cambios — "Cliente" o "Super-Admin"), estilo píldora (`rounded-full`, borde sutil, fondo semi-transparente sobre el degradado).
  - **Badge de empresa** (solo si `authStore.organizationNombre` no es null, es decir solo para rol cliente): `{{ organizationNombre }} · NIT {{ organizationNit }}`, mismo estilo píldora que el badge de rol, ícono `Building2` de lucide-vue-next a la izquierda del texto.
  - Ambos badges en una fila con `flex flex-wrap gap-2` — en móvil, si no caben en una línea, pasan a la siguiente sin recortarse (mismo criterio que ya documenta el comentario de `SectionTitleBanner.vue` sobre truncamiento en pantallas angostas).

El botón "Cambiar contraseña" se adapta a fondo oscuro (borde claro, texto claro, hover con fondo semi-transparente en vez del `hover:bg-cream` actual, que quedaría invisible sobre fondo oscuro).

## 2. Datos personales — mismo formulario, jerarquía visual

Sin cambios de campos ni de validación. Cambios puramente visuales:

- El `<h2>` de la sección ("Datos personales") se acompaña de un ícono `IdCard` (lucide-vue-next) a su izquierda, mismo tamaño/color que el resto de íconos de sección del dashboard (`h-5 w-5 text-navy-700/70`, ver convención en `ComplianceRing.vue`/tarjetas de servicio).
- Los labels inline de "Número de documento" y "Email" (los dos únicos campos deshabilitados, que **no** usan `FormField.vue` — tienen su propio `<label>` directo en `MyProfilePanel.vue`) pasan de `text-navy-700` a `text-navy-900` con `font-semibold` más marcado, para que destaquen más sobre el fondo `bg-cream` de esos inputs deshabilitados. **`FormField.vue` no se toca** — lo usan Nombre/Cargo/Teléfono acá, pero también Login, Recuperar contraseña, modales de organización y otras pantallas; cambiar su estilo de label tendría un alcance mucho mayor al de esta spec. Sus tres campos (Nombre/Cargo/Teléfono) se quedan con el estilo de label que ya trae `FormField.vue` hoy, sin cambios.
- La tarjeta contenedora gana una sombra sutil (`shadow-sm`) además del borde existente, para diferenciarse mejor del fondo de la página.

## 3. Firma para reportes — mismo bloque, mismo lenguaje visual

Sin cambios de comportamiento (subir/reemplazar firma, mismas validaciones de tipo/tamaño). Mismo tratamiento visual que la sección de Datos personales: ícono `PenTool` (lucide-vue-next) junto al `<h2>`, tarjeta con `shadow-sm`.

## Testing

- No se requieren tests nuevos: no hay lógica nueva, solo clases CSS y lectura de dos campos ya existentes del store (`roleLabelKey`, `organizationNombre`/`organizationNit`), que ya tienen su propia cobertura donde se originan (`stores/auth.ts`).
- Regresión manual: confirmar que Admin ve el badge de rol "Super-Admin" y NUNCA el badge de empresa (siempre null para admin); confirmar que un cliente ve ambos badges con el nombre/NIT correctos de su organización; confirmar que guardar el formulario, subir foto y subir firma siguen funcionando exactamente igual; confirmar contraste de texto legible sobre el fondo oscuro de la cabecera tanto con branding de cliente configurado como sin configurar (fallback `#0b1a33`).
