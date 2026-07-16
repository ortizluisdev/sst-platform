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
- **Vue Router**: una sola ruta (`/`) cargada con `import()`, lista para agregar rutas de dashboard sin reestructurar.
- **Pinia**: instalado y registrado en `main.ts`, sin stores todavía — se agregan cuando llegue la fase de autenticación.
- **VeeValidate + Zod** para el formulario de contacto (`src/composables/useContactForm.ts`, schema en `src/types/contact.ts`).
- **Axios** con instancia central (`src/services/api.ts`) y un interceptor de request que hoy no hace nada (no hay token todavía) pero ya está estructurado para inyectar `Authorization` cuando exista auth real.
- **vite-plugin-compression2** genera `.gz` y `.br` de cada asset en el build. Se usó la v2 del plugin (no `vite-plugin-compression`) porque la v1 tiene un bug conocido: al registrar dos instancias (una por algoritmo) comparten una caché interna de `mtime` que hace que la segunda pase no comprima ningún archivo.

## Convenciones de carpetas (para cuando se agregue el dashboard)

```
src/
├── components/
│   ├── ui/          # átomos reutilizables en todo el proyecto (botones, acordeones, inputs)
│   └── shared/       # chrome de layout compartido (header, footer, redes, fondo animado)
├── composables/       # lógica reutilizable con estado (Composition API)
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
