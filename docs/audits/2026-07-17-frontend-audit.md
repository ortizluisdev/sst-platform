# Auditoría de frontend — RoMa (Fase 2)

**Fecha:** 2026-07-17
**Alcance:** `frontend/` completo — arquitectura, performance, accesibilidad, SEO, seguridad, DX.
**Método:** revisión directa de código + build de producción + cálculo de contraste WCAG + `npm audit`. No se corrió Lighthouse (requiere navegador headless con red real); las recomendaciones de performance están basadas en tamaños de bundle reales del build.

Todo lo listado abajo es una **oportunidad de mejora**, no un bloqueante — el sitio funciona correctamente hoy en ambos idiomas, con build y type-check limpios. Prioridades: 🔴 bug real (afecta usuarios) · 🟡 gap recomendado · 🟢 nice-to-have.

---

## 🔴 Bugs encontrados

### 1. Acordeón no accesible por teclado
`src/components/ui/AccordionPanel.vue:39-48` — cada ítem es un `<article @click="activate(index)">`, sin `tabindex`, `role="button"` ni manejador de teclado (`@keydown.enter`/`@keydown.space`). Un `<article>` no es focuseable por defecto, así que un usuario que navega con Tab **no puede abrir Servicios ni Metodología** (ambas secciones usan este componente compartido) — y un lector de pantalla no anuncia que el elemento es interactivo.

**Fix sugerido:** cambiar `<article>` por `<button type="button">` (o agregar `tabindex="0" role="button"` + `@keydown.enter/.space="activate(index)"` si se necesita mantener el layout de `<article>` por semántica de contenido).

### 2. Contraste insuficiente en `sky-400` sobre texto normal
Cálculo WCAG real:

| Uso | Contraste | Mínimo AA requerido | Resultado |
|---|---|---|---|
| `sky-400` (#5B8DC7) sobre `cream`/blanco, texto normal | 3.31–3.45 : 1 | 4.5 : 1 (texto normal) | ❌ Falla |
| `navy-700`/`navy-900` sobre `cream` | 10.85–16.61 : 1 | 4.5 : 1 | ✅ Pasa |

Afecta específicamente texto en tamaño normal (no headings grandes), donde sí se aplica el umbral de 4.5:1:
- `PropuestaValorSection.vue:45` — `.value-lead` (15.5px, "Comprender el riesgo antes de intervenirlo.")
- `AccordionPanel.vue:82` — `.acc-tagline` (14.5px, taglines de Servicios/Metodología)
- Los `em` de acento en los `<h1>`/`<h2>` (ej. "la ciencia") **sí pasan** porque son texto grande (≥24px), exento del umbral de 4.5:1.

**Fix sugerido:** oscurecer ligeramente el tono para esos usos específicos (ej. un `sky-500` intermedio calculado para ≥4.5:1), sin tocar el `sky-400` usado en headings grandes, iconos o fondos.

### 3. `@unhead/vue` termina en el chunk `vendor-vue`
`vite.config.ts` — el regex `/[\\/]vue[\\/]/` para agrupar Vue/Router/Pinia también matura por accidente el paquete `@unhead/vue` (su propio nombre de carpeta en `node_modules` es literalmente `vue`). No rompe nada, pero infla `vendor-vue` (~15-20KB) con código no relacionado y le quita sentido al chunk `vendor-head` que se creó para aislarlo.

**Fix sugerido:** mover el chequeo de `@unhead` antes del de `vue`, o usar un regex más específico (`/[\\/]@unhead[\\/]/` ya existe pero nunca se alcanza porque el de `vue` lo intercepta primero — solo hay que reordenar los `if`).

---

## 🟡 Gaps recomendados

### 4. Sin enlace "saltar al contenido"
No existe un skip-link al inicio del `<body>`. Un usuario de teclado/lector de pantalla debe pasar por todo el header (logo, 4-5 links, selector de idioma) antes de llegar al `<main>` en cada carga de página. Es un patrón estándar de una línea de código con gran impacto en accesibilidad real.

### 5. Sin ESLint/Prettier configurado
`package.json` no tiene `devDependencies` de lint ni script `lint`. Hoy el código está limpio (verificado: sin `console.log`, sin `any`, sin TODOs sueltos) porque el proyecto es reciente y de un solo autor — pero sin una regla automatizada, eso se degrada con el tiempo, especialmente cuando entre la fase de dashboard con más superficie de código.

### 6. Sin CI
No hay `.github/workflows/` ni ningún pipeline. El único gate hoy es que yo corra `vue-tsc` y `npm run build` manualmente antes de cada commit — nada impide que un commit roto llegue a `main` y dispare un deploy fallido en Vercel. Un workflow mínimo (type-check + build en cada push) cerraría ese hueco.

### 7. Sin tests automatizados
Sigue siendo una decisión consciente del spec original (YAGNI, nadie lo pidió). Pero el proyecto ya tiene lógica real que vale la pena proteger con al menos un puñado de tests: el guard de locale en el router, el schema de validación del formulario de contacto (`createContactSchema`), y el `useScrollSpy`/`useCanvasNetwork` (lógica pura, fácil de testear sin DOM real).

### 8. Backend de contacto sin implementar
Esperado y ya documentado (`VITE_CONTACT_API_ENDPOINT` falla explícito si no está seteado) — lo repito acá solo porque es el mecanismo principal de generación de leads del sitio: hoy nadie que llene el formulario recibe confirmación real de que el mensaje llegó a algún lado.

---

## 🟢 Nice-to-haves

### 9. Sin `manifest.json`
No es crítico para una landing, pero es lo estándar junto a un set de favicons ya completo como el que tenemos (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` — todos ya existen, solo falta el manifest que los referencie).

### 10. `og-image.png` sin comprimir a fondo
104KB. No afecta la carga del sitio (solo lo piden los scrapers de redes sociales), pero se podría bajar con `pngquant`/similar sin pérdida visible.

### 11. Sin monitoreo de errores en producción
Nada captura errores de runtime inesperados más allá de la consola del navegador del usuario (que nadie va a ver). Algo tipo Sentry (o incluso un endpoint propio simple) daría visibilidad real cuando algo falle para un visitante real.

### 12. Sin `mailto:` de respaldo
El único canal de contacto directo (fuera del formulario) es WhatsApp. Un `mailto:` en el footer, junto a los íconos sociales, le da opción a quien prefiera escribir un correo formal en vez de un mensaje de WhatsApp — común en contactos B2B/corporativos, que es exactamente el público de RoMa.

---

## Lo que ya está bien (contexto, no hace falta tocarlo)

- `npm audit`: 0 vulnerabilidades.
- Sin `console.log`, sin `: any`, sin `TODO/FIXME` sueltos en `src/`.
- `.env` correctamente ignorado por git (verificado con `git ls-files`).
- Viewport meta sin restricciones de zoom (no hay violación de accesibilidad ahí).
- El acordeón de "Investigación Científica" en Nosotros (`NosotrosSection.vue`) sí usa `<button>` real — el problema del punto 1 es específico de `AccordionPanel.vue`.
- Code splitting por idioma funciona correctamente: solo el locale activo se descarga al inicio (`es-*.js` / `en-*.js` ~18-20KB cada uno, separados).
