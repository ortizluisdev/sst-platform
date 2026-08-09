import Fastify from 'fastify'
import { registerCors } from './plugins/cors.js'
import { registerRateLimit } from './plugins/rate-limit.js'
import { registerPrisma } from './plugins/prisma.js'
import { registerCookie } from './plugins/cookie.js'
import { registerJwt } from './plugins/jwt.js'
import { registerMultipart } from './plugins/multipart.js'
import { registerHelmet } from './plugins/helmet.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { contactRoutes } from './modules/contact/contact.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { variablesRoutes } from './modules/variables/variables.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { notificationPreferencesRoutes } from './modules/notificationPreferences/notificationPreferences.routes.js'
import { organizationsRoutes } from './modules/organizations/organizations.routes.js'
import { orgCatalogsRoutes } from './modules/orgCatalogs/orgCatalogs.routes.js'
import { orgCategoryConfigRoutes } from './modules/orgCategoryConfig/orgCategoryConfig.routes.js'
import { organizationBrandingRoutes } from './modules/organizationBranding/organizationBranding.routes.js'
import { activationRoutes } from './modules/activation/activation.routes.js'
import { servicesRoutes } from './modules/services/services.routes.js'
import { variableCatalogRoutes } from './modules/variableCatalog/variableCatalog.routes.js'
import { serviceHeatmapRoutes } from './modules/serviceHeatmap/serviceHeatmap.routes.js'
import { nonConformitiesRoutes } from './modules/nonConformities/nonConformities.routes.js'
import { reportsRoutes } from './modules/reports/reports.routes.js'
import { roadSafetyRoutes } from './modules/roadSafety/roadSafety.routes.js'
import { roadSafetyReportsRoutes } from './modules/roadSafety/roadSafetyReports.routes.js'
import { env } from './config/env.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    // Render (y la mayoría de PaaS) pone la app detrás de un proxy inverso —
    // sin esto, request.ip siempre sería la IP interna del proxy en vez de la
    // del visitante real, lo que rompe la trazabilidad anti-spam de ip_address
    // y el rate-limit por IP.
    trustProxy: true,
    // Default de Fastify es 1 MiB — insuficiente para el mapa de calor
    // (imagen hasta 3MB cruda, ver heatmapImageSchema, que en base64 pesa
    // ~4.1MB por el overhead propio de esa codificación) y quedaba
    // rechazado con 413 antes de llegar a nuestra propia validación de
    // tamaño. 6 MiB cubre eso con margen; el resto de payloads JSON de la
    // app (logo de 500KB, formularios normales) quedan muy por debajo, así
    // que subir el techo acá no relaja nada para ellos.
    bodyLimit: 6 * 1024 * 1024,
  })

  await registerErrorHandler(app)
  await registerHelmet(app)
  await registerPrisma(app)
  await registerCors(app)
  await registerRateLimit(app)
  await registerCookie(app)
  await registerJwt(app)
  await registerMultipart(app)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(contactRoutes)
  await app.register(authRoutes)
  await app.register(usersRoutes)
  await app.register(variablesRoutes)
  await app.register(notificationsRoutes)
  await app.register(notificationPreferencesRoutes)
  await app.register(organizationsRoutes)
  await app.register(orgCatalogsRoutes)
  await app.register(orgCategoryConfigRoutes)
  await app.register(organizationBrandingRoutes)
  await app.register(activationRoutes)
  await app.register(servicesRoutes)
  await app.register(variableCatalogRoutes)
  await app.register(serviceHeatmapRoutes)
  await app.register(nonConformitiesRoutes)
  await app.register(reportsRoutes)
  await app.register(roadSafetyRoutes)
  await app.register(roadSafetyReportsRoutes)

  return app
}
