# RoMa — Frontend Fase 2 (Landing Page pública)

**Fecha:** 2026-07-16
**Alcance:** Único — construir `/frontend` (Vue 3 + Vite + TS) para la landing pública de RoMa. No incluye autenticación, dashboard ni métricas; esas fases dejan solo la estructura de carpetas lista.

## 1. Contexto

El diseño ya fue aprobado por el cliente y existe como 5 archivos HTML/CSS/JS vanilla independientes (sin backend, sin build):

| Archivo | Sección | Notas relevantes |
|---|---|---|
| `roma-01-header-hero-FINAL (1).html` | Header + Hero | Logo embebido en base64 (PNG 572×166, extraído a `/tmp/roma-logo.png`), botón flotante de WhatsApp, menú móvil, header que cambia de estilo al hacer scroll |
| `roma-02-propuesta-valor (1).html` | Propuesta de valor (4 pilares) | Tarjetas con letra + SVG animado en hover |
| `roma-03-servicios (1).html` | Servicios (acordeón horizontal, 5 ítems) | Colapsa a stack vertical en móvil |
| `roma-04-metodologia.html` | Metodología (acordeón horizontal, 4 ítems + tabla + panel iframe) | El iframe `MSSV_Network_Explorer.html` **no existe** entre los archivos entregados |
| `roma-05-nosotros-interactivo.html` | Nosotros | Contador animado (`IntersectionObserver`), acordeón de investigación, panel placeholder "Próximamente" ya existente en el propio mockup |

Los 5 archivos comparten: paleta navy/sky vía CSS custom properties, tipografía Playfair Display (serif, headings) + Inter (sans, body), y un mismo script de fondo animado tipo "red neuronal" en `<canvas>` (partículas con repulsión al cursor, conexiones por distancia, pausado si `prefers-reduced-motion`). Solo cambian `nodeCount`, `maxDist`, `repelRadius` y radios/alpha entre secciones — candidato directo a un único componente parametrizable.

Los archivos de referencia se encontraron en `~/Descargas`, no en la raíz del proyecto como indicaba el pedido original; se usaron desde ahí.

## 2. Decisiones de stack (confirmadas con el usuario)

- **Vue 3 + `<script setup>` + TypeScript + Vite.**
- **Tailwind CSS**, con los colores de marca (`navy-900`, `navy-700`, `navy-500`, `sky-400`, `sky-200`, `sky-100`, `cream`, `line`, `line-strong`, `whatsapp`) declarados en `tailwind.config.ts` → `theme.extend.colors`, para que estén disponibles como utilidades (`bg-navy-900`, `text-sky-400`, etc.) en todo el proyecto, incluyendo el futuro dashboard.
  - El CSS de los 5 mockups se traduce a utilidades Tailwind cuando el resultado es limpio (spacing, tipografía, flex/grid, colores, bordes, sombras).
  - Lo que Tailwind no resuelve limpio con utilidades — la simulación del canvas, gradientes puntuales (`profile-photo`, `research-analysis-placeholder`), `writing-mode: vertical-rl` del acordeón, pseudo-elementos `::before/::after` de los "eyebrows", `clamp()` fluido en tipografía grande — queda en un bloque `<style scoped>` (con `@apply` donde tenga sentido) dentro del propio componente, no en un CSS global.
  - Fuentes (Playfair Display + Inter) vía `@font-face`/link de Google Fonts con `preconnect` solo a `fonts.googleapis.com` y `fonts.gstatic.com`, y `font-display: swap`.
- **Vue Router** con una sola ruta `/` cargada perezosamente (`() => import(...)`), preparado para agregar rutas de dashboard después sin reestructurar.
- **Pinia** instalado y registrado en `main.ts`, pero **sin stores todavía** — crear un store de auth/tenant ahora implicaría empezar a construir autenticación, fuera de alcance de esta fase. La carpeta `stores/` queda vacía (`.gitkeep`).
- **VeeValidate + Zod** para el formulario de contacto.
- **Axios** con instancia central (`services/api.ts`) e interceptor de request que hoy es un no-op estructural (lee un token que aún no existe en ningún store y, si es `null`, no agrega el header) — queda listo para inyectar `Authorization` cuando exista auth real.

## 3. Estructura de carpetas

```
frontend/
├── src/
│   ├── assets/
│   │   ├── logo/                    # roma-logo.png + roma-logo.webp (extraídos del base64)
│   │   └── fonts/ (si se auto-hospedan; si no, solo Google Fonts link)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── BaseButton.vue       # variantes btn-primary / btn-ghost del mockup
│   │   │   └── AccordionPanel.vue   # acordeón horizontal reutilizable (Servicios + Metodología)
│   │   └── shared/
│   │       ├── AnimatedNetworkBackground.vue
│   │       ├── SiteHeader.vue
│   │       ├── SiteFooter.vue
│   │       └── SocialLinks.vue      # variant="floating" | "footer"
│   ├── composables/
│   │   ├── useCanvasNetwork.ts      # simulación de partículas extraída del script vanilla
│   │   ├── useScrollReveal.ts       # fade+translateY sutil al entrar en viewport
│   │   └── useContactForm.ts        # wrapper VeeValidate+Zod + estado de envío
│   ├── layouts/
│   │   ├── PublicLayout.vue         # SiteHeader + <router-view> + SiteFooter + SocialLinks flotante
│   │   └── DashboardLayout.vue      # placeholder vacío (Fase futura)
│   ├── modules/
│   │   ├── landing/
│   │   │   ├── components/
│   │   │   │   ├── HeroSection.vue
│   │   │   │   ├── PropuestaValorSection.vue
│   │   │   │   ├── ServiciosSection.vue
│   │   │   │   ├── MetodologiaSection.vue
│   │   │   │   ├── NosotrosSection.vue
│   │   │   │   └── ContactoSection.vue
│   │   │   └── views/
│   │   │       └── LandingView.vue
│   │   └── dashboard/                # carpeta vacía con .gitkeep (Fase futura)
│   ├── router/index.ts
│   ├── services/
│   │   ├── api.ts                    # instancia axios + interceptores
│   │   └── contact.service.ts
│   ├── stores/                       # vacío, .gitkeep
│   ├── types/
│   │   └── contact.ts                # tipo inferido del schema Zod
│   ├── utils/
│   ├── App.vue
│   └── main.ts
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── index.html                        # meta tags SEO/OG van aquí (single route, sin lib de head management)
├── .env.example
├── tailwind.config.ts
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 4. Mapeo componente por componente

- **`SiteHeader.vue`** (shared, no landing): logo (`<picture>` con `roma-logo.webp` + fallback `.png`, `width`/`height` explícitos para evitar CLS), nav con anclas (`#servicios`, `#metodologia`, `#nosotros`, `#roma-plus`), botón CTA "RoMa+" con gradiente, toggle móvil, clase `scrolled` reactiva a `window.scrollY > 20` (listener con cleanup en `onUnmounted`).
- **`HeroSection.vue`**: `AnimatedNetworkBackground` de fondo, texto + `hero-side-card` (link a Fasecolda/CCS), `hero-caption` inferior. Es el LCP de la página — el canvas se monta sin esperar `IntersectionObserver` (siempre visible al cargar) pero el componente en sí se resuelve vía `defineAsyncComponent` con una franja de altura reservada para que el texto (contenido crítico) no espere al canvas.
- **`PropuestaValorSection.vue`**: 4 `value-card` con letra R/O/M/A + SVG de nodos que aparece en hover — contenido literal del mockup (los paths SVG no se generalizan, son 4 dibujos distintos).
- **`ServiciosSection.vue`** / **`MetodologiaSection.vue`**: ambas montan `AccordionPanel` (ver §5) con su propio contenido vía slots. Metodología además incluye: bloque "shift" (matriz estática → red dinámica), 4 `comp-card` (Agentes/Condiciones/Eventos/Consecuencias), tabla de herramientas matemáticas, y el panel "Explora la red MSSV" **reemplazado por un placeholder "Próximamente"** (mismo lenguaje visual que el placeholder de Nosotros — fondo degradado + ícono + texto centrado) en vez del iframe roto.
- **`NosotrosSection.vue`**: stat-strip con contador animado (composable `useScrollReveal`-style basado en `IntersectionObserver`, easing cúbico igual al mockup), bloque de perfil (foto placeholder — no hay foto real todavía, se mantiene el SVG + "Foto próximamente" tal cual), grid de Formación Académica (lista) + Investigación Científica (acordeón simple de apertura única, distinto del `AccordionPanel` horizontal — se implementa inline, es un patrón de 2 ítems sin equivalente en otra sección) + panel "Análisis de Investigaciones" (placeholder, ya lo es en el mockup original).
- **`ContactoSection.vue`** (nueva): formulario nombre/correo/teléfono/empresa(opcional)/mensaje, mismo lenguaje visual (inputs con borde `line-strong`, focus en `sky-400`, botón `btn-primary`), estados loading/éxito/error.
- **`SiteFooter.vue`** (shared): datos de contacto + `SocialLinks` variant `footer`.
- **`SocialLinks.vue`**: recibe `variant: 'floating' | 'footer'`. En `floating` reproduce el botón WhatsApp fijo del mockup (bottom-right, tooltip en hover); en `footer` muestra los 3 íconos (WhatsApp/Facebook/Instagram) en línea. Todos son `<a>` con `href` directo, `target="_blank"`, `rel="noopener"` — sin SDK de mensajería.

## 5. `AccordionPanel.vue` (ui)

Contrato:
```ts
interface AccordionItem {
  id: string | number
  num: string        // "01", "02"...
  label: string       // texto del panel colapsado (vertical en desktop)
  iconMini: string    // SVG inline (mini, panel colapsado)
  iconBig: string     // SVG inline (grande, panel expandido)
  title: string
  tagline: string
}
props: { items: AccordionItem[], modelValue?: number }
emits: ['update:modelValue']
slot por defecto: #content="{ item, index }"  // cada sección inyecta su propio bloque (tags de Servicios vs. freq de Metodología)
```
Encapsula: estado de índice activo, clases `flex-[5.6]` vs `flex-1` con transición `cubic-bezier(.65,0,.35,1)` vía Tailwind arbitrary values, colapso a stack vertical con el variant arbitrario `max-[860px]:flex-col` (los breakpoints del mockup —560/720/860/900px— no calzan con la escala por defecto de Tailwind `sm/md/lg`; se usan variants arbitrarios puntuales en vez de inflar `theme.screens` con breakpoints de un solo uso que no aplican al resto del sitio), `writing-mode: vertical-rl` para el label colapsado (esto va en `<style scoped>` porque Tailwind no tiene utilidad nativa limpia para `writing-mode` + `transform: rotate(180deg)` combinados sin arbitrary-property abuse).

## 6. `AnimatedNetworkBackground.vue` + `useCanvasNetwork`

```ts
props: {
  nodeCountDesktop?: number   // default 56
  nodeCountMobile?: number    // default 30
  mobileBreakpoint?: number   // default 720
  maxDistance?: number        // default 140
  repelRadius?: number        // default 220
  radiusRange?: [number, number]  // default [1.8, 2.2]
}
```
- `useCanvasNetwork(canvasRef, options)`: encapsula `resize/initNodes/step`, expone `start()`/`stop()`.
- El componente usa `IntersectionObserver` sobre su propio `<canvas>`: `start()` al entrar en viewport, `stop()` (cancela `requestAnimationFrame`) al salir — ahorra CPU/batería en secciones fuera de pantalla.
- Respeta `prefers-reduced-motion: reduce`: no arranca el loop, pinta un frame estático a `opacity-50` (igual que ya hace el mockup del Hero) y no se suscribe a `pointermove`.
- Se resuelve vía `defineAsyncComponent` en cada sección — es el "componente pesado" que el requisito de performance pide dividir en su propio chunk, cargado una sola vez y reusado (no repetido) en las 5 secciones.
- `pointermove`/`pointerleave` con cleanup en `onUnmounted`; `resize` con `ResizeObserver` en vez de `window.resize` para evitar recalcular en secciones que no cambiaron de tamaño.

## 7. Formulario de contacto

- Schema Zod (`types/contact.ts`): `nombre` (string, min 2), `correo` (email), `telefono` (string, regex básico), `empresa` (opcional), `mensaje` (string, min 10).
- `useContactForm.ts`: wrapper de `useForm`/`useField` de VeeValidate con el schema Zod vía `@vee-validate/zod`, expone `status: 'idle' | 'loading' | 'success' | 'error'` y `submit()`.
- `contact.service.ts`: `postContact(payload)` → `apiClient.post(import.meta.env.VITE_CONTACT_API_ENDPOINT, payload)`. Si la env var no está definida, falla explícito en desarrollo (no falla en silencio) — se documenta en `.env.example`.
- UI: mensajes de error inline por campo (VeeValidate), botón deshabilitado + spinner durante `loading`, mensaje de éxito reemplaza el formulario, mensaje de error permite reintentar.

## 8. SEO

- `index.html`: `<title>`, `<meta name="description">`, Open Graph (`og:title`, `og:description`, `og:image`, `og:url` desde `VITE_SITE_URL`), Twitter card básica, `<link rel="canonical">`. Una sola ruta ⇒ no se justifica una librería de head management; se mantiene estático y 100% crawlable sin JS.
- `public/robots.txt` + `public/sitemap.xml` (una sola URL, lista para crecer).
- HTML semántico: `<header>`, `<nav>`, `<main>`, `<section>` con `id` (anclas del nav), `<footer>`, `<h1>` único en el Hero, jerarquía `h2`/`h3` correcta por sección.
- Imágenes: solo el logo tiene asset real hoy; se sirve `<picture>` WebP+PNG con `loading="eager"` (está en el header, above the fold) y dimensiones explícitas. El resto de "imágenes" del mockup son SVG inline o placeholders — no hay fotografías de stock que optimizar en esta fase.

## 9. Performance

- Code splitting: ruta única vía `import()`, `AnimatedNetworkBackground` vía `defineAsyncComponent`.
- `vite-plugin-compression` (gzip + brotli) en build.
- `manualChunks` en `vite.config.ts`: `vendor-vue` (vue, vue-router, pinia), `vendor-forms` (vee-validate, zod), `vendor-http` (axios).
- Canvas fuera del viewport inicial: pausado por `IntersectionObserver` (§6), no solo "cargado perezosamente" sino literalmente detenido cuando no es visible.
- Fuentes: `font-display: swap`, `preconnect` únicamente a los 2 dominios de Google Fonts usados.
- Objetivo Lighthouse mobile ≥ 90 — se valida manualmente en Chrome DevTools tras el build de producción (no se automatiza en esta fase, no se pidió CI).

## 10. Gaps resueltos con el usuario

1. Panel "Explora la red MSSV" (Metodología) → placeholder "Próximamente", no iframe roto.
2. WhatsApp/Facebook/Instagram → placeholders vía `VITE_WHATSAPP_NUMBER`, `VITE_FACEBOOK_URL`, `VITE_INSTAGRAM_URL`.
3. Dominio SEO → placeholder `VITE_SITE_URL=https://www.roma-ciencia-aplicada.com`.

## 11. `.env.example`

```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_CONTACT_API_ENDPOINT=/contact
VITE_SITE_URL=https://www.roma-ciencia-aplicada.com
VITE_WHATSAPP_NUMBER=573000000000
VITE_FACEBOOK_URL=https://facebook.com/romacienciaplicada
VITE_INSTAGRAM_URL=https://instagram.com/romacienciaplicada
```

## 12. Fuera de alcance (explícito)

Login, guards de ruta, llamadas autenticadas, dashboard, métricas, cualquier store de Pinia con estado real. `modules/dashboard/` y `layouts/DashboardLayout.vue` quedan como carpetas/archivo vacíos con un comentario mínimo de marcador de posición, sin lógica.

## 13. Verificación

No se pidió framework de testing (Vitest, etc.) — no se agrega para no introducir alcance no solicitado. Verificación de esta fase:
- `vue-tsc --noEmit` sin errores.
- `npm run build` exitoso, con `vite-plugin-compression` generando `.gz`/`.br`.
- QA manual en navegador (`npm run dev`): las 5 secciones + Contacto + Footer, responsive (mobile/desktop), hover states, acordeones, envío del formulario contra un mock/endpoint de prueba, `prefers-reduced-motion` activado en DevTools para confirmar que el canvas se congela.

## 14. Nota sobre control de versiones

Este directorio de proyecto no es un repositorio git (`git init` no se ha corrido), así que este spec no se puede commitear como pide el flujo estándar de brainstorming. Se deja como archivo en `docs/superpowers/specs/` sin commit.
