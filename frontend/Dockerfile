# Etapa 1: compila el bundle estático. Los VITE_* se hornean en el build
# (Vite los reemplaza en tiempo de compilación, no de ejecución) — por eso
# se pasan como build args, no como env vars del contenedor final.
FROM node:24-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE_URL
ARG VITE_CONTACT_API_ENDPOINT
ARG VITE_SITE_URL
ARG VITE_WHATSAPP_NUMBER
ARG VITE_FACEBOOK_URL
ARG VITE_INSTAGRAM_URL
ARG VITE_TIKTOK_URL
ARG VITE_X_URL
ARG VITE_CONTACT_EMAIL
ARG VITE_ERROR_REPORTING_ENDPOINT
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: sirve el build con nginx — reemplaza el nginx del sistema en el
# cutover (mismo try_files de SPA que ya usa /etc/nginx/sites-enabled/
# romascience.com hoy).
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
