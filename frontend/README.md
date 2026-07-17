# RoMa — Frontend

Landing page pública de RoMa (Fase 2). Vue 3 + TypeScript + Vite + Tailwind CSS v4.

## Levantar el proyecto

```bash
npm install
cp .env.example .env   # ajusta los valores según tu entorno
npm run dev
```

Otros comandos:

```bash
npm run build      # type-check (vue-tsc) + build de producción a dist/, con gzip y brotli
npm run preview    # sirve el build de dist/ localmente
```

## Variables de entorno

Definidas en `.env.example`, se copian a `.env` (ignorado por git):

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | Base URL de la instancia de Axios (`src/services/api.ts`). |
| `VITE_CONTACT_API_ENDPOINT` | Endpoint al que se envía el formulario de contacto (`src/services/contact.service.ts`). El backend debe implementarlo; si no está definido, el envío falla explícitamente en vez de fallar en silencio. |
| `VITE_SITE_URL` | Dominio público, usado en meta tags SEO/Open Graph y `sitemap.xml`. |
| `VITE_WHATSAPP_NUMBER` | Número de WhatsApp (formato `573000000000`) para el botón flotante y el footer. |
| `VITE_FACEBOOK_URL` / `VITE_INSTAGRAM_URL` | Enlaces directos de redes sociales en el footer. |

Todos son placeholders de ejemplo — reemplázalos antes de producción.

## Stack y decisiones técnicas

- **Vue 3 `<script setup>` + TypeScript + Vite.**
- **Tailwind CSS v4**: colores de marca (`navy-900`, `navy-700`, `navy-500`, `sky-400`, `sky-200`, `sky-100`, `cream`, `line`, `line-strong`, `whatsapp`) y tipografías (`font-serif` = Playfair Display, `font-sans` = Inter) declarados en `src/style.css` vía `@theme`. Lo que no se resuelve limpio con utilidades (animación de canvas, `writing-mode` del acordeón, gradientes puntuales) vive en bloques `<style>`/clases arbitrarias dentro del propio componente.
- **Vue Router**: ruta única con prefijo de idioma (`/:locale(es|en)/`), `/` redirige siempre a `/es/`, lista para agregar rutas de dashboard sin reestructurar.
- **Pinia**: instalado y registrado en `main.ts`, sin stores todavía — se agregan cuando llegue la fase de autenticación.
- **vue-i18n** (Composition API) para español/inglés — ver sección [Internacionalización](#internacionalización-i18n) más abajo.
- **@unhead/vue** gestiona `<head>` de forma reactiva por idioma/ruta (title, meta, hreflang, JSON-LD) — ver la misma sección.
- **VeeValidate + Zod** para el formulario de contacto (`src/composables/useContactForm.ts`, schema en `src/types/contact.ts`, con mensajes de validación traducidos).
- **Axios** con instancia central (`src/services/api.ts`) y un interceptor de request que hoy no hace nada (no hay token todavía) pero ya está estructurado para inyectar `Authorization` cuando exista auth real.
- **vite-plugin-compression2** genera `.gz` y `.br` de cada asset en el build. Se usó la v2 del plugin (no `vite-plugin-compression`) porque la v1 tiene un bug conocido: al registrar dos instancias (una por algoritmo) comparten una caché interna de `mtime` que hace que la segunda pase no comprima ningún archivo.
- **`vercel.json`**: rewrite catch-all a `/index.html` — necesario para que un enlace directo a `/en/` (deep link, compartido, o crawler siguiendo `hreflang`) no dé 404 en producción, ya que el ruteo de idioma es 100% client-side.

## Internacionalización (i18n)

- Contenido en `src/i18n/locales/{es,en}.json`, namespaced por sección (`hero`, `servicios`, `metodologia`, etc.). Solo el idioma activo se carga al inicio; el otro se carga bajo demanda (`import.meta.glob` + import dinámico en `src/i18n/index.ts`) al cambiar de idioma.
- Rutas: `/es/` y `/en/` sobre la misma `LandingView`; un guard en `router/index.ts` activa el idioma correcto antes de renderizar. El selector de idioma en `SiteHeader.vue` navega a la misma ruta con el otro prefijo, preservando el hash actual.
- Encabezados con una palabra/frase resaltada (ej. "La diferencia... está en *la ciencia*") usan `<i18n-t>` con un slot con nombre, no HTML embebido en el JSON — así el estilo vive en el componente, no en la traducción.
- **Gotcha real que ya nos mordió**: vue-i18n interpreta `@` como inicio de un "mensaje enlazado" (`@:otra.key`). Cualquier `@` literal en un string de traducción (como un placeholder de correo `tu@empresa.com`) rompe la compilación del mensaje — y como el error se traga silenciosamente en producción, el síntoma es que *toda la sección que usa ese mensaje deja de reaccionar al cambio de idioma*, no un error visible. Se soluciona escapando como `tu\\@empresa.com` en el JSON (backslash + arroba). Si agregas contenido nuevo con `@`, escápalo así.
- Al agregar un tercer idioma: crear `src/i18n/locales/<code>.json` con las mismas claves que `es.json`, agregarlo a `SUPPORTED_LOCALES` en `src/i18n/index.ts`, y al patrón de ruta `(es|en)` en `router/index.ts`.

## Convenciones de carpetas (para cuando se agregue el dashboard)

```
src/
├── components/
│   ├── ui/          # átomos reutilizables en todo el proyecto (botones, acordeones, inputs)
│   └── shared/       # chrome de layout compartido (header, footer, redes, fondo animado)
├── composables/       # lógica reutilizable con estado (Composition API)
├── i18n/              # instancia vue-i18n + locales/{es,en}.json
├── layouts/
│   ├── PublicLayout.vue      # usado por la landing y cualquier página pública futura
│   └── DashboardLayout.vue   # placeholder — se implementa en la fase de dashboard
├── modules/
│   ├── landing/       # todo lo específico de la landing pública (Fase 2)
│   └── dashboard/     # placeholder vacío — la fase de dashboard vive aquí
├── router/            # una entrada de ruta por módulo; el dashboard agrega las suyas aquí
├── services/          # instancia de Axios + un archivo por dominio (contact.service.ts, etc.)
├── stores/            # stores de Pinia — vacío hasta que exista estado de auth/tenant real
└── types/             # tipos e inferencias de schemas Zod
```

Regla para la fase de dashboard: cada área nueva (auth, métricas de cliente, métricas de admin)
va en `modules/dashboard/<area>/{components,views}`, con sus propias rutas registradas en
`router/index.ts` bajo `DashboardLayout`. No debería requerir tocar `modules/landing` ni
`layouts/PublicLayout.vue`.
