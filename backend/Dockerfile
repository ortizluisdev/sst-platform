# Etapa 1: instala TODAS las dependencias (incluye el CLI de prisma, que es
# devDependency) y genera el cliente de Prisma + compila TypeScript.
# openssl es obligatorio en Alpine — sin él, el motor de Prisma falla con
# "Could not parse schema engine response" al no detectar libssl (musl no
# lo trae por defecto, a diferencia de las imágenes basadas en Debian).
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 2: solo dependencias de producción (sin el CLI de prisma, que no
# hace falta en runtime — el cliente ya generado se copia de "builder").
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Etapa 3: imagen final — mínima, sin herramientas de build.
FROM node:24-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
